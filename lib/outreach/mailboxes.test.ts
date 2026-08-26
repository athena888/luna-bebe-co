// node --test lib/outreach/mailboxes.test.ts   (npm test)
// The caps and the guards are the only things standing between a bug and an
// unsendable-back email, so every blocking rule gets an explicit test.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  loadMailboxes, loadLimits, dryRunEnabled, selectMailbox, remainingToday,
  pacingDelayMs, ptDayKey, ptDayStartUtc, type Mailbox, type SendLimits,
} from './mailboxes.ts'
import {
  evaluateCandidate, companyKey, addressDomain,
  type Candidate, type GuardState,
} from './send-guards.ts'

const A: Mailbox = { slot: 1, email: 'a@petitelavande.com' }
const B: Mailbox = { slot: 2, email: 'b@petitelavande.com' }
const BOXES = [A, B]
const LIMITS: SendLimits = { perMailbox: 50, total: 100, minDelayMs: 360_000, maxDelayMs: 600_000 }

// ── Configuration ───────────────────────────────────────────────────────────

test('mailboxes load from env in slot order, legacy sender still works', () => {
  assert.deepEqual(
    loadMailboxes({ EMAIL_ACCOUNT_1_EMAIL: 'A@X.com', EMAIL_ACCOUNT_2_EMAIL: 'b@x.com' } as never),
    [{ slot: 1, email: 'a@x.com' }, { slot: 2, email: 'b@x.com' }])
  // A single-mailbox deployment that only set GMAIL_SENDER keeps sending.
  assert.deepEqual(loadMailboxes({ GMAIL_SENDER: 'hello@x.com' } as never),
    [{ slot: 1, email: 'hello@x.com' }])
  assert.deepEqual(loadMailboxes({} as never), [])
})

test('the same address twice is one mailbox, not double capacity', () => {
  const boxes = loadMailboxes({
    EMAIL_ACCOUNT_1_EMAIL: 'a@x.com', EMAIL_ACCOUNT_2_EMAIL: 'A@x.com',
  } as never)
  assert.equal(boxes.length, 1, 'a duplicated address must not raise the daily ceiling')
})

test('limits default to 50 / 100 / 6-10 minutes', () => {
  const l = loadLimits({} as never)
  assert.equal(l.perMailbox, 50)
  assert.equal(l.total, 100)
  assert.equal(l.minDelayMs, 360_000)
  assert.equal(l.maxDelayMs, 600_000)
})

test('nonsense limit values fall back instead of disabling the cap', () => {
  for (const bad of ['0', '-5', 'abc', '']) {
    assert.equal(loadLimits({ EMAIL_DAILY_LIMIT_PER_MAILBOX: bad } as never).perMailbox, 50)
  }
})

test('dry run is off unless explicitly true', () => {
  assert.equal(dryRunEnabled({ EMAIL_DRY_RUN: 'true' } as never), true)
  assert.equal(dryRunEnabled({ EMAIL_DRY_RUN: 'TRUE' } as never), true)
  for (const v of ['false', '1', 'yes', '', undefined]) {
    assert.equal(dryRunEnabled({ EMAIL_DRY_RUN: v } as never), false)
  }
})

// ── Caps ────────────────────────────────────────────────────────────────────

test('mailbox A stops at 50', () => {
  const s = selectMailbox(BOXES, { [A.email]: 50, [B.email]: 0 }, LIMITS)
  assert.equal(s.mailbox?.email, B.email, 'A is full — B must take the send')
  const onlyA = selectMailbox([A], { [A.email]: 50 }, LIMITS)
  assert.equal(onlyA.mailbox, null)
  assert.equal(onlyA.reason, 'all-mailboxes-at-cap')
})

test('mailbox B stops at 50', () => {
  const s = selectMailbox(BOXES, { [A.email]: 0, [B.email]: 50 }, LIMITS)
  assert.equal(s.mailbox?.email, A.email)
})

test('the job stops cleanly when both mailboxes are full', () => {
  const s = selectMailbox(BOXES, { [A.email]: 50, [B.email]: 50 }, LIMITS)
  assert.equal(s.mailbox, null)
  assert.equal(s.reason, 'total-cap-reached')
  assert.equal(remainingToday(BOXES, { [A.email]: 50, [B.email]: 50 }, LIMITS), 0)
})

test('the global 100 cap binds even when a mailbox has headroom', () => {
  // Three mailboxes could absorb 150, but the day is capped at 100.
  const C: Mailbox = { slot: 3, email: 'c@petitelavande.com' }
  const usage = { [A.email]: 50, [B.email]: 50, [C.email]: 0 }
  assert.equal(selectMailbox([A, B, C], usage, LIMITS).reason, 'total-cap-reached')
  assert.equal(remainingToday([A, B, C], usage, LIMITS), 0)
})

