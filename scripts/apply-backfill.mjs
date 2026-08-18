// Persist enrichment + v3 qualification into the database.
//
//   node scripts/apply-backfill.mjs <prospects.json> --enrichment=<file> [--apply]
//
// Default is a DRY report. --apply performs writes.
//
// WHAT IT WRITES
//   prospect_firmographics   upsert by domain      (researched company facts)
//   prospect_signals         upsert by domain+type+source (buying evidence)
//   prospects                UPDATE of the v3 qualification columns ONLY
//
// WHAT IT NEVER TOUCHES
//   prospects.status         the v1 lifecycle field — a sent/replied/bounced
//                            prospect keeps its history untouched
//   prospects.email / person_name / company / fit_reason   original research
//   suppression, sends, email_drafts, contacts, orders     never written
//
// Nothing here can cause an email to be sent: drafting additionally requires
// pipeline_enabled AND quality_v3.drafting_enabled, and sending requires
// quality_v3.live_sends_enabled, which is false.

import { readFileSync } from 'node:fs'
import { qualifyRecord } from '../lib/outreach/qualify-v3.ts'

const args = process.argv.slice(2)
const file = args.find(a => !a.startsWith('--'))
const enrichFile = (args.find(a => a.startsWith('--enrichment=')) ?? '').split('=')[1]
const APPLY = args.includes('--apply')

const SUP = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUP || !KEY) { console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

const rows = JSON.parse(readFileSync(file, 'utf8')).filter(p => p.channel !== 'press')
const enrich = enrichFile ? JSON.parse(readFileSync(enrichFile, 'utf8')) : { firmographics: [], signals: [] }
const firmo = new Map(enrich.firmographics.map(f => [f.domain.toLowerCase(), f]))
const sigs = new Map()
for (const s of enrich.signals) {
  const d = s.domain.toLowerCase()
  if (!sigs.has(d)) sigs.set(d, [])
  sigs.get(d).push(s)
}

// ── Qualify everything in memory first ───────────────────────────────────────
const updates = []
const tally = {}
for (const p of rows) {
  const domain = (p.domain ?? '').toLowerCase()
  const f = firmo.get(domain)
  const out = qualifyRecord({
    company: p.company, domain, category: p.category, title: p.title,
    personName: p.person_name, email: p.email, emailGrade: p.email_grade,
    fitReason: [f?.research_summary, p.fit_reason].filter(Boolean).join(' '),
    sourceUrl: f?.source_urls?.[0] ?? p.source_url,
    researchAgeDays: f ? 0 : null,
    known: f ? { sizeBand: f.size_band, sizeConfidence: f.size_confidence } : null,
    extraSignals: sigs.get(domain) ?? [],
  })
  tally[out.result.status] = (tally[out.result.status] ?? 0) + 1
  updates.push({
    id: p.id,
    segment: out.segment,
    qualification_score: out.result.score,
    qualification_tier: out.result.tier,
    qualification_status: out.result.status,
    company_fit_score: out.result.companyFit,
    contact_fit_score: out.result.contactFit,
    intent_score: out.result.intent,
    data_quality_score: out.result.dataQuality,
    recurring_potential: out.result.recurring,
    contact_confidence: out.result.contactConfidence,
    company_size_band: out.sizeBand,
    company_size_confidence: out.sizeConfidence,
    email_is_generic: out.result.emailIsGeneric,
    title_raw: p.title ?? null,
    title_interpretation: out.result.titleInterpretation,
    role_family: out.result.roleFamily,
    qualification_summary: out.explanation.slice(0, 4000),
    qualification_reasons: out.result.reasons,
    disqualification_reasons: out.result.disqualifiers,
    qualified_at: new Date().toISOString(),
    research_version: 3,
  })
}

console.log(`prospects qualified in memory: ${updates.length}`)
for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(v).padStart(4)}  ${k}`)
}
console.log(`firmographics to write: ${enrich.firmographics.length}`)
console.log(`signals to write:       ${enrich.signals.length}`)

if (!APPLY) {
  console.log('\nDRY RUN — nothing written. Re-run with --apply to persist.')
  process.exit(0)
}

// ── Write ────────────────────────────────────────────────────────────────────
const post = async (path, body, prefer) => {
  const res = await fetch(`${SUP}/rest/v1/${path}`, {
    method: 'POST', headers: { ...H, Prefer: prefer }, body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${path}: ${res.status} ${(await res.text()).slice(0, 300)}`)
}

const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n))

let wrote = 0
for (const c of chunk(enrich.firmographics.map(f => ({ ...f, researched_at: new Date().toISOString(), research_version: 3 })), 100)) {
  await post('prospect_firmographics', c, 'resolution=merge-duplicates')
  wrote += c.length
}
console.log(`firmographics written: ${wrote}`)

// Dedupe on the unique key BEFORE writing. Postgres rejects an upsert whose
// payload touches the same conflict target twice ("cannot affect row a second
// time"), and research batches legitimately re-observe a signal from the same
// source. Last observation wins.
const signalKey = s => `${s.domain.toLowerCase()}|${s.signal_type}|${s.source_url ?? ''}`
const dedupedSignals = [...new Map(enrich.signals.map(s => [signalKey(s), s])).values()]
if (dedupedSignals.length !== enrich.signals.length) {
  console.log(`signals deduped: ${enrich.signals.length} -> ${dedupedSignals.length}`)
}

// The unique index on prospect_signals is an EXPRESSION index
// (domain, signal_type, coalesce(source_url,'')), which PostgREST cannot use as
// an on_conflict target — `merge-duplicates` resolves against the primary key
// and then trips the constraint. Since a re-run replaces the full research for
// a domain, delete-then-insert per domain is the correct idempotent form.
const domainsWithSignals = [...new Set(dedupedSignals.map(s => s.domain.toLowerCase()))]
for (const c of chunk(domainsWithSignals, 50)) {
  const list = c.map(d => `"${d}"`).join(',')
  const res = await fetch(`${SUP}/rest/v1/prospect_signals?domain=in.(${encodeURIComponent(list)})`, {
    method: 'DELETE', headers: H,
  })
  if (!res.ok) throw new Error(`signal cleanup: ${res.status} ${(await res.text()).slice(0, 200)}`)
}

wrote = 0
for (const c of chunk(dedupedSignals.map(s => ({ ...s, observed_at: new Date().toISOString() })), 200)) {
  await post('prospect_signals', c, 'return=minimal')
  wrote += c.length
}
console.log(`signals written: ${wrote} (across ${domainsWithSignals.length} domains)`)

// prospects: PATCH one at a time so a single bad row cannot poison a batch, and
// so we only ever touch the v3 columns.
let ok = 0, fail = 0
for (const u of updates) {
  const { id, ...fields } = u
  const res = await fetch(`${SUP}/rest/v1/prospects?id=eq.${id}`, {
    method: 'PATCH', headers: H, body: JSON.stringify(fields),
  })
  if (res.ok) ok++
  else { fail++; if (fail <= 3) console.error(`  ${id}: ${res.status} ${(await res.text()).slice(0, 200)}`) }
}
console.log(`prospects updated: ${ok} ok, ${fail} failed`)
console.log('\nprospects.status was NOT modified — v1 lifecycle history is intact.')
