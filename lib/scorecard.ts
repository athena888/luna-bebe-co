import { supabaseAdmin } from './supabase'
import { isGaConfigured, getDailySessions } from './ga'

// The weekly scorecard: 7 numbers per week, computed live from orders (+GA4
// sessions when configured), shown on Portal → Analytics and snapshotted every
// Friday by the daily-flows cron (which also emails the digest).

export interface WeekMetrics {
  weekOf: string            // YYYY-MM-DD (Monday, UTC)
  revenue: number           // cents, paid orders
  orders: number
  aov: number               // cents
  sessions: number | null   // GA4; null when GA isn't configured
  cvr: number | null        // orders / sessions
  emailRevenue: number      // cents, orders with utm_source=email
  repeatRate: number | null // share of the week's orders from returning customers
  weeksOnHand: number | null // current week only — stock / weekly velocity
  note: string | null
}

function mondayOf(d: Date): Date {
  const x = new Date(d)
  x.setUTCHours(0, 0, 0, 0)
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7))
  return x
}

function yyyymmdd(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}

async function computeWeeksOnHand(): Promise<number | null> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const [{ data: variants }, { data: inv }, { data: recent }] = await Promise.all([
    supabaseAdmin.from('product_variants').select('product_id, quantity'),
    supabaseAdmin.from('inventory').select('product_id, quantity'),
    supabaseAdmin.from('orders').select('selected_items').neq('status', 'pending').gte('created_at', thirtyDaysAgo),
  ])

  // Effective stock per product: variant sum when variants exist, else the
  // single-product inventory row (same rule as /api/inventory).
  const byProduct = new Map<string, number>()
  for (const v of variants ?? []) {
    byProduct.set(v.product_id, (byProduct.get(v.product_id) ?? 0) + (v.quantity ?? 0))
  }
  for (const i of inv ?? []) {
    if (!byProduct.has(i.product_id)) byProduct.set(i.product_id, i.quantity ?? 0)
  }
  const stock = [...byProduct.values()].reduce((s, q) => s + q, 0)

  const units30 = (recent ?? []).reduce((s, o) => s + ((o.selected_items ?? []) as unknown[]).length, 0)
  const weeklyVelocity = (units30 / 30) * 7
  return weeklyVelocity > 0 ? stock / weeklyVelocity : null
}

export async function computeWeeklyScorecard(weeks = 8): Promise<WeekMetrics[]> {
  const firstMonday = mondayOf(new Date())
  firstMonday.setUTCDate(firstMonday.getUTCDate() - 7 * (weeks - 1))

  // All paid orders (full history — repeat detection needs orders before the
  // window too). Volume is small enough to keep this simple.
  const { data } = await supabaseAdmin
    .from('orders')
    .select('customer_email, total_amount, status, created_at, utm_source')
    .neq('status', 'pending')
    .order('created_at')
  const orders = data ?? []

  const firstSeen = new Map<string, string>()
  for (const o of orders) {
    const email = o.customer_email?.trim().toLowerCase()
    if (email && !firstSeen.has(email)) firstSeen.set(email, o.created_at)
  }

  let sessionsByDay: Map<string, number> | null = null
  try {
    if (isGaConfigured()) sessionsByDay = await getDailySessions(7 * weeks)
  } catch (e) {
    console.warn('Scorecard: GA sessions unavailable:', e instanceof Error ? e.message : e)
  }

  const weeksOnHand = await computeWeeksOnHand().catch(() => null)

  // Saved notes (and Friday snapshots) merge in by week — fail-soft until §31.
  const noteByWeek = new Map<string, string>()
  try {
    const { data: snaps } = await supabaseAdmin.from('weekly_scorecard').select('week_of, note')
    for (const s of snaps ?? []) if (s.note) noteByWeek.set(s.week_of, s.note)
  } catch { /* table not ready */ }

  const rows: WeekMetrics[] = []
  for (let w = 0; w < weeks; w++) {
    const ws = new Date(firstMonday)
    ws.setUTCDate(ws.getUTCDate() + 7 * w)
    const we = new Date(ws)
    we.setUTCDate(we.getUTCDate() + 7)
    const wsIso = ws.toISOString()
    const weIso = we.toISOString()

    const inWeek = orders.filter(o => o.created_at >= wsIso && o.created_at < weIso)
    const revenue = inWeek.reduce((s, o) => s + (o.total_amount ?? 0), 0)
    const count = inWeek.length
    const emailRevenue = inWeek
      .filter(o => (o.utm_source ?? '').toLowerCase() === 'email')
      .reduce((s, o) => s + (o.total_amount ?? 0), 0)
    const repeat = inWeek.filter(o => {
      const email = o.customer_email?.trim().toLowerCase()
      return email && (firstSeen.get(email) ?? o.created_at) < o.created_at
    }).length

    let sessions: number | null = null
    if (sessionsByDay) {
      sessions = 0
      for (let d = new Date(ws); d < we; d.setUTCDate(d.getUTCDate() + 1)) {
        sessions += sessionsByDay.get(yyyymmdd(d)) ?? 0
      }
    }

    const isCurrent = w === weeks - 1
    rows.push({
      weekOf: ws.toISOString().slice(0, 10),
      revenue,
      orders: count,
      aov: count ? Math.round(revenue / count) : 0,
      sessions,
      cvr: sessions ? count / sessions : null,
      emailRevenue,
      repeatRate: count ? repeat / count : null,
      weeksOnHand: isCurrent ? weeksOnHand : null,
      note: noteByWeek.get(ws.toISOString().slice(0, 10)) ?? null,
    })
  }
  return rows
}

/** Friday snapshot: persist the current week's numbers (keeps any saved note). */
export async function snapshotCurrentWeek(): Promise<WeekMetrics> {
  const rows = await computeWeeklyScorecard(1)
  const current = rows[rows.length - 1]
  await supabaseAdmin.from('weekly_scorecard').upsert({
    week_of: current.weekOf,
    revenue: current.revenue,
    orders: current.orders,
    aov: current.aov,
    sessions: current.sessions,
    cvr: current.cvr,
    email_revenue: current.emailRevenue,
    repeat_rate: current.repeatRate,
    weeks_on_hand: current.weeksOnHand,
  }, { onConflict: 'week_of' })
  return current
}
