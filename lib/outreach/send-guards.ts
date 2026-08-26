// Every reason a queued email may NOT go out, as one pure function.
//
// The sender already re-checks suppression, grade and MX at send time; this
// consolidates those rules and adds the two the pipeline was missing —
// COMPANY-level deduplication and company-level reply/opt-out suppression —
// so a single decision can be unit-tested against every blocking condition
// instead of being spread across a loop.
//
// Nothing here touches the network or the database. lib/pipeline/sender.ts
// gathers the state and calls this; the answer is advisory-free — a `blocked`
// verdict means do not send, full stop.

export type BlockReason =
  | 'no-email'
  | 'grade-not-ab'
  | 'suppressed'
  | 'unsubscribed'
  | 'do-not-contact'
  | 'prospect-replied'
  | 'prospect-bounced'
  | 'already-emailed-today'
  | 'already-emailed-ever'
  | 'company-already-contacted'
  | 'company-replied'
  | 'company-opted-out'
  | 'missing-postal-address'

export interface Candidate {
  prospectId: string
  email: string | null
  emailGrade: string | null
  /** Prospect lifecycle status (sent / replied / bounced / suppressed / …). */
  status: string | null
  /** Company identity. Domain is preferred; company name is the fallback when
   *  a record has no domain, so a domain-less row still cannot be double-hit. */
  domain: string | null
  company: string | null
}

export interface GuardState {
  /** Addresses on the suppression list (unsubscribe, complaint, manual DNC). */
  suppressedEmails: ReadonlySet<string>
  /** Whole domains that must never be contacted again. */
  suppressedDomains: ReadonlySet<string>
  /** Addresses already emailed during the current PT day. */
  emailedToday: ReadonlySet<string>
  /** Addresses ever emailed by this campaign — person-level idempotency. */
  emailedEver: ReadonlySet<string>
  /** Company keys already contacted (any contact, any time). */
  companiesContacted: ReadonlySet<string>
  /** Company keys where somebody replied — backups must stay silent. */
  companiesReplied: ReadonlySet<string>
  /** Company keys where somebody unsubscribed or bounced hard. */
  companiesOptedOut: ReadonlySet<string>
  /** CAN-SPAM postal address, from BUSINESS_ADDRESS. */
  postalAddress: string
}

export interface Verdict {
  send: boolean
  reason?: BlockReason
}

/** Company identity: domain when we have one, else a normalised company name.
 *  Exported because the sender builds its state sets with the same key. */
export function companyKey(c: Pick<Candidate, 'domain' | 'company'>): string | null {
  const d = (c.domain ?? '').trim().toLowerCase().replace(/^www\./, '')
  if (d) return d
  const n = (c.company ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  return n || null
}

/** Domain of an email address, lowercase, or '' when unparseable. */
export function addressDomain(email: string): string {
  const at = email.lastIndexOf('@')
  return at === -1 ? '' : email.slice(at + 1).trim().toLowerCase()
}

/**
 * May this candidate be emailed right now?
 *
 * Order matters: the cheapest and most absolute rules come first, and
 * person-level opt-out outranks anything company-level, so a verdict always
 * names the strongest reason rather than an incidental one.
 */
export function evaluateCandidate(c: Candidate, s: GuardState): Verdict {
  const email = (c.email ?? '').trim().toLowerCase()
  if (!email) return { send: false, reason: 'no-email' }

  // A commercial email without a postal address is not lawful to send.
  const postal = (s.postalAddress ?? '').trim()
  if (!postal || /\[.*\]/.test(postal)) return { send: false, reason: 'missing-postal-address' }

  if (s.suppressedEmails.has(email)) return { send: false, reason: 'suppressed' }
  if (s.suppressedDomains.has(addressDomain(email))) return { send: false, reason: 'do-not-contact' }

  const status = (c.status ?? '').trim().toLowerCase()
  if (status === 'replied') return { send: false, reason: 'prospect-replied' }
  if (status === 'bounced') return { send: false, reason: 'prospect-bounced' }
  if (status === 'unsubscribed') return { send: false, reason: 'unsubscribed' }
  if (status === 'do_not_contact' || status === 'suppressed') return { send: false, reason: 'do-not-contact' }

  if (!(c.emailGrade === 'A' || c.emailGrade === 'B')) return { send: false, reason: 'grade-not-ab' }

  // Person-level idempotency: one campaign email per address, ever.
  if (s.emailedEver.has(email)) return { send: false, reason: 'already-emailed-ever' }
  if (s.emailedToday.has(email)) return { send: false, reason: 'already-emailed-today' }

  // Company-level. A reply or opt-out from ANY contact silences the whole
  // company; otherwise only the first contact at a company is approached.
  const key = companyKey(c)
  if (key) {
    if (s.companiesReplied.has(key)) return { send: false, reason: 'company-replied' }
    if (s.companiesOptedOut.has(key)) return { send: false, reason: 'company-opted-out' }
    if (s.companiesContacted.has(key)) return { send: false, reason: 'company-already-contacted' }
  }

  return { send: true }
}

/** Human-readable block reasons, for the dry-run report and the portal. */
export const BLOCK_REASON_TEXT: Record<BlockReason, string> = {
  'no-email': 'no email address on record',
  'grade-not-ab': 'deliverability grade is not A or B',
  'suppressed': 'address is on the suppression list',
  'unsubscribed': 'contact unsubscribed',
  'do-not-contact': 'contact or domain marked do-not-contact',
  'prospect-replied': 'contact already replied',
  'prospect-bounced': 'address previously bounced',
  'already-emailed-today': 'already emailed today',
  'already-emailed-ever': 'already emailed by this campaign',
  'company-already-contacted': 'another contact at this company was already approached',
  'company-replied': 'someone at this company already replied',
  'company-opted-out': 'someone at this company opted out or hard-bounced',
  'missing-postal-address': 'BUSINESS_ADDRESS not configured (CAN-SPAM)',
}
