// Multi-mailbox sending policy: which mailbox may send, how many, how often.
//
// Deliberately pure and dependency-free. Every rule that decides whether an
// email is allowed to leave is a plain function of (config, usage) so it can be
// tested exhaustively without Gmail, Supabase or a clock. lib/pipeline/sender.ts
// supplies the real numbers; nothing here can send anything.
//
// ── Auth note (important) ───────────────────────────────────────────────────
// Sending uses Google Workspace DOMAIN-WIDE DELEGATION: one service account
// (GOOGLE_SA_KEY) impersonates a mailbox via the JWT `subject`. A second
// mailbox therefore needs only its ADDRESS — there is no second client id,
// client secret or refresh token, because we are not doing per-user OAuth.
// Both mailboxes must be real Workspace users on the domain (a Gmail alias is
// not a mailbox and fails with invalid_grant).

const PT = 'America/Los_Angeles'

export interface Mailbox {
  /** 1-based slot, matching EMAIL_ACCOUNT_<n>_EMAIL. */
  slot: number
  /** The Workspace address the service account impersonates. */
  email: string
}

export interface SendLimits {
  perMailbox: number
  total: number
  minDelayMs: number
  maxDelayMs: number
  /** Max sends per invocation. 0 = unlimited (in-process pacing applies).
   *  Set to 1 when an EXTERNAL scheduler provides the spacing: a serverless
   *  function cannot sleep 6-10 minutes inside a 300s limit, so it would be
   *  killed mid-sleep after a single send. */
  maxPerRun: number
}

/** Usage for one PT day, keyed by lowercase mailbox address. */
export type MailboxUsage = Record<string, number>

// ── Configuration ───────────────────────────────────────────────────────────

/**
 * Mailboxes from env, in slot order. EMAIL_ACCOUNT_1_EMAIL / _2_EMAIL; slot 1
 * falls back to the legacy GMAIL_SENDER so an existing single-mailbox
 * deployment keeps working untouched. Blank slots are skipped, not guessed.
 */
export function loadMailboxes(env: NodeJS.ProcessEnv = process.env): Mailbox[] {
  const out: Mailbox[] = []
  for (let slot = 1; slot <= 8; slot++) {
    const raw = env[`EMAIL_ACCOUNT_${slot}_EMAIL`] ?? (slot === 1 ? env.GMAIL_SENDER : undefined)
    const email = (raw ?? '').trim().toLowerCase()
    if (!email) continue
    if (out.some(m => m.email === email)) continue   // same address twice is a config error, not 2x capacity
    out.push({ slot, email })
  }
  return out
}

const num = (v: string | undefined, fallback: number): number => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

/**
 * Limits from env. Defaults are the conservative ones: 50 per mailbox, 100 a
 * day, and a 6–10 minute gap — roughly 6–10 sends per hour per mailbox, which
 * is what keeps cold volume looking human.
 */
export function loadLimits(env: NodeJS.ProcessEnv = process.env): SendLimits {
  const perMailbox = num(env.EMAIL_DAILY_LIMIT_PER_MAILBOX, 50)
  const total = num(env.EMAIL_TOTAL_DAILY_LIMIT, 100)
  const minDelayMs = num(env.EMAIL_MIN_DELAY_SECONDS, 360) * 1000
  const maxDelayMs = num(env.EMAIL_MAX_DELAY_SECONDS, 600) * 1000
  const maxPerRun = Number(env.EMAIL_MAX_PER_RUN) > 0 ? Math.floor(Number(env.EMAIL_MAX_PER_RUN)) : 0
  return { perMailbox, total, minDelayMs, maxDelayMs: Math.max(minDelayMs, maxDelayMs), maxPerRun }
}

/** EMAIL_DRY_RUN=true → run every decision, call no send API. */
export function dryRunEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return String(env.EMAIL_DRY_RUN ?? '').trim().toLowerCase() === 'true'
}

// ── The PT day ──────────────────────────────────────────────────────────────

/** Calendar date in America/Los_Angeles as 'YYYY-MM-DD'. The business day is
 *  Pacific because the business is; UTC would roll the counter over at 4/5 PM
 *  local and hand back a fresh 50 in the middle of an afternoon. */
export function ptDayKey(now: Date = new Date()): string {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: PT, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const get = (t: string) => p.find(x => x.type === t)!.value
  return `${get('year')}-${get('month')}-${get('day')}`
}

/** UTC instant of PT midnight that opens the given instant's PT day. Used as
 *  the `>= sent_at` bound when counting today's sends. */
export function ptDayStartUtc(now: Date = new Date()): Date {
  const key = ptDayKey(now)
  // PT is UTC-8 or UTC-7; probe both and keep the one that lands on this key.
  for (const offset of [8, 7]) {
    const guess = new Date(`${key}T00:00:00.000Z`)
    guess.setUTCHours(guess.getUTCHours() + offset)
    if (ptDayKey(guess) === key) return guess
  }
  return new Date(`${key}T08:00:00.000Z`)
}

// ── Selection ───────────────────────────────────────────────────────────────

export interface Selection {
  mailbox: Mailbox | null
  /** Why nothing may be sent, when mailbox is null. */
  reason?: 'no-mailboxes-configured' | 'total-cap-reached' | 'all-mailboxes-at-cap'
}

/**
 * The next mailbox to send from, or null with a reason.
 *
 * Balances rather than strictly alternating: pick the configured mailbox with
 * the fewest sends today, ties broken by slot order. Over an empty day that
 * produces exactly A, B, A, B — and unlike a positional round-robin it self-
 * corrects when one mailbox starts the day behind, or when a send fails.
 *
 * Caps are enforced here and nowhere else, so there is one place to audit:
 * a mailbox at its per-mailbox cap is never returned, and the global total is
 * checked before any mailbox is considered.
 */
export function selectMailbox(
  mailboxes: Mailbox[],
  usage: MailboxUsage,
  limits: SendLimits,
): Selection {
  if (!mailboxes.length) return { mailbox: null, reason: 'no-mailboxes-configured' }

  const used = (m: Mailbox) => usage[m.email] ?? 0
  const totalUsed = mailboxes.reduce((s, m) => s + used(m), 0)
  if (totalUsed >= limits.total) return { mailbox: null, reason: 'total-cap-reached' }

  const eligible = mailboxes.filter(m => used(m) < limits.perMailbox)
  if (!eligible.length) return { mailbox: null, reason: 'all-mailboxes-at-cap' }

  const best = eligible.reduce((a, b) => {
    const d = used(a) - used(b)
    return d !== 0 ? (d < 0 ? a : b) : (a.slot <= b.slot ? a : b)
  })
  return { mailbox: best }
}

/** Sends still allowed today across all mailboxes — the smaller of what the
 *  global cap allows and what the per-mailbox caps can absorb. */
export function remainingToday(
  mailboxes: Mailbox[],
  usage: MailboxUsage,
  limits: SendLimits,
): number {
  const totalUsed = mailboxes.reduce((s, m) => s + (usage[m.email] ?? 0), 0)
  const byTotal = Math.max(0, limits.total - totalUsed)
  const byMailbox = mailboxes.reduce(
    (s, m) => s + Math.max(0, limits.perMailbox - (usage[m.email] ?? 0)), 0)
  return Math.min(byTotal, byMailbox)
}

/** Randomised gap between sends. Random so the pattern is not a metronome —
 *  identical spacing is itself a spam signal. */
export function pacingDelayMs(limits: SendLimits, rand: () => number = Math.random): number {
  const span = Math.max(0, limits.maxDelayMs - limits.minDelayMs)
  return limits.minDelayMs + Math.floor(rand() * span)
}
