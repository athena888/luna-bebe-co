// Re-qualify existing prospects under the v3 scorer — ANALYSIS ONLY.
//
//   node scripts/qualify-backfill.mjs <prospects.json> [--sample=50] [--out=dir]
//
// Reads a JSON array of prospect rows (exported read-only from the database),
// scores every row with the new deterministic pipeline, and prints the tier
// distribution, the quality-gate verdict and a representative sample.
//
// This script NEVER writes to the database and never sends anything. Applying
// the results requires the v3 migration plus an explicit --apply pass, which is
// deliberately not implemented here: the gate should be inspected by a human
// before any prospect state changes.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { qualifyRecord } from '../lib/outreach/qualify-v3.ts'
import { SEGMENTS } from '../lib/outreach/icp.ts'

const args = process.argv.slice(2)
const file = args.find(a => !a.startsWith('--'))
if (!file) { console.error('usage: node scripts/qualify-backfill.mjs <prospects.json>'); process.exit(1) }
const sampleSize = Number((args.find(a => a.startsWith('--sample=')) ?? '--sample=50').split('=')[1])
const outDir = (args.find(a => a.startsWith('--out=')) ?? '--out=').split('=')[1]

const rows = JSON.parse(readFileSync(file, 'utf8'))
const pct = (n, d) => d ? `${((100 * n) / d).toFixed(1)}%` : '—'

// Optional enrichment produced by scripts/enrich-run.mjs. When present, the
// researched firmographics and sourced signals REPLACE what can be scraped out
// of the legacy one-sentence fit_reason — that is the whole point of the
// enrichment stage.
const enrichArg = args.find(a => a.startsWith('--enrichment='))
const firmoByDomain = new Map()
const signalsByDomain = new Map()
if (enrichArg) {
  const e = JSON.parse(readFileSync(enrichArg.split('=')[1], 'utf8'))
  for (const f of e.firmographics ?? []) firmoByDomain.set(f.domain.toLowerCase(), f)
  for (const s of e.signals ?? []) {
    const d = s.domain.toLowerCase()
    if (!signalsByDomain.has(d)) signalsByDomain.set(d, [])
    signalsByDomain.get(d).push(s)
  }
  console.log(`enrichment loaded: ${firmoByDomain.size} domains, ${(e.signals ?? []).length} signals`)
}
const ENRICHED_ONLY = args.includes('--enriched-only')

// Age of the research, used for the freshness component.
const ageDays = iso => iso ? Math.max(0, (Date.now() - Date.parse(iso)) / 86_400_000) : null

const results = []
for (const p of rows) {
  // Press outreach is a separate motion with its own rules — out of scope.
  if (p.channel === 'press') continue
  const domain = (p.domain ?? '').toLowerCase()
  const firmo = firmoByDomain.get(domain)
  if (ENRICHED_ONLY && !firmo) continue

  const out = qualifyRecord({
    company: p.company,
    domain,
    category: p.category,
    title: p.title,
    personName: p.person_name,
    email: p.email,
    emailGrade: p.email_grade,
    // Researched summary is richer than the legacy sentence; keep both so
    // nothing is lost and text-extracted signals still apply.
    fitReason: [firmo?.research_summary, p.fit_reason].filter(Boolean).join(' '),
    sourceUrl: firmo?.source_urls?.[0] ?? p.source_url,
    researchAgeDays: firmo ? 0 : ageDays(p.created_at),
    known: firmo ? { sizeBand: firmo.size_band, sizeConfidence: firmo.size_confidence } : null,
    extraSignals: signalsByDomain.get(domain) ?? [],
  })
  results.push({ row: p, firmo, ...out })
}

// ── Distribution ─────────────────────────────────────────────────────────────
const tally = (arr, fn) => {
  const m = {}
  for (const x of arr) { const k = fn(x) ?? '(none)'; m[k] = (m[k] || 0) + 1 }
  return Object.entries(m).sort((a, b) => b[1] - a[1])
}

const total = results.length
console.log(`\n${'='.repeat(74)}`)
console.log(`V3 QUALIFICATION BACKFILL — ${total} corporate prospects re-scored`)
console.log('='.repeat(74))

console.log('\n── QUALIFICATION STATUS (§49) ──')
for (const [k, v] of tally(results, r => r.result.status)) {
  console.log(`  ${String(v).padStart(4)}  ${pct(v, total).padStart(6)}  ${k}`)
}

console.log('\n── TIER ──')
for (const [k, v] of tally(results, r => r.result.tier)) {
  console.log(`  ${String(v).padStart(4)}  ${pct(v, total).padStart(6)}  ${k}`)
}

console.log('\n── SEGMENT ──')
for (const [k, v] of tally(results, r => r.segment)) {
  console.log(`  ${String(v).padStart(4)}  ${pct(v, total).padStart(6)}  ${SEGMENTS[k]?.label ?? k}`)
}

console.log('\n── TOP DISQUALIFIERS ──')
const dq = {}
for (const r of results) for (const d of r.result.disqualifiers) {
  const key = d.replace(/"[^"]*"/g, '"…"').replace(/\([^)]*\)/g, '(…)').replace(/ \d[\d,-]*/g, ' N')
  dq[key] = (dq[key] || 0) + 1
}
for (const [k, v] of Object.entries(dq).sort((a, b) => b[1] - a[1]).slice(0, 12)) {
  console.log(`  ${String(v).padStart(4)}  ${k}`)
}

