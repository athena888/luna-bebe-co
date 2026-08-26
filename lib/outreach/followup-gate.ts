// Follow-ups may only be drafted while reply detection is actually working.
//
// A follow-up is the one email that becomes harmful when we are not listening:
// chasing somebody who already answered is the fastest way to earn a spam
// complaint, and on a domain publishing DMARC p=none that damage is not
// contained. The flags (followups_enabled, quality_v3.followup_1_enabled,
// followup_2_enabled) say what Emily WANTS; this gate says whether it is
// currently safe, and the two are ANDed.
//
// Evidence, not configuration: gmail-sync.ts writes a gmail_sync_log row only
// AFTER isReadScopeConfigured() has passed, so a recent clean row proves the
// gmail.readonly grant exists and the job ran. A missing scope, a broken
// credential or a stalled cron all look the same from here — stale — and all
// produce the same answer: hold the follow-ups.
//
// The moment the grant lands and the nightly sync writes a row, follow-ups
// resume on their own. Nothing needs to be switched back on by hand.

/** How stale reply sync may be before follow-ups hold. The sync rides the
 *  daily cron, so 48h tolerates one missed run and no more. */
export const SYNC_MAX_AGE_HOURS = 48

export interface SyncRow {
  ran_at: string
  errors: string | null
  dry: boolean
}

export interface GateVerdict {
  safe: boolean
  reason: string
}

/**
 * Pure decision, so the rule can be tested without a database.
 *
 * `rows` is the recent gmail_sync_log, newest first. Safe only when the newest
 * real (non-dry, error-free) run is inside the window.
 */
export function evaluateFollowupGate(
  rows: SyncRow[],
  now: Date = new Date(),
  maxAgeHours: number = SYNC_MAX_AGE_HOURS,
): GateVerdict {
  const real = rows.filter(r => !r.dry && !r.errors)
  if (!real.length) {
    return { safe: false, reason: 'reply sync has never completed cleanly — gmail.readonly is probably not granted' }
  }
  const newest = real
    .map(r => new Date(r.ran_at).getTime())
    .filter(t => Number.isFinite(t))
    .sort((a, b) => b - a)[0]
  if (newest === undefined) {
    return { safe: false, reason: 'reply sync has no readable timestamp' }
  }
  const ageHours = (now.getTime() - newest) / 3_600_000
  if (ageHours > maxAgeHours) {
    return {
      safe: false,
      reason: `reply sync last succeeded ${Math.floor(ageHours)}h ago (limit ${maxAgeHours}h) — replies would be invisible`,
    }
  }
  return { safe: true, reason: `reply sync healthy (${Math.max(0, Math.floor(ageHours))}h ago)` }
}

/** Live check against gmail_sync_log. Fails CLOSED: any error reading the log
 *  holds the follow-ups, because "I cannot tell" and "not listening" carry the
 *  same risk. */
export async function followupsSafe(now: Date = new Date()): Promise<GateVerdict> {
  try {
    // Loaded lazily: lib/supabase.ts builds its client at module scope and
    // throws without env, which would make the pure rule above untestable.
    const { supabaseAdmin } = await import('../supabase.ts')
    const { data, error } = await supabaseAdmin
      .from('gmail_sync_log')
      .select('ran_at, errors, dry')
      .order('ran_at', { ascending: false })
      .limit(10)
    if (error) return { safe: false, reason: `cannot read gmail_sync_log (${error.message})` }
    return evaluateFollowupGate((data ?? []) as SyncRow[], now)
  } catch (e) {
    return { safe: false, reason: `cannot read gmail_sync_log (${(e as Error).message})` }
  }
}
