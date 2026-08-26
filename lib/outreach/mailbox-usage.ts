// Reads the live sending state: per-mailbox usage for the current Pacific day,
// the suppression/dedup sets the guards need, and the plan a drain WOULD
// execute. Read-only — nothing in this file sends, queues or mutates.

import { supabaseAdmin } from '../supabase.ts'
import {
  loadMailboxes, loadLimits, ptDayKey, ptDayStartUtc, selectMailbox, remainingToday,
  type Mailbox, type MailboxUsage,
} from './mailboxes.ts'
import {
  evaluateCandidate, companyKey, addressDomain, BLOCK_REASON_TEXT,
  type Candidate, type GuardState, type BlockReason,
} from './send-guards.ts'

/** Sends per mailbox for the current PT day. Counts only status='sent', so a
 *  failed Gmail call never consumes anyone's allowance. */
export async function getMailboxUsage(now = new Date()): Promise<MailboxUsage> {
  const day = ptDayKey(now)
  const usage: MailboxUsage = {}
  const { data } = await supabaseAdmin.from('sends')
    .select('sender_email, sent_at, sent_day_pt')
    .eq('status', 'sent')
    .gte('sent_at', ptDayStartUtc(now).toISOString())
  for (const r of (data ?? []) as Array<{ sender_email: string | null; sent_day_pt: string | null }>) {
    // Prefer the stamped PT day; fall back to the sent_at window for rows
    // written before the column existed.
    if (r.sent_day_pt && r.sent_day_pt !== day) continue
    const box = (r.sender_email ?? '').trim().toLowerCase()
    if (!box) continue
    usage[box] = (usage[box] ?? 0) + 1
  }
  return usage
}

export interface SendingDashboard {
  day: string
  mailboxes: Array<{ slot: number; email: string; sent: number; limit: number; remaining: number }>
  total: { sent: number; limit: number; remaining: number }
  queued: number
  sentToday: number
  failedToday: number
  bouncedToday: number
  repliedToday: number
  dryRun: boolean
  configured: boolean
}

/** Everything the admin portal needs for "Mailbox A: X / 50". */
export async function getSendingDashboard(now = new Date()): Promise<SendingDashboard> {
  const boxes = loadMailboxes()
  const limits = loadLimits()
  const usage = await getMailboxUsage(now)
  const day = ptDayKey(now)
  const since = ptDayStartUtc(now).toISOString()

  const countWhere = async (build: (q: ReturnType<typeof baseQuery>) => unknown): Promise<number> => {
    try {
      const { count } = (await build(baseQuery())) as { count: number | null }
      return count ?? 0
    } catch { return 0 }
  }
  const baseQuery = () => supabaseAdmin.from('sends').select('id', { count: 'exact', head: true })

  const [queued, sentToday, failedToday, bouncedToday, repliedToday] = await Promise.all([
    countWhere(q => q.eq('status', 'queued')),
    countWhere(q => q.eq('status', 'sent').gte('sent_at', since)),
    countWhere(q => q.eq('status', 'failed').gte('created_at', since)),
    countWhere(q => q.not('bounced_at', 'is', null).gte('bounced_at', since)),
    countWhere(q => q.not('replied_at', 'is', null).gte('replied_at', since)),
  ])

  const totalSent = boxes.reduce((s, m) => s + (usage[m.email] ?? 0), 0)
  return {
    day,
    mailboxes: boxes.map(m => ({
      slot: m.slot, email: m.email,
      sent: usage[m.email] ?? 0,
      limit: limits.perMailbox,
      remaining: Math.max(0, limits.perMailbox - (usage[m.email] ?? 0)),
    })),
    total: {
      sent: totalSent,
      limit: limits.total,
      remaining: remainingToday(boxes, usage, limits),
    },
    queued, sentToday, failedToday, bouncedToday, repliedToday,
    dryRun: String(process.env.EMAIL_DRY_RUN ?? '').toLowerCase() === 'true',
    configured: boxes.length > 0 && Boolean(process.env.GOOGLE_SA_KEY),
  }
}

/**
 * Load every set the guards consult. One pass, so a drain does not re-query
 * per prospect.
 *
 * Company state is derived from what actually happened (sends + prospect
 * status) rather than only from company_outreach_state, so the rule holds even
 * on rows that predate that table.
 */
