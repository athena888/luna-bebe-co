import { supabaseAdmin } from './supabase'

// Marketing Cockpit data layer (Phase 1). Reads/writes the daily plan, tasks,
// content queue, scored assets, execution rate, and the sales trend (from the
// orders table — no Stripe API call needed). Outreach reads reuse the existing
// `touches` / `flags` ledger. Server-only (imports supabaseAdmin).

// ── Types ────────────────────────────────────────────────────────────────────
export type TaskStatus = 'open' | 'done' | 'skipped'
export type TaskType = 'sell' | 'market' | 'ops'

export interface Task {
  id: string
  plan_date: string
  title: string
  channel: string | null
  task_type: TaskType | null
  why: string | null
  est_minutes: number | null
  priority: number
  status: TaskStatus
  completed_at: string | null
}

export interface DailyPlan {
  id: string
  plan_date: string
  recap: string | null
  strategy_note: string | null
  exec_rate: number | null
  flags: string[] | null
  created_at: string
}

export interface ContentQueueItem {
  id: string
  plan_date: string
  platform: string
  suggested_time: string | null
  caption_draft: string | null
  image_brief: string | null
  asset_id: string | null
  status: 'suggested' | 'posted' | 'skipped'
  posted_at: string | null
  post_url: string | null
}

export interface ContentAsset {
  id: string
  storage_path: string
  public_url: string | null
  product: string | null
  platform: string | null
  brand_fit: number | null
  craft: number | null
  composite: number | null
  color_on_brand: boolean | null
  verdict: string | null
  recommended_use: string | null
  strengths: string[] | null
  fixes: string[] | null
  created_at: string
}

