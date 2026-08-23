import { supabaseAdmin } from '../supabase.ts'
import { MAX_API_CALLS_PER_DAY } from './targeting.ts'
import { getConfig, setConfig } from '../pipeline/config.ts'

// Ledger for every Anthropic API call the outreach machine makes (table
// ai_call_log, §51). Hard cap: MAX_API_CALLS_PER_DAY (3) across ALL purposes —
// prospect search + qualification + optional reply triage. When the budget is
// spent, callers queue their batch and retry next run; sending of
// already-qualified prospects is never blocked by this cap.

export type ApiPurpose = 'prospect_search' | 'qualification' | 'reply_triage' | 'enrichment' | 'contact_discovery'

// $ per 1M tokens (input, output) by model prefix.
const PRICES: Array<[prefix: string, inPerM: number, outPerM: number]> = [
  ['claude-haiku-4-5', 1, 5],
  ['claude-sonnet-4-6', 3, 15],
  ['claude-sonnet-5', 3, 15],
]

export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const [, inPerM, outPerM] = PRICES.find(([p]) => model.startsWith(p)) ?? ['', 3, 15]
  return (inputTokens * inPerM + outputTokens * outPerM) / 1_000_000
}

/** Count of ledgered calls made today (UTC). Fails closed: a DB error counts
 *  as budget exhausted, because an uncounted call could breach the cap. */
export async function apiCallsToday(): Promise<number> {
  const since = new Date().toISOString().slice(0, 10) + 'T00:00:00Z'
  const { count, error } = await supabaseAdmin.from('ai_call_log')
    .select('id', { count: 'exact', head: true }).gte('called_at', since)
  if (error) return MAX_API_CALLS_PER_DAY
  return count ?? 0
}

// Finding new companies must outrank re-researching the ones we have. On
// 2026-08-22 all three of the day's calls went to enrichment and
// prospect_search got none — for the whole week — so the pool was never
// replenished and Morning Review emptied out. These calls are ring-fenced:
// only the discovery path may spend them, and only until it has.
export const DISCOVERY_PURPOSES: readonly ApiPurpose[] = ['prospect_search', 'qualification']
export const DISCOVERY_RESERVED_CALLS = 4

/** Discovery-path calls already made today (UTC). Fails closed: on a DB error
 *  we assume none ran, which keeps the reserve intact rather than releasing it
 *  to enrichment. */
export async function discoveryCallsToday(): Promise<number> {
  const since = new Date().toISOString().slice(0, 10) + 'T00:00:00Z'
  const { count, error } = await supabaseAdmin.from('ai_call_log')
    .select('id', { count: 'exact', head: true })
    .gte('called_at', since).in('purpose', DISCOVERY_PURPOSES as string[])
  if (error) return 0
  return count ?? 0
}

/**
 * Calls this purpose may still make today. Discovery purposes see the whole
 * remaining budget; everything else sees it minus whatever is still being held
 * back for discovery.
 */
export async function apiBudgetRemaining(purpose?: ApiPurpose): Promise<number> {
  // The cumulative ceiling outranks the daily reserve: when the money is
  // gone it is gone for discovery too.
  if (await spendCapReached()) return 0
  const free = Math.max(0, MAX_API_CALLS_PER_DAY - await apiCallsToday())
  if (purpose && DISCOVERY_PURPOSES.includes(purpose)) return free
  const held = Math.max(0, DISCOVERY_RESERVED_CALLS - await discoveryCallsToday())
  return Math.max(0, free - held)
}

export interface ApiCallRecord {
  purpose: ApiPurpose
  model: string
  batch_size: number
  input_tokens: number
  output_tokens: number
  ok: boolean
  error?: string | null
}

export async function logApiCall(rec: ApiCallRecord): Promise<void> {
  const { error } = await supabaseAdmin.from('ai_call_log').insert({
    purpose: rec.purpose,
    model: rec.model,
    batch_size: rec.batch_size,
    input_tokens: rec.input_tokens,
    output_tokens: rec.output_tokens,
    est_cost_usd: estimateCostUsd(rec.model, rec.input_tokens, rec.output_tokens),
    ok: rec.ok,
    error: rec.error ?? null,
  })
  if (error) console.error('ai_call_log insert failed:', error.message)
}

export interface ApiUsageSummary {
  calls: number
  byPurpose: Record<string, { calls: number; inputTokens: number; outputTokens: number; costUsd: number }>
  totalCostUsd: number
}

/** Usage + estimated cost over the last N days (for the weekly summary). */
export async function apiUsageSince(days: number): Promise<ApiUsageSummary> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString()
  const { data } = await supabaseAdmin.from('ai_call_log')
    .select('purpose, input_tokens, output_tokens, est_cost_usd').gte('called_at', since)
  const summary: ApiUsageSummary = { calls: 0, byPurpose: {}, totalCostUsd: 0 }
  for (const r of (data ?? []) as { purpose: string; input_tokens: number; output_tokens: number; est_cost_usd: number }[]) {
    summary.calls++
    summary.totalCostUsd += Number(r.est_cost_usd) || 0
    const p = summary.byPurpose[r.purpose] ??= { calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 }
    p.calls++
    p.inputTokens += r.input_tokens
    p.outputTokens += r.output_tokens
    p.costUsd += Number(r.est_cost_usd) || 0
  }
  return summary
}

// ── Hard spend ceiling ───────────────────────────────────────────────────────
// A cumulative, all-time cap on what the outreach machine may spend on model
// calls. Once it is reached every purpose stops — including discovery, which
// the daily reserve otherwise protects — and the owner gets one email.
//
// This is a decision point, not a rate limit: the question it answers is
// "has this pipeline earned more runway, or should the money go to a contact
// database instead?" The daily call cap (MAX_API_CALLS_PER_DAY) still applies
// underneath it and is the thing to change for pacing.
export const SPEND_CAP_USD = 30

const SPEND_ALERT_KEY = 'spend_cap_alert'

/** Everything the ledger has ever recorded, in USD. Fails CLOSED: if the spend
 *  cannot be read we treat the cap as reached rather than spend blind. */
export async function spendToDateUsd(): Promise<number> {
  const { data, error } = await supabaseAdmin.from('ai_call_log').select('est_cost_usd')
  if (error) return SPEND_CAP_USD
  return (data ?? []).reduce((sum, r) => sum + Number((r as { est_cost_usd: number | null }).est_cost_usd ?? 0), 0)
}

/** True once the cumulative cap is reached. Emails the owner the first time,
 *  and never again for the same cap — an alert that repeats is an alert that
 *  gets filtered. Notification failure never unblocks spending. */
export async function spendCapReached(): Promise<boolean> {
  const spent = await spendToDateUsd()
  if (spent < SPEND_CAP_USD) return false
  try {
    const prior = await getConfig<{ notified_at?: string; cap?: number }>(SPEND_ALERT_KEY)
    if (prior?.cap !== SPEND_CAP_USD) {
      await setConfig(SPEND_ALERT_KEY, { notified_at: new Date().toISOString(), cap: SPEND_CAP_USD, spent })
      // Loaded lazily: lib/resend.ts imports through the @/lib alias, which
      // the node test runner cannot resolve. Keeping it out of this module's
      // static graph means every test that touches the ledger still runs.
      const { sendSpendCapEmail } = await import('../resend.ts')
      await sendSpendCapEmail(spent, SPEND_CAP_USD)
    }
  } catch (e) {
    console.error('spend cap alert failed (spending still blocked):', e)
  }
  return true
}
