// Find named contacts for companies stuck in NEEDS_CONTACT_RESEARCH.
//
//   node scripts/discover-contacts.mjs [--limit=10] [--apply]
//
// Default is a DRY report: it researches and prints what it found, writing
// nothing. --apply persists resolved contacts onto their prospects.
//
// Never sends email. Never overwrites a prospect that has already been
// contacted. A company with no verifiable named contact simply stays in
// NEEDS_CONTACT_RESEARCH for a later attempt.

import {
  loadDiscoveryTargets, discoverContacts, resolveEmail, saveContact,
  MAX_DISCOVERY_BATCH,
} from '../lib/outreach/contact-discovery.ts'

const args = process.argv.slice(2)
const limit = Number((args.find(a => a.startsWith('--limit=')) ?? '--limit=10').split('=')[1])
const APPLY = args.includes('--apply')

const targets = await loadDiscoveryTargets(limit)
console.log(`companies needing a contact: ${targets.length}${APPLY ? '  (APPLY)' : '  (dry report)'}\n`)
if (!targets.length) process.exit(0)

const byDomain = new Map(targets.map(t => [t.domain, t]))
let calls = 0, inTok = 0, outTok = 0
const rows = []

for (let i = 0; i < targets.length; i += MAX_DISCOVERY_BATCH) {
  const batch = targets.slice(i, i + MAX_DISCOVERY_BATCH)
  let contacts = []
  try {
    const r = await discoverContacts(batch, { dry: !APPLY })
    contacts = r.contacts
    calls++; inTok += r.usage.input; outTok += r.usage.output
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`batch ${i} failed: ${msg}`)
    if (/credit balance is too low|invalid_request_error|authentication/i.test(msg)) {
      console.error('ABORTING — this will not resolve by retrying.')
      break
    }
    continue
  }

  for (const c of contacts) {
    const t = byDomain.get(c.domain)
    if (!t) continue
    const resolved = await resolveEmail(c)
    let outcome = 'dry'
    if (APPLY) outcome = await saveContact(t.prospectId, resolved)
    rows.push({ company: t.company, segment: t.segment, ...resolved, outcome })
    const mask = resolved.email ? resolved.email.replace(/^(.).*(@.*)$/, '$1***$2') : '—'
    console.log(
      `  ${String(t.company).padEnd(24)} ${String(resolved.person_name ?? 'NOT FOUND').padEnd(22)} ` +
      `${String(resolved.title ?? '—').slice(0, 30).padEnd(31)} ${String(resolved.email_grade ?? '-').padEnd(2)} ${mask}  ${outcome}`,
    )
  }
}

const found = rows.filter(r => r.person_name).length
const sendable = rows.filter(r => r.email_grade === 'A' || r.email_grade === 'B').length
console.log(`\nattempted ${targets.length} | named person found ${found} | sendable address ${sendable}`)
console.log(`api calls ${calls} | tokens in ${inTok.toLocaleString()} out ${outTok.toLocaleString()}`)
if (!APPLY) console.log('\nDRY REPORT — nothing written. Re-run with --apply to persist.')