test('a cap is never exceeded by one, whatever the usage', () => {
  for (let a = 0; a <= 51; a++) {
    const s = selectMailbox([A], { [A.email]: a }, LIMITS)
    if (a >= 50) assert.equal(s.mailbox, null, `must refuse at ${a}`)
    else assert.equal(s.mailbox?.email, A.email)
  }
})

test('remaining is the smaller of the global and per-mailbox headroom', () => {
  assert.equal(remainingToday(BOXES, {}, LIMITS), 100)
  assert.equal(remainingToday(BOXES, { [A.email]: 50 }, LIMITS), 50)
  assert.equal(remainingToday([A], {}, LIMITS), 50, 'one mailbox can only do 50 of the 100')
})

test('no configured mailbox means no send, not a default sender', () => {
  const s = selectMailbox([], {}, LIMITS)
  assert.equal(s.mailbox, null)
  assert.equal(s.reason, 'no-mailboxes-configured')
})

// ── Rotation ────────────────────────────────────────────────────────────────

test('rotation alternates A B A B across a run', () => {
  const usage: Record<string, number> = {}
  const picked: string[] = []
  for (let i = 0; i < 6; i++) {
    const m = selectMailbox(BOXES, usage, LIMITS).mailbox!
    picked.push(m.email)
    usage[m.email] = (usage[m.email] ?? 0) + 1
  }
  assert.deepEqual(picked, [A.email, B.email, A.email, B.email, A.email, B.email])
})

test('rotation self-corrects when one mailbox starts the day behind', () => {
  // A already sent 3 today; the next sends should go to B until they level.
  const usage: Record<string, number> = { [A.email]: 3, [B.email]: 0 }
  const picked: string[] = []
  for (let i = 0; i < 4; i++) {
    const m = selectMailbox(BOXES, usage, LIMITS).mailbox!
    picked.push(m.email)
    usage[m.email] = (usage[m.email] ?? 0) + 1
  }
  assert.deepEqual(picked, [B.email, B.email, B.email, A.email])
})

test('rotation drains the whole day without breaching either cap', () => {
  const usage: Record<string, number> = {}
  let sent = 0
  while (true) {
    const m = selectMailbox(BOXES, usage, LIMITS).mailbox
    if (!m) break
    usage[m.email] = (usage[m.email] ?? 0) + 1
    sent++
    assert.ok(sent <= 100, 'the loop must terminate at the global cap')
  }
  assert.equal(sent, 100)
  assert.equal(usage[A.email], 50)
  assert.equal(usage[B.email], 50)
})

// ── Pacing ──────────────────────────────────────────────────────────────────

test('pacing stays inside the configured window', () => {
  assert.equal(pacingDelayMs(LIMITS, () => 0), 360_000)
  assert.equal(pacingDelayMs(LIMITS, () => 0.999_999), 599_999)
  for (let i = 0; i < 200; i++) {
    const d = pacingDelayMs(LIMITS)
    assert.ok(d >= LIMITS.minDelayMs && d <= LIMITS.maxDelayMs, `out of range: ${d}`)
  }
})

test('default pacing really is 6-10 sends per hour', () => {
  const l = loadLimits({} as never)
  assert.ok(3_600_000 / l.maxDelayMs >= 6 - 0.001, 'slowest pace must still reach ~6/hour')
  assert.ok(3_600_000 / l.minDelayMs <= 10 + 0.001, 'fastest pace must not exceed ~10/hour')
})

// ── The Pacific business day ────────────────────────────────────────────────

test('the day boundary is Pacific, not UTC', () => {
  // 2026-08-23 06:00Z is still 2026-08-22 in Los Angeles (23:00 PDT).
  assert.equal(ptDayKey(new Date('2026-08-23T06:00:00Z')), '2026-08-22')
  // 08:00Z on the same date has ticked over to the 23rd (01:00 PDT).
  assert.equal(ptDayKey(new Date('2026-08-23T08:00:00Z')), '2026-08-23')
})

test('the PT day start round-trips in both DST and standard time', () => {
  for (const iso of ['2026-08-23T06:00:00Z', '2026-01-15T06:00:00Z']) {
    const now = new Date(iso)
    const start = ptDayStartUtc(now)
    assert.equal(ptDayKey(start), ptDayKey(now), `day start must sit inside its own PT day (${iso})`)
    assert.ok(start <= now)
  }
})

// ── Guards ──────────────────────────────────────────────────────────────────

const emptyState = (over: Partial<GuardState> = {}): GuardState => ({
  suppressedEmails: new Set(), suppressedDomains: new Set(),
  emailedToday: new Set(), emailedEver: new Set(),
  companiesContacted: new Set(), companiesReplied: new Set(), companiesOptedOut: new Set(),
  postalAddress: '123 Example St, Seattle, WA 98101',
  ...over,
})
const cand = (over: Partial<Candidate> = {}): Candidate => ({
  prospectId: 'p1', email: 'erica@officespacesoftware.com', emailGrade: 'A',
  status: 'queued', domain: 'officespacesoftware.com', company: 'OfficeSpace Software',
  ...over,
})

