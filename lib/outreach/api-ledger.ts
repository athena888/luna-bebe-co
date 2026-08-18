import { supabaseAdmin } from '../supabase'
import { MAX_API_CALLS_PER_DAY } from './targeting'

// Ledger for every Anthropic API call the outreach machine makes (table
// ai_call_log, §51). Hard cap: MAX_API_CALLS_PER_DAY (3) across ALL purposes —
// prospect search + qualification + optional reply triage. When the budget is
// spent, callers queue their batch and retry next run; sending of
// already-qualified prospects is never blocked by this cap.

export type ApiPurpose = 'prospect_search' | 'qualification' | 'reply_triage'

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

export async function apiBudgetRemaining(): Promise<number> {
  return Math.max(0, MAX_API_CALLS_PER_DAY - await apiCallsToday())
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