export async function buildGuardState(now = new Date()): Promise<GuardState> {
  const since = ptDayStartUtc(now).toISOString()

  const [supp, sentRows, todayRows, prospects, companyState] = await Promise.all([
    supabaseAdmin.from('suppression').select('email, domain'),
    supabaseAdmin.from('sends').select('recipient_email').eq('status', 'sent'),
    supabaseAdmin.from('sends').select('recipient_email').eq('status', 'sent').gte('sent_at', since),
    supabaseAdmin.from('prospects').select('email, domain, company, status'),
    supabaseAdmin.from('company_outreach_state').select('company_key, replied_at, opted_out_at')
      .then(r => r, () => ({ data: [] })),
  ])

  const suppressedEmails = new Set<string>()
  const suppressedDomains = new Set<string>()
  for (const r of (supp.data ?? []) as Array<{ email: string | null; domain: string | null }>) {
    if (r.email) suppressedEmails.add(String(r.email).trim().toLowerCase())
    if (r.domain) suppressedDomains.add(String(r.domain).trim().toLowerCase())
  }

  const lower = (rows: Array<{ recipient_email: string | null }> | null) =>
    new Set((rows ?? []).map(r => (r.recipient_email ?? '').trim().toLowerCase()).filter(Boolean))
  const emailedEver = lower(sentRows.data as never)
  const emailedToday = lower(todayRows.data as never)

  const companiesContacted = new Set<string>()
  const companiesReplied = new Set<string>()
  const companiesOptedOut = new Set<string>()

  // Any prospect already advanced past drafting means their company is spoken for.
  for (const p of (prospects.data ?? []) as Array<{ email: string | null; domain: string | null; company: string | null; status: string | null }>) {
    const key = companyKey({ domain: p.domain, company: p.company })
      ?? (p.email ? addressDomain(p.email) : null)
    if (!key) continue
    const st = (p.status ?? '').toLowerCase()
    if (st === 'sent' || st === 'closed_this_cycle') companiesContacted.add(key)
    if (st === 'replied') { companiesReplied.add(key); companiesContacted.add(key) }
    if (st === 'bounced' || st === 'unsubscribed' || st === 'do_not_contact' || st === 'suppressed') {
      companiesOptedOut.add(key)
    }
  }
  for (const c of ((companyState as { data?: Array<{ company_key: string; replied_at: string | null; opted_out_at: string | null }> }).data ?? [])) {
    const key = String(c.company_key).toLowerCase()
    companiesContacted.add(key)
    if (c.replied_at) companiesReplied.add(key)
    if (c.opted_out_at) companiesOptedOut.add(key)
  }

  return {
    suppressedEmails, suppressedDomains, emailedToday, emailedEver,
    companiesContacted, companiesReplied, companiesOptedOut,
    postalAddress: (process.env.BUSINESS_ADDRESS ?? '').trim(),
  }
}

export interface PlannedSend {
  prospectId: string
  person: string
  company: string
  companyKey: string | null
  email: string
  decision: 'SEND' | 'BLOCKED'
  mailbox: string | null
  reason: string
}

/**
 * What a drain WOULD do, without doing any of it. Applies the guards and the
 * mailbox/cap policy in the same order and with the same data the real sender
 * uses, mutating only local copies of the state sets.
 */
export function planSends(
  candidates: Array<Candidate & { person?: string | null }>,
  state: GuardState,
  mailboxes: Mailbox[],
  limits: ReturnType<typeof loadLimits>,
  usage: MailboxUsage,
): PlannedSend[] {
  // Local, mutable copies — planning must not leak into the caller's state.
  const emailedEver = new Set(state.emailedEver)
  const emailedToday = new Set(state.emailedToday)
  const contacted = new Set(state.companiesContacted)
  const runningUsage: MailboxUsage = { ...usage }
  const out: PlannedSend[] = []

  for (const c of candidates) {
    const working: GuardState = {
      ...state, emailedEver, emailedToday, companiesContacted: contacted,
    }
    const key = companyKey(c)
    const verdict = evaluateCandidate(c, working)
    const email = (c.email ?? '').trim().toLowerCase()
    const row: PlannedSend = {
      prospectId: c.prospectId,
      person: (c.person ?? '').trim() || '—',
      company: c.company ?? '—',
      companyKey: key,
      email: email || '—',
      decision: 'BLOCKED',
      mailbox: null,
      reason: '',
    }

    if (!verdict.send) {
      row.reason = reasonText(verdict.reason!)
      out.push(row)
      continue
    }

    const pick = selectMailbox(mailboxes, runningUsage, limits)
    if (!pick.mailbox) {
      row.reason = pick.reason === 'no-mailboxes-configured'
        ? 'no sender mailbox configured'
        : 'daily sending cap reached'
      out.push(row)
      continue
    }

    row.decision = 'SEND'
    row.mailbox = pick.mailbox.email
    row.reason = 'passes every guard'
    runningUsage[pick.mailbox.email] = (runningUsage[pick.mailbox.email] ?? 0) + 1
    emailedEver.add(email)
    emailedToday.add(email)
    if (key) contacted.add(key)
    out.push(row)
  }
  return out
}

function reasonText(r: BlockReason): string {
  return BLOCK_REASON_TEXT[r] ?? r
}
