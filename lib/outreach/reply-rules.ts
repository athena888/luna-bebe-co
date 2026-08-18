// Pure reply / bounce / follow-up decision logic.
//
// Deliberately dependency-free: no Supabase, no googleapis, no env. These are
// the rules that decide whether a human already answered and whether anyone may
// receive another email, so they must be unit-testable in isolation and
// reproducible from fixtures. lib/outreach/gmail-sync.ts performs the I/O and
// delegates every judgement to this file.

export type ReplyCategory =
  | 'POSITIVE' | 'QUESTION' | 'REFERRAL' | 'NOT_NOW' | 'NOT_INTERESTED'
  | 'WRONG_PERSON' | 'UNSUBSCRIBE' | 'AUTO_REPLY' | 'BOUNCE' | 'UNKNOWN'

// ── Bounce detection ─────────────────────────────────────────────────────────
const BOUNCE_FROM = /^(mailer-daemon|postmaster|mail-delivery|delivery-subsystem)@/i
const BOUNCE_SUBJECT = /\b(delivery status notification|undeliverable|delivery (has )?failed|returned to sender|failure notice|message not delivered|address not found)\b/i

export function looksLikeBounce(from: string, subject: string): boolean {
  return BOUNCE_FROM.test((from || '').trim()) || BOUNCE_SUBJECT.test(subject || '')
}

/** Hard vs soft matters: only a hard bounce earns permanent suppression.
 *  A full mailbox or a transient defer must never burn the address. */
export function isHardBounce(body: string): boolean {
  const b = (body || '').toLowerCase()
  if (/\b5\.[157]\.[0-9]\b/.test(b)) return true
  return /(address not found|does not exist|no such user|user unknown|unknown recipient|recipient rejected|mailbox unavailable|account (has been )?disabled|domain not found)/.test(b)
}

// ── Reply classification ─────────────────────────────────────────────────────
// Rule-based rather than model-based: auditable, free, deterministic, and good
// enough for the only decision that must be automatic — whether to STOP.
// Nothing here ever composes or sends a response.
const AUTO_REPLY = /\b(out of (the )?office|automatic reply|auto-?reply|autoresponder|on (vacation|leave|parental leave|maternity leave)|away from my desk|i am currently out|thank you for (contacting|your email)[,.]? we)/i
const UNSUB = /\b(unsubscribe|remove me|take me off|opt out|opt-out|stop emailing|do not (contact|email)|no longer wish)/i
const WRONG_PERSON = /\b(wrong person|not the right person|i don'?t handle|i no longer|you (may |might )?want to (contact|speak|talk)|forwarded (this )?to|better (person|contact)|not my (area|department)|please contact|reach out to)\b/i
const NOT_INTERESTED = /\b(not interested|no thanks|no thank you|we'?re all set|we have a vendor|already (have|work with)|not a fit|not for us)/i
const NOT_NOW = /\b(not (right now|at this time)|maybe (later|next)|circle back|revisit|check back|budget (season|cycle)|next (quarter|year)|too early)/i
const POSITIVE = /\b(interested|yes[,.!? ]|sounds (great|good|interesting)|love to|would like|please send|send (me |over |us )?(the |your )?(lookbook|pricing|info|details|sample)|let'?s (talk|chat|connect)|set up a (call|time)|happy to (chat|learn))/i

/**
 * Order matters and is deliberate:
 *  - AUTO_REPLY first, so an out-of-office mentioning "not interested in
 *    meetings" is never mistaken for a rejection (they never read it).
 *  - WRONG_PERSON before NOT_INTERESTED, because "I don't handle this, contact
 *    Dana" is a referral worth following, not a no.
 */
export function classifyReply(subject: string, body: string): ReplyCategory {
  const t = `${subject || ''}\n${body || ''}`
  if (AUTO_REPLY.test(t)) return 'AUTO_REPLY'
  if (UNSUB.test(t)) return 'UNSUBSCRIBE'
  if (WRONG_PERSON.test(t)) return 'WRONG_PERSON'
  if (NOT_INTERESTED.test(t)) return 'NOT_INTERESTED'
  if (NOT_NOW.test(t)) return 'NOT_NOW'
  if (POSITIVE.test(t)) return 'POSITIVE'
  if (/\?/.test(t)) return 'QUESTION'
  return 'UNKNOWN'
}

/** Pull a referred address out of a wrong-person reply, skipping their own
 *  address and ours. Returns null when nothing usable is present. */
export function extractReferredContact(body: string, ourDomain: string, theirEmail: string): string | null {
  const domainOf = (e: string) => e.split('@')[1]?.toLowerCase() ?? ''
  for (const raw of (body || '').match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) ?? []) {
    const e = raw.toLowerCase()
    if (e === (theirEmail || '').toLowerCase()) continue
    if (domainOf(e) === (ourDomain || '').toLowerCase()) continue
    if (/^(mailer-daemon|postmaster|noreply|no-reply)@/.test(e)) continue
    return e
  }
  return null
}

// ── Follow-up sequence (§15) ─────────────────────────────────────────────────
export const FOLLOWUP_SCHEDULE = [
  { step: 1, afterDays: 6 },
  { step: 2, afterDays: 13 },
] as const

export const MAX_TOUCHES = 3   // initial + 2 follow-ups, never more

export interface FollowupCandidate {
  prospectStatus: string
  sequenceStep: number
  lastSentAt: string | null
  followupPausedReason: string | null
  suppressed: boolean
  isCustomer: boolean
}

/**
 * The single source of truth for "may this prospect receive another touch?".
 *
 * Any terminal signal stops the sequence permanently. Timing is measured from
 * the ORIGINAL send date, so the historical 75 resume mid-sequence instead of
 * restarting as if they were new (§30).
 */
export function followupDecision(
  c: FollowupCandidate,
  now: Date,
): { send: boolean; step: number | null; reason: string } {
  if (c.suppressed) return { send: false, step: null, reason: 'suppressed' }
  if (c.isCustomer) return { send: false, step: null, reason: 'already a customer' }
  if (c.followupPausedReason) return { send: false, step: null, reason: c.followupPausedReason }

  const stopStatuses = ['replied', 'bounced', 'suppressed', 'closed_this_cycle', 'discarded']
  if (stopStatuses.includes(c.prospectStatus)) {
    return { send: false, step: null, reason: `prospect status ${c.prospectStatus}` }
  }
  if (c.sequenceStep >= MAX_TOUCHES - 1) {
    return { send: false, step: null, reason: 'sequence complete' }
  }
  if (!c.lastSentAt) return { send: false, step: null, reason: 'never sent an initial email' }

  const next = FOLLOWUP_SCHEDULE.find(s => s.step === c.sequenceStep + 1)
  if (!next) return { send: false, step: null, reason: 'no further step defined' }

  const elapsedDays = (now.getTime() - Date.parse(c.lastSentAt)) / 86_400_000
  if (elapsedDays < next.afterDays) {
    return { send: false, step: null, reason: `too soon (${elapsedDays.toFixed(1)}d of ${next.afterDays}d)` }
  }
  return { send: true, step: next.step, reason: 'eligible' }
}