// ── Quality gate (§38) — measured on the QUALIFIED queue only ────────────────
const qualified = results.filter(r => r.result.status === 'QUALIFIED')
const q = qualified.length
const excellent = qualified.filter(r => r.result.tier === 'EXCELLENT').length
const good = qualified.filter(r => r.result.tier === 'GOOD').length
const weak = qualified.filter(r => r.result.tier === 'WEAK').length
const bad = qualified.filter(r => r.result.tier === 'BAD').length
const direct = qualified.filter(r => !r.result.emailIsGeneric).length
const generic = q - direct
const knownSize = qualified.filter(r => r.sizeBand != null).length
const highRecur = qualified.filter(r => r.result.recurring === 'HIGH').length
const hedged = qualified.filter(r => r.result.titleInterpretation != null || r.result.contactConfidence !== 'HIGH').length

const p = n => (q ? (100 * n) / q : 0)
const gate = [
  ['EXCELLENT + GOOD  >= 80%', p(excellent + good) >= 80, `${p(excellent + good).toFixed(1)}%`],
  ['DIRECT NAMED INBOX >= 90%', p(direct) >= 90, `${p(direct).toFixed(1)}%`],
  ['WEAK + BAD        <= 20%', p(weak + bad) <= 20, `${p(weak + bad).toFixed(1)}%`],
  ['HEDGED CONTACT     =  0%', hedged === 0, `${p(hedged).toFixed(1)}%`],
  ['GENERIC INBOX     <=  5%', p(generic) <= 5, `${p(generic).toFixed(1)}%`],
  ['KNOWN SIZE        >= 90%', p(knownSize) >= 90, `${p(knownSize).toFixed(1)}%`],
]

console.log(`\n${'='.repeat(74)}`)
console.log(`QUALITY GATE — measured on the ${q} prospects that reach the outbound queue`)
console.log('='.repeat(74))
console.log(`  candidates in:        ${total}`)
console.log(`  qualified:            ${q}   (${pct(q, total)})`)
console.log(`  needs contact research:${String(results.filter(r => r.result.status === 'NEEDS_CONTACT_RESEARCH').length).padStart(4)}`)
console.log(`  rejected:             ${results.filter(r => r.result.status === 'REJECTED').length}`)
console.log(`  low priority:         ${results.filter(r => r.result.status === 'LOW_PRIORITY').length}`)
console.log(`  partnership:          ${results.filter(r => r.result.status === 'PARTNERSHIP').length}`)
console.log(`  manual review:        ${results.filter(r => r.result.status === 'MANUAL_REVIEW').length}`)
console.log('')
for (const [label, ok, value] of gate) {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(28)} actual ${value}`)
}
const passed = gate.every(g => g[1])
console.log(`\n  RESULT: ${passed ? 'PASS' : 'FAIL'}`)
console.log(`  HIGH recurring potential: ${p(highRecur).toFixed(1)}%`)

// ── Representative sample ────────────────────────────────────────────────────
// Even stride across the qualified queue ordered by score — not cherry-picked.
const sorted = qualified.slice().sort((a, b) => b.result.score - a.result.score)
const step = sorted.length / Math.min(sampleSize, sorted.length || 1)
const sample = []
for (let i = 0; i < Math.min(sampleSize, sorted.length); i++) sample.push(sorted[Math.floor(i * step)])

console.log(`\n${'='.repeat(74)}`)
console.log(`REPRESENTATIVE SAMPLE — ${sample.length} of ${q} qualified (even stride by score)`)
console.log('='.repeat(74))
console.log('N|COMPANY|SEGMENT|SIZE|ROLE|INBOX|SCORE|TIER|RECUR|SIGNALS')
sample.forEach((r, i) => {
  console.log([
    i + 1,
    r.row.company,
    r.segment,
    r.sizeBand ?? '?',
    r.result.titleClean.slice(0, 32),
    r.result.emailIsGeneric ? 'GENERIC' : 'direct',
    r.result.score,
    r.result.tier,
    r.result.recurring,
    r.signals.map(s => s.signal_type).join('+') || 'none',
  ].join('|'))
})

if (outDir) {
  mkdirSync(outDir, { recursive: true })
  writeFileSync(path.join(outDir, 'backfill.json'), JSON.stringify(
    results.map(r => ({
      company: r.row.company, domain: r.row.domain, segment: r.segment,
      status: r.result.status, tier: r.result.tier, score: r.result.score,
      recurring: r.result.recurring, generic: r.result.emailIsGeneric,
      sizeBand: r.sizeBand, signals: r.signals.map(s => s.signal_type),
      reasons: r.result.reasons, disqualifiers: r.result.disqualifiers,
    })), null, 1), 'utf8')
  writeFileSync(path.join(outDir, 'sample-explanations.txt'),
    sample.slice(0, 10).map(r => r.explanation).join(`\n\n${'─'.repeat(70)}\n\n`), 'utf8')
  console.log(`\nwrote ${outDir}/backfill.json and sample-explanations.txt`)
}