test('a clean candidate sends', () => {
  assert.deepEqual(evaluateCandidate(cand(), emptyState()), { send: true })
})

test('an unsubscribed contact is blocked', () => {
  assert.equal(evaluateCandidate(cand({ status: 'unsubscribed' }), emptyState()).reason, 'unsubscribed')
  assert.equal(evaluateCandidate(cand(), emptyState({
    suppressedEmails: new Set(['erica@officespacesoftware.com']),
  })).reason, 'suppressed')
})

test('a do-not-contact domain blocks every address on it', () => {
  assert.equal(evaluateCandidate(cand(), emptyState({
    suppressedDomains: new Set(['officespacesoftware.com']),
  })).reason, 'do-not-contact')
  assert.equal(evaluateCandidate(cand({ status: 'do_not_contact' }), emptyState()).reason, 'do-not-contact')
})

test('a replied contact is blocked', () => {
  assert.equal(evaluateCandidate(cand({ status: 'replied' }), emptyState()).reason, 'prospect-replied')
})

test('a bounced contact is blocked and never retried', () => {
  assert.equal(evaluateCandidate(cand({ status: 'bounced' }), emptyState()).reason, 'prospect-bounced')
})

test('the backup contact at a company that replied is blocked', () => {
  // A different person, same company — this is the rule the pipeline lacked.
  const backup = cand({ prospectId: 'p2', email: 'someone.else@officespacesoftware.com' })
  assert.equal(evaluateCandidate(backup, emptyState({
    companiesReplied: new Set(['officespacesoftware.com']),
  })).reason, 'company-replied')
})

test('only one contact per company gets initial outreach', () => {
  const second = cand({ prospectId: 'p2', email: 'other@officespacesoftware.com' })
  assert.equal(evaluateCandidate(second, emptyState({
    companiesContacted: new Set(['officespacesoftware.com']),
  })).reason, 'company-already-contacted')
})

test('a company opt-out silences its backups too', () => {
  assert.equal(evaluateCandidate(cand({ prospectId: 'p2' }), emptyState({
    companiesOptedOut: new Set(['officespacesoftware.com']),
  })).reason, 'company-opted-out')
})

test('the same address is never emailed twice', () => {
  assert.equal(evaluateCandidate(cand(), emptyState({
    emailedEver: new Set(['erica@officespacesoftware.com']),
  })).reason, 'already-emailed-ever')
  assert.equal(evaluateCandidate(cand(), emptyState({
    emailedToday: new Set(['erica@officespacesoftware.com']),
  })).reason, 'already-emailed-today')
})

test('a retry after a recorded send cannot send again', () => {
  // Simulates a cron double-fire: the first pass recorded the address, so the
  // second pass must refuse it.
  const emailed = new Set<string>()
  const first = evaluateCandidate(cand(), emptyState({ emailedEver: emailed }))
  assert.equal(first.send, true)
  emailed.add('erica@officespacesoftware.com')
  const retry = evaluateCandidate(cand(), emptyState({ emailedEver: emailed }))
  assert.equal(retry.send, false)
  assert.equal(retry.reason, 'already-emailed-ever')
})

test('grade C and D never send', () => {
  for (const g of ['C', 'D', null]) {
    assert.equal(evaluateCandidate(cand({ emailGrade: g }), emptyState()).reason, 'grade-not-ab')
  }
})

test('a missing postal address stops every send (CAN-SPAM)', () => {
  for (const bad of ['', '   ', '[YOUR ADDRESS]']) {
    assert.equal(evaluateCandidate(cand(), emptyState({ postalAddress: bad })).reason,
      'missing-postal-address')
  }
})

test('person-level opt-out outranks any company-level reason', () => {
  // Both apply; the verdict must name the stronger, person-level one.
  const v = evaluateCandidate(cand({ status: 'replied' }), emptyState({
    companiesContacted: new Set(['officespacesoftware.com']),
  }))
  assert.equal(v.reason, 'prospect-replied')
})

test('company identity prefers domain and falls back to name', () => {
  assert.equal(companyKey({ domain: 'WWW.Example.com', company: 'x' }), 'example.com')
  assert.equal(companyKey({ domain: null, company: 'Miller Cooper & Co., Ltd.' }), 'miller cooper co ltd')
  assert.equal(companyKey({ domain: null, company: null }), null)
  assert.equal(addressDomain('Erica@Example.COM'), 'example.com')
})

test('a domain-less record is still deduped by company name', () => {
  const c = cand({ domain: null, company: 'Baker Newman Noyes' })
  assert.equal(evaluateCandidate(c, emptyState({
    companiesContacted: new Set(['baker newman noyes']),
  })).reason, 'company-already-contacted')
})
