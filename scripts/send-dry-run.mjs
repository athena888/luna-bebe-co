// Dry run: show exactly what the cold sender WOULD do, and send nothing.
//
//   node scripts/send-dry-run.mjs [limit]
//
// Runs the real targeting, deduplication, suppression, company-state and
// mailbox/cap logic against live data, then prints one row per prospect:
//   prospect -> company -> mailbox -> SEND/BLOCKED -> reason
//
// It never imports the Gmail transport. There is no code path from this file
// to a send.
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8')
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
}

const LIMIT = Number(process.argv[2]) || 10

const { loadMailboxes, loadLimits, dryRunEnabled } = await import('../lib/outreach/mailboxes.ts')
const { buildGuardState, getMailboxUsage, planSends } = await import('../lib/outreach/mailbox-usage.ts')
const { createClient } = await import('@supabase/supabase-js')

const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const mailboxes = loadMailboxes()
const limits = loadLimits()
const usage = await getMailboxUsage()
const guards = await buildGuardState()

console.log('=== CONFIG ===')
console.log('EMAIL_DRY_RUN            :', dryRunEnabled() ? 'true' : 'false (this script is dry regardless)')
console.log('mailboxes configured     :', mailboxes.length ? mailboxes.map(m => `${m.slot}:${m.email}`).join('  ') : 'NONE')
console.log('per-mailbox / total cap  :', `${limits.perMailbox} / ${limits.total}`)
console.log('pacing                   :', `${limits.minDelayMs / 1000}-${limits.maxDelayMs / 1000}s between sends`)
console.log('usage today (PT)         :', Object.keys(usage).length ? JSON.stringify(usage) : '{} (nothing sent yet)')
console.log('BUSINESS_ADDRESS set     :', guards.postalAddress ? 'yes' : 'NO - every send would be blocked')
console.log('suppressed addresses     :', guards.suppressedEmails.size)
console.log('companies already touched:', guards.companiesContacted.size)

// Prospects a drain would consider, newest research first.
const { data } = await supa.from('prospects')
  .select('id, person_name, company, domain, email, email_grade, status')
  .not('email', 'is', null)
  .order('qualified_at', { ascending: false, nullsFirst: false })
  .limit(LIMIT)

const candidates = (data ?? []).map(p => ({
  prospectId: p.id,
  person: p.person_name,
  company: p.company,
  domain: p.domain,
  email: p.email,
  emailGrade: p.email_grade,
  status: p.status,
}))

const plan = planSends(candidates, guards, mailboxes, limits, usage)

console.log(`\n=== DRY RUN - ${plan.length} prospect(s), NOTHING SENT ===`)
const pad = (s, n) => String(s ?? '').slice(0, n).padEnd(n)
console.log(pad('PERSON', 20), pad('COMPANY', 24), pad('MAILBOX', 26), pad('DECISION', 9), 'REASON')
console.log('-'.repeat(120))
for (const r of plan) {
  console.log(pad(r.person, 20), pad(r.company, 24), pad(r.mailbox ?? '-', 26), pad(r.decision, 9), r.reason)
}

const sends = plan.filter(r => r.decision === 'SEND').length
console.log('-'.repeat(120))
console.log(`WOULD SEND: ${sends}   BLOCKED: ${plan.length - sends}`)
const byBox = {}
for (const r of plan) if (r.mailbox) byBox[r.mailbox] = (byBox[r.mailbox] ?? 0) + 1
if (Object.keys(byBox).length) console.log('distribution:', JSON.stringify(byBox))
console.log('\nNo email was sent. This script cannot send.')
