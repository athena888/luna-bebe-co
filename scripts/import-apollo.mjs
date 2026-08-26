// Import an Apollo B2B buyer export into `prospects`.
//
//   node scripts/import-apollo.mjs <file.csv>            # dry run, writes nothing
//   node scripts/import-apollo.mjs <file.csv> --apply    # insert
//
// Rules, applied before anything is written:
//   * one contact per DOMAIN — the highest-priority row wins, the rest are
//     recorded as backups and never queued
//   * never touch an existing prospect (matched on email OR domain)
//   * never import a suppressed address or domain
//   * everything lands as status='queued', which still requires a drafted and
//     human-approved email before it can ever be sent
//
// This script cannot send email and does not enroll anyone in a sequence.
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8')
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
}

const FILE = process.argv[2]
const APPLY = process.argv.includes('--apply')
if (!FILE) { console.error('usage: node scripts/import-apollo.mjs <file.csv> [--apply]'); process.exit(1) }

/** RFC4180-ish parser: handles quoted fields containing commas and doubled quotes. */
function parseCsv(text) {
  const rows = []
  let row = [], field = '', inQuotes = false
  const src = text.replace(/^﻿/, '')
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++ } else inQuotes = false
      } else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (c !== '\r') field += c
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  return rows.filter(r => r.some(v => v.trim()))
}

const raw = parseCsv(readFileSync(FILE, 'utf8'))
const header = raw[0].map(h => h.trim())
const idx = Object.fromEntries(header.map((h, i) => [h, i]))
const records = raw.slice(1).map(r => {
  const g = k => (r[idx[k]] ?? '').trim()
  return {
    priority: Number(g('priority')) || 9999,
    tier: g('priority_tier'),
    company: g('company_name'),
    person: [g('first_name'), g('last_name')].filter(Boolean).join(' '),
    title: g('title'),
    email: g('email').toLowerCase(),
    emailStatus: g('email_status'),
    domain: g('domain').toLowerCase().replace(/^www\./, ''),
    employees: Number(g('employee_count')) || null,
    industry: g('industry'),
    fitNote: g('fit_note'),
    source: g('source'),
  }
})

console.log(`parsed ${records.length} rows from ${FILE}`)

const { createClient } = await import('@supabase/supabase-js')
const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// ── Existing state ──────────────────────────────────────────────────────────
const [{ data: existing }, { data: supp }] = await Promise.all([
  supa.from('prospects').select('email, domain, company'),
  supa.from('suppression').select('email, domain'),
])
const haveEmail = new Set((existing ?? []).map(p => (p.email ?? '').toLowerCase()).filter(Boolean))
const haveDomain = new Set((existing ?? []).map(p => (p.domain ?? '').toLowerCase()).filter(Boolean))
const suppEmail = new Set((supp ?? []).map(s => (s.email ?? '').toLowerCase()).filter(Boolean))
const suppDomain = new Set((supp ?? []).map(s => (s.domain ?? '').toLowerCase()).filter(Boolean))

// ── Decide ──────────────────────────────────────────────────────────────────
const byDomain = new Map()
const skipped = { noEmail: 0, unverified: 0, suppressed: 0, alreadyHave: 0, domainTaken: 0, backup: 0 }
const backups = []

for (const r of [...records].sort((a, b) => a.priority - b.priority)) {
  if (!r.email || !r.email.includes('@')) { skipped.noEmail++; continue }
  if (r.emailStatus !== 'verified') { skipped.unverified++; continue }
  if (suppEmail.has(r.email) || suppDomain.has(r.domain)) { skipped.suppressed++; continue }
  if (haveEmail.has(r.email)) { skipped.alreadyHave++; continue }
  const key = r.domain || r.company.toLowerCase()
  if (haveDomain.has(key)) { skipped.domainTaken++; continue }
  if (byDomain.has(key)) { skipped.backup++; backups.push(r); continue }
  byDomain.set(key, r)
}

const toInsert = [...byDomain.values()]
console.log('\n=== PLAN ===')
console.log('will import          :', toInsert.length)
console.log('skipped - no email   :', skipped.noEmail)
console.log('skipped - unverified :', skipped.unverified)
console.log('skipped - suppressed :', skipped.suppressed)
console.log('skipped - already in :', skipped.alreadyHave)
console.log('skipped - domain taken :', skipped.domainTaken)
console.log('skipped - backup at same company:', skipped.backup)

const tiers = {}
for (const r of toInsert) tiers[r.tier] = (tiers[r.tier] ?? 0) + 1
console.log('by priority tier     :', JSON.stringify(tiers))

console.log('\nfirst 8:')
for (const r of toInsert.slice(0, 8)) {
  console.log(' ', String(r.priority).padStart(4), r.tier.padEnd(3), r.company.slice(0, 28).padEnd(29), r.person.slice(0, 20).padEnd(21), r.email)
}

if (!APPLY) {
  console.log('\nDRY RUN - nothing written. Re-run with --apply to insert.')
  process.exit(0)
}

// ── Insert ──────────────────────────────────────────────────────────────────
// status 'queued' means "eligible to be drafted". A draft still has to be
// written and approved by a human before the sender will look at it.
const rows = toInsert.map(r => ({
  company: r.company,
  domain: r.domain || null,
  person_name: r.person || null,
  title: r.title || null,
  email: r.email,
  // Apollo reports these as verified; our own verifier cascade re-checks a
  // grade at send time and the sender refuses anything below B.
  email_grade: 'A',
  employee_count: r.employees,
  // Constrained to website|linkedin|manual|inferred. Apollo is a purchased
  // dataset, so 'manual'; source_url carries the actual provenance.
  employee_count_source: 'manual',
  industry_key: 'employee_gifting',
  segment: 'EMPLOYEE_GIFTING',
  channel: 'corporate',
  status: 'queued',
  fit_reason: r.fitNote || null,
  source_url: r.source || null,
  qualification_status: 'QUALIFIED',
  qualification_tier: r.tier === 'A' ? 'EXCELLENT' : 'GOOD',
  qualification_score: r.tier === 'A' ? 88 : r.tier === 'A-' ? 80 : 72,
  contact_confidence: 'HIGH',
  recurring_potential: 'HIGH',
  research_version: 3,
  qualified_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
}))

let inserted = 0, failed = 0
for (let i = 0; i < rows.length; i += 50) {
  const chunk = rows.slice(i, i + 50)
  const { error, data } = await supa.from('prospects').insert(chunk).select('id')
  if (error) { console.error('chunk failed:', error.message); failed += chunk.length }
  else inserted += (data ?? []).length
}
console.log(`\ninserted ${inserted}, failed ${failed}`)
console.log(`${backups.length} backup contacts were NOT imported (one contact per company).`)
