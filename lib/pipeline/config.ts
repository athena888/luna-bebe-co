import { supabaseAdmin } from '../supabase'
import { isFreemail, emailDomain } from '../outreach'

// Key/value config for the daily outreach pipeline (table outreach_config).
// Seeds live in supabase/migrations/outreach_pipeline.sql, documented in
// docs/outreach-kit.md. Server-only.

export async function getConfig<T>(key: string): Promise<T | null> {
  const { data } = await supabaseAdmin.from('outreach_config').select('value').eq('key', key).maybeSingle()
  return (data?.value as T) ?? null
}

export async function setConfig(key: string, value: unknown): Promise<void> {
  await supabaseAdmin.from('outreach_config')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
}

// ── Rotation ─────────────────────────────────────────────────────────────────
export interface Rotation {
  cursor: number
  metros: string[]
  categories: string[]
  titles: Record<string, string[]>
}

export interface Combo { metro: string; category: string; titles: string[] }

/**
 * Combo for a cursor value. Category advances nightly; metro every
 * `categories.length` nights — so consecutive nights never share a category and
 * no (metro, category) pair repeats for metros×categories nights.
 */
export function comboForCursor(r: Rotation, cursor: number): Combo {
  const category = r.categories[cursor % r.categories.length]
  const metro = r.metros[Math.floor(cursor / r.categories.length) % r.metros.length]
  return { metro, category, titles: r.titles[category] ?? [] }
}

export async function getRotation(): Promise<Rotation> {
  const r = await getConfig<Rotation>('rotation')
  if (!r) throw new Error('outreach_config.rotation is not seeded — run supabase/migrations/outreach_pipeline.sql')
  return r
}

/** Move to the next combo (called once the night's combo is fully worked). */
export async function advanceRotation(r: Rotation): Promise<void> {
  await setConfig('rotation', { ...r, cursor: r.cursor + 1 })
}

// ── Blocklist / eligibility ──────────────────────────────────────────────────
interface Blocklist { domains?: string[]; competitors?: string[] }

export async function getBlockedDomains(): Promise<Set<string>> {
  const b = (await getConfig<Blocklist>('blocklist')) ?? {}
  return new Set([...(b.domains ?? []), ...(b.competitors ?? [])].map(d => d.toLowerCase().trim()).filter(Boolean))
}

/** True when this address/domain must never be prospected (freemail or blocklist). */
export function isBlockedEmail(email: string, blocked: Set<string>): boolean {
  return isFreemail(email) || blocked.has(emailDomain(email))
}

export async function getDailySendCap(): Promise<number> {
  const v = await getConfig<number>('daily_send_cap')
  const n = Number(v ?? process.env.OUTREACH_DAILY_CAP ?? 25)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 25
}

/** Master switch for the whole pipeline (prospect + draft + send). Missing row
 *  = enabled; only an explicit false pauses. Toggled from Morning Review. */
export async function pipelineEnabled(): Promise<boolean> {
  const v = await getConfig<boolean>('pipeline_enabled')
  return v !== false
}

export async function setPipelineEnabled(enabled: boolean): Promise<void> {
  await setConfig('pipeline_enabled', enabled)
}

export async function getLookbookToggle(): Promise<boolean> {
  const v = await getConfig<{ include_in_first_touch?: boolean }>('lookbook')
  return Boolean(v?.include_in_first_touch)
}

// ── Nightly digest (daily_runs) ──────────────────────────────────────────────
/** Merge stat increments into today's daily_runs row (creates it if missing). */
export async function bumpDailyStats(patch: Record<string, number>): Promise<void> {
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await supabaseAdmin.from('daily_runs').select('stats').eq('run_date', today).maybeSingle()
  const stats = { ...((data?.stats as Record<string, number>) ?? {}) }
  for (const [k, v] of Object.entries(patch)) stats[k] = (Number(stats[k]) || 0) + v
  await supabaseAdmin.from('daily_runs')
    .upsert({ run_date: today, stats, updated_at: new Date().toISOString() }, { onConflict: 'run_date' })
}

export interface DailyRun { run_date: string; stats: Record<string, number> }

export async function getRecentRuns(days = 7): Promise<DailyRun[]> {
  const { data } = await supabaseAdmin.from('daily_runs')
    .select('run_date, stats').order('run_date', { ascending: false }).limit(days)
  return ((data ?? []) as DailyRun[]).reverse()
}