// ── Dates (everything is keyed on the PT calendar day) ───────────────────────
/** Today's date (YYYY-MM-DD) in America/Los_Angeles. */
export function todayPT(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' })
}
/** Shift a YYYY-MM-DD string by n days (UTC-noon math avoids DST edge cases). */
export function shiftDate(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// ── Plan + tasks ─────────────────────────────────────────────────────────────
export async function getPlan(date: string): Promise<DailyPlan | null> {
  const { data } = await supabaseAdmin.from('daily_plans').select('*').eq('plan_date', date).maybeSingle()
  return (data as DailyPlan) ?? null
}

export async function getTasks(date: string): Promise<Task[]> {
  const { data } = await supabaseAdmin
    .from('tasks').select('*').eq('plan_date', date)
    .order('priority', { ascending: true }).order('created_at', { ascending: true })
  return (data ?? []) as Task[]
}

export async function setTaskStatus(id: string, status: TaskStatus): Promise<void> {
  await supabaseAdmin.from('tasks').update({
    status,
    completed_at: status === 'done' ? new Date().toISOString() : null,
  }).eq('id', id)
}

// ── Execution rate + streak ──────────────────────────────────────────────────
function rateFromCounts(done: number, open: number, skipped: number): number | null {
  const total = done + open + skipped
  return total === 0 ? null : done / total
}

/** Completion rate for a single plan_date, or null if that day had no tasks. */
export async function execRate(date: string): Promise<number | null> {
  const tasks = await getTasks(date)
  if (!tasks.length) return null
  const done = tasks.filter(t => t.status === 'done').length
  const open = tasks.filter(t => t.status === 'open').length
  const skipped = tasks.filter(t => t.status === 'skipped').length
  return rateFromCounts(done, open, skipped)
}

/** Pull recent plan_dates' task rows in one query → per-day rates, newest first. */
async function recentDailyRates(days: number): Promise<{ date: string; rate: number }[]> {
  const since = shiftDate(todayPT(), -(days + 1))
  const { data } = await supabaseAdmin
    .from('tasks').select('plan_date, status').gte('plan_date', since)
  const byDate = new Map<string, { done: number; open: number; skipped: number }>()
  for (const r of (data ?? []) as { plan_date: string; status: TaskStatus }[]) {
    const c = byDate.get(r.plan_date) ?? { done: 0, open: 0, skipped: 0 }
    c[r.status] = (c[r.status] ?? 0) + 1
    byDate.set(r.plan_date, c)
  }
  return [...byDate.entries()]
    .map(([date, c]) => ({ date, rate: rateFromCounts(c.done, c.open, c.skipped) ?? 0 }))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

/** Rolling execution rate (avg daily rate over the last `days` days with tasks). */
export async function rollingRate(days = 7): Promise<number | null> {
  const rates = (await recentDailyRates(days)).slice(0, days)
  if (!rates.length) return null
  return rates.reduce((s, r) => s + r.rate, 0) / rates.length
}

/** Consecutive most-recent days with rate >= 0.7 (the habit signal). */
export async function streak(threshold = 0.7): Promise<number> {
  const rates = await recentDailyRates(30)
  let n = 0
  for (const r of rates) {
    if (r.rate >= threshold) n++
    else break
  }
  return n
}

/** Last `days` daily rates as a 0..1 series, oldest→newest (for a sparkline). */
export async function rateSeries(days = 7): Promise<number[]> {
  const rates = await recentDailyRates(days)
  const map = new Map(rates.map(r => [r.date, r.rate]))
  const out: number[] = []
  for (let i = days - 1; i >= 0; i--) out.push(map.get(shiftDate(todayPT(), -i)) ?? 0)
  return out
}

// ── Sales trend (from orders — no Stripe API call) ───────────────────────────
export interface SalesTrend {
  thisWeekCents: number
  lastWeekCents: number
  thisWeekCount: number
  lastWeekCount: number
  deltaPct: number | null   // week-over-week revenue change, null if last week was 0
}

const SOLD = new Set(['processing', 'shipped', 'delivered'])

export async function salesTrend(): Promise<SalesTrend> {
  const since = shiftDate(todayPT(), -14)
  const { data } = await supabaseAdmin
    .from('orders').select('total_amount, status, created_at').gte('created_at', since)
  const rows = (data ?? []) as { total_amount: number | null; status: string; created_at: string }[]
  const sevenAgo = `${shiftDate(todayPT(), -7)}T00:00:00Z`
  let tw = 0, lw = 0, twc = 0, lwc = 0
  for (const o of rows) {
    if (!SOLD.has(o.status)) continue
    const cents = o.total_amount ?? 0
    if (o.created_at >= sevenAgo) { tw += cents; twc++ } else { lw += cents; lwc++ }
  }
  return {
    thisWeekCents: tw, lastWeekCents: lw, thisWeekCount: twc, lastWeekCount: lwc,
    deltaPct: lw === 0 ? null : Math.round(((tw - lw) / lw) * 100),
  }
}

/** Boxes sold this week (count of sold orders in the last 7 days) for the header. */
export async function boxesSoldThisWeek(): Promise<number> {
  return (await salesTrend()).thisWeekCount
}

// ── Content queue ────────────────────────────────────────────────────────────
export async function getContentQueue(date: string): Promise<ContentQueueItem[]> {
  const { data } = await supabaseAdmin
    .from('content_queue').select('*').eq('plan_date', date).order('created_at', { ascending: true })
  return (data ?? []) as ContentQueueItem[]
}

export async function setContentStatus(id: string, status: 'suggested' | 'posted' | 'skipped', postUrl?: string): Promise<void> {
  await supabaseAdmin.from('content_queue').update({
    status,
    posted_at: status === 'posted' ? new Date().toISOString() : null,
    post_url: postUrl ?? null,
  }).eq('id', id)
}

export async function getRecentAssets(limit = 12): Promise<ContentAsset[]> {
  const { data } = await supabaseAdmin
    .from('content_assets').select('*').order('created_at', { ascending: false }).limit(limit)
  return (data ?? []) as ContentAsset[]
}

// ── Daily-plan generation (used by the morning cron) ─────────────────────────
import type { DailyPlanDraft } from './cockpit-ai'

/** Assemble the JSON payload handed to the §7.3 generator. Never invents data. */
export async function buildPlanPayload() {
  const today = todayPT()
  const yesterday = shiftDate(today, -1)
  const weekAgo = shiftDate(today, -7)

  const [sales, yRate, rolling, series, touchRows, yTasks, postsRows, followups] = await Promise.all([
    salesTrend(),
    execRate(yesterday),
    rollingRate(7),
    rateSeries(7),
    supabaseAdmin.from('touches').select('direction, status, created_at').gte('created_at', `${weekAgo}T00:00:00Z`),
    getTasks(yesterday),
    supabaseAdmin.from('content_queue').select('status, posted_at').eq('plan_date', yesterday),
    getFollowupsDueCount(),
  ])

  const touches = (touchRows.data ?? []) as { direction: string; status: string | null }[]
  const posts = (postsRows.data ?? []) as { status: string }[]

  return {
    date: today,
    sales_trend: sales,
    outreach: {
      sent_last_7d: touches.filter(t => t.direction === 'outbound').length,
      replied_last_7d: touches.filter(t => t.direction === 'inbound').length,
      followups_due: followups,
    },
    posts_logged_yesterday: posts.filter(p => p.status === 'posted').length,
    tasks_yesterday: {
      done: yTasks.filter(t => t.status === 'done').length,
      open: yTasks.filter(t => t.status === 'open').length,
      skipped: yTasks.filter(t => t.status === 'skipped').length,
    },
    execution_rate_yesterday: yRate,
    rolling_rate_7d: rolling,
    rate_series_7d: series,
  }
}

async function getFollowupsDueCount(): Promise<number> {
  const today = todayPT()
  const { count } = await supabaseAdmin
    .from('touches').select('id', { count: 'exact', head: true })
    .eq('direction', 'outbound').in('status', ['sent', 'followup_due'])
    .not('followup_due', 'is', null).lte('followup_due', today)
  return count ?? 0
}

/** Write a generated plan for `date` (idempotent — replaces that day's rows). */
export async function writePlan(date: string, draft: DailyPlanDraft, execRateYesterday: number | null): Promise<void> {
  // Clear any prior generated rows for the day so re-runs don't duplicate.
  await supabaseAdmin.from('tasks').delete().eq('plan_date', date)
  await supabaseAdmin.from('content_queue').delete().eq('plan_date', date).eq('status', 'suggested')

  await supabaseAdmin.from('daily_plans').upsert({
    plan_date: date,
    recap: draft.recap || null,
    strategy_note: draft.strategy_note || null,
    exec_rate: execRateYesterday,
    flags: draft.flags ?? [],
  }, { onConflict: 'plan_date' })

  if (draft.tasks.length) {
    await supabaseAdmin.from('tasks').insert(draft.tasks.map(t => ({
      plan_date: date,
      title: String(t.title ?? '').slice(0, 280) || 'Untitled task',
      channel: t.channel ?? null,
      task_type: ['sell', 'market', 'ops'].includes(String(t.task_type)) ? t.task_type : null,
      why: t.why ?? null,
      est_minutes: Number.isFinite(Number(t.est_minutes)) ? Number(t.est_minutes) : null,
      priority: Math.min(5, Math.max(1, Number(t.priority) || 3)),
    })))
  }

  if (draft.content_plan.length) {
    await supabaseAdmin.from('content_queue').insert(draft.content_plan.map(c => ({
      plan_date: date,
      platform: String(c.platform ?? 'instagram').slice(0, 40),
      suggested_time: c.suggested_time ?? null,
      caption_draft: c.caption_draft ?? null,
      image_brief: c.image_brief ?? null,
    })))
  }
}
