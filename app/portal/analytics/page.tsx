import { supabaseAdmin } from '@/lib/supabase'
import { TrendingUp, ShoppingBag, DollarSign } from 'lucide-react'
import { UTMLinkBuilder } from './UTMLinkBuilder'
import { InsightsTabs } from '@/components/portal/InsightsTabs'
import { ScorecardNote } from '@/components/portal/ScorecardNote'
import { computeWeeklyScorecard, type WeekMetrics } from '@/lib/scorecard'

// Live data on every load — never serve the build-time snapshot.
export const dynamic = 'force-dynamic'

function fmt(cents: number) { return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}` }
function pct(n: number, total: number) { return total === 0 ? '0%' : `${Math.round((n / total) * 100)}%` }

interface Order {
  total_amount: number
  status: string
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  created_at: string
}

interface ChannelRow {
  source: string
  medium: string | null
  orders: number
  revenue: number
  avgOrder: number
}

async function getAnalytics() {
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('total_amount, status, utm_source, utm_medium, utm_campaign, created_at')
    .order('created_at', { ascending: false })

  const all: Order[] = orders ?? []
  const paid = all.filter(o => o.status !== 'pending')

  // Group by source
  const bySource = new Map<string, { orders: number; revenue: number; medium: string | null }>()

  for (const o of paid) {
    const key = o.utm_source ?? '(direct / none)'
    const existing = bySource.get(key) ?? { orders: 0, revenue: 0, medium: o.utm_medium }
    bySource.set(key, {
      orders: existing.orders + 1,
      revenue: existing.revenue + (o.total_amount ?? 0),
      medium: existing.medium ?? o.utm_medium,
    })
  }

  const channels: ChannelRow[] = Array.from(bySource.entries())
    .map(([source, v]) => ({
      source,
      medium: v.medium,
      orders: v.orders,
      revenue: v.revenue,
      avgOrder: v.orders === 0 ? 0 : Math.round(v.revenue / v.orders),
    }))
    .sort((a, b) => b.revenue - a.revenue)

  // Last 30 days trend
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const recent = paid.filter(o => o.created_at >= thirtyDaysAgo)
  const recentRevenue = recent.reduce((s, o) => s + (o.total_amount ?? 0), 0)

  const totalRevenue = paid.reduce((s, o) => s + (o.total_amount ?? 0), 0)
  const totalOrders = paid.length

  return { channels, totalRevenue, totalOrders, recentRevenue, recentOrders: recent.length, allOrders: all.length }
}

// ── Weekly sparkline (last 8 weeks) ──────────────────────────────────────────

async function getWeeklyRevenue() {
  const { data } = await supabaseAdmin
    .from('orders')
    .select('total_amount, created_at')
    .neq('status', 'pending')
    .gte('created_at', new Date(Date.now() - 56 * 24 * 60 * 60 * 1000).toISOString())

  const weeks: number[] = Array(8).fill(0)
  const now = Date.now()
  for (const o of data ?? []) {
    const age = now - new Date(o.created_at).getTime()
    const weekIdx = Math.floor(age / (7 * 24 * 60 * 60 * 1000))
    if (weekIdx < 8) weeks[7 - weekIdx] += o.total_amount ?? 0
  }
  return weeks
}

// ── Product sales volume (units sold per item, from paid orders) ─────────────

interface ProductVolume {
  id: string
  name: string
  units: number
  revenue: number
}

async function getProductVolume(): Promise<ProductVolume[]> {
  const { data } = await supabaseAdmin
    .from('orders')
    .select('selected_items, status')
    .neq('status', 'pending')

  const tally = new Map<string, ProductVolume>()
  for (const order of data ?? []) {
    const items = (order.selected_items ?? []) as Array<{ id: string; name: string; price: number }>
    for (const item of items) {
      if (!item?.id) continue
      const row = tally.get(item.id) ?? { id: item.id, name: item.name ?? item.id, units: 0, revenue: 0 }
      row.units += 1
      row.revenue += item.price ?? 0
      tally.set(item.id, row)
    }
  }

  return Array.from(tally.values()).sort((a, b) => b.units - a.units)
}

// ─── Page ────────────────────────────────────────────────────────────────────

function ScorecardSection({ weeks }: { weeks: WeekMetrics[] }) {
  const fmtPct = (n: number | null) => n == null ? '—' : `${(n * 100).toFixed(1)}%`
  const recentFirst = [...weeks].reverse()
  const current = weeks[weeks.length - 1]
  const weekLabel = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

  return (
    <div className="bg-cream-50 border border-cream-200 rounded-2xl overflow-hidden mb-8">
      <div className="px-6 py-4 border-b border-cream-200">
        <h2 className="font-serif text-xl text-bark-600">Weekly Scorecard</h2>
        <p className="font-sans text-xs text-bark-400 mt-0.5">
          The seven numbers, one row per week (Mon–Sun). Snapshotted every Friday with an email digest — you only write the one sentence.
          {current?.sessions == null && ' Sessions/CVR show once GA_PROPERTY_ID + GA_SERVICE_ACCOUNT_JSON are set.'}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-cream-200">
              {['Week', 'Revenue', 'Orders', 'AOV', 'Sessions', 'CVR', 'Email rev.', 'Repeat', 'Wks stock'].map((h, i) => (
                <th key={h} className={`${i === 0 ? 'text-left px-6' : 'text-right px-4'} py-3 font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 whitespace-nowrap`}>{h}</th>
              ))}
              <th className="text-left px-4 py-3 font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 min-w-[220px]">This week I&rsquo;ll change…</th>
            </tr>
          </thead>
          <tbody>
            {recentFirst.map((w, i) => (
              <tr key={w.weekOf} className={`border-b border-cream-100 ${i === 0 ? 'bg-gold-100/20' : i % 2 === 1 ? 'bg-cream-50/50' : ''}`}>
                <td className="px-6 py-3 font-sans text-xs text-bark-600 whitespace-nowrap">
                  {weekLabel(w.weekOf)}{i === 0 && <span className="ml-2 font-sans text-[9px] tracking-wide uppercase text-gold-500">now</span>}
                </td>
                <td className="px-4 py-3 text-right font-serif text-sm text-bark-600">{fmt(w.revenue)}</td>
                <td className="px-4 py-3 text-right font-sans text-sm text-bark-600">{w.orders}</td>
                <td className="px-4 py-3 text-right font-sans text-xs text-bark-400">{w.orders ? fmt(w.aov) : '—'}</td>
                <td className="px-4 py-3 text-right font-sans text-xs text-bark-400">{w.sessions ?? '—'}</td>
                <td className="px-4 py-3 text-right font-sans text-xs text-bark-400">{fmtPct(w.cvr)}</td>
                <td className="px-4 py-3 text-right font-sans text-xs text-bark-400">{w.emailRevenue ? fmt(w.emailRevenue) : '—'}</td>
                <td className="px-4 py-3 text-right font-sans text-xs text-bark-400">{fmtPct(w.repeatRate)}</td>
                <td className="px-4 py-3 text-right font-sans text-xs text-bark-400">{w.weeksOnHand != null ? w.weeksOnHand.toFixed(1) : '—'}</td>
                <td className="px-4 py-3"><ScorecardNote weekOf={w.weekOf} initial={w.note} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default async function AnalyticsPage() {
  const [analytics, weekly, productVolume, scorecard] = await Promise.all([
    getAnalytics(), getWeeklyRevenue(), getProductVolume(),
    computeWeeklyScorecard(8).catch(() => [] as WeekMetrics[]),
  ])
  const { channels, totalRevenue, totalOrders, recentRevenue, recentOrders } = analytics

  const maxWeek = Math.max(...weekly, 1)
  const maxUnits = Math.max(...productVolume.map(p => p.units), 1)

  const SOURCE_LABELS: Record<string, string> = {
    'facebook': 'Facebook',
    'instagram': 'Instagram',
    'google': 'Google',
    'tiktok': 'TikTok',
    'pinterest': 'Pinterest',
    'email': 'Email',
    'sms': 'SMS',
    '(direct / none)': 'Direct / None',
  }

  return (
    <div className="p-4 sm:p-8">
      <InsightsTabs active="channels" />
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-bark-600">Sales, Channels &amp; Scorecard</h1>
        <p className="font-sans text-sm text-bark-400 mt-1">
          The weekly scorecard up top; first-touch channel attribution below. UTM params captured at first page view.
        </p>
      </div>

      {/* Weekly scorecard — the 7 numbers, one row per week */}
      {scorecard.length > 0 && <ScorecardSection weeks={scorecard} />}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Revenue', value: fmt(totalRevenue), icon: <DollarSign size={20} className="text-gold-400" />, bg: 'bg-gold-100/30' },
          { label: 'Total Orders', value: totalOrders.toString(), icon: <ShoppingBag size={20} className="text-sage-400" />, bg: 'bg-sage-100/30' },
          { label: 'Last 30 Days Revenue', value: fmt(recentRevenue), icon: <TrendingUp size={20} className="text-bark-400" />, bg: 'bg-cream-200/50' },
          { label: 'Last 30 Days Orders', value: recentOrders.toString(), icon: <TrendingUp size={20} className="text-rose-400" />, bg: 'bg-rose-100/20' },
        ].map(({ label, value, icon, bg }) => (
          <div key={label} className={`${bg} rounded-2xl border border-cream-200 p-5`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-sans text-[10px] font-semibold uppercase tracking-wider text-bark-400">{label}</span>
              {icon}
            </div>
            <div className="font-serif text-2xl text-bark-600">{value}</div>
          </div>
        ))}
      </div>

      {/* Weekly revenue chart */}
      <div className="bg-cream-50 border border-cream-200 rounded-2xl p-6 mb-8">
        <h2 className="font-serif text-xl text-bark-600 mb-5">Revenue — Last 8 Weeks</h2>
        <div className="flex items-end gap-2 h-28">
          {weekly.map((val, i) => {
            const height = Math.max(4, Math.round((val / maxWeek) * 100))
            const isLast = i === 7
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div
                  className={`w-full rounded-sm transition-all ${isLast ? 'bg-gold-400' : 'bg-bark-200 group-hover:bg-bark-300'}`}
                  style={{ height: `${height}%` }}
                />
                {val > 0 && (
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-bark-700 text-cream-50 font-sans text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">
                    {fmt(val)}
                  </div>
                )}
                <span className="font-sans text-[9px] text-bark-400">{i === 7 ? 'now' : `–${7 - i}w`}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Channel table */}
      <div className="bg-cream-50 border border-cream-200 rounded-2xl overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-cream-200">
          <h2 className="font-serif text-xl text-bark-600">Revenue by Ad Channel</h2>
          <p className="font-sans text-xs text-bark-400 mt-0.5">Sorted by total revenue. Channels with no UTM = direct traffic, typed URL, or untagged links.</p>
        </div>

        {channels.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-serif text-lg text-bark-400">No attributed orders yet.</p>
            <p className="font-sans text-xs text-bark-400/70 mt-2 max-w-sm mx-auto">
              Add <code className="bg-cream-200 px-1 rounded">?utm_source=facebook&amp;utm_medium=cpc&amp;utm_campaign=spring</code> to your ad links and orders will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-cream-200">
                  <th className="text-left px-6 py-3 font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400">Channel</th>
                  <th className="text-left px-4 py-3 font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400">Medium</th>
                  <th className="text-right px-4 py-3 font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400">Orders</th>
                  <th className="text-right px-4 py-3 font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400">Revenue</th>
                  <th className="text-right px-4 py-3 font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400">Avg Order</th>
                  <th className="text-right px-6 py-3 font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400">Share</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((ch, i) => (
                  <tr key={ch.source} className={`border-b border-cream-100 ${i % 2 === 0 ? '' : 'bg-cream-50/50'}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {/* Revenue bar */}
                        <div className="w-24 h-1.5 bg-cream-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gold-400 rounded-full"
                            style={{ width: pct(ch.revenue, channels[0].revenue) }}
                          />
                        </div>
                        <span className="font-sans text-sm text-bark-600">
                          {SOURCE_LABELS[ch.source.toLowerCase()] ?? ch.source}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-sans text-xs text-bark-400">{ch.medium ?? '—'}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="font-sans text-sm text-bark-600">{ch.orders}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="font-serif text-sm text-bark-600 font-medium">{fmt(ch.revenue)}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="font-sans text-xs text-bark-400">{fmt(ch.avgOrder)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-sans text-xs text-bark-400">{pct(ch.revenue, analytics.totalRevenue)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-cream-300 bg-cream-100/50">
                  <td colSpan={2} className="px-6 py-3 font-sans text-xs font-semibold text-bark-600">Total (paid orders)</td>
                  <td className="px-4 py-3 text-right font-sans text-xs font-semibold text-bark-600">{totalOrders}</td>
                  <td className="px-4 py-3 text-right font-serif text-sm font-medium text-bark-600">{fmt(totalRevenue)}</td>
                  <td className="px-4 py-3 text-right font-sans text-xs text-bark-400">
                    {totalOrders > 0 ? fmt(Math.round(totalRevenue / totalOrders)) : '—'}
                  </td>
                  <td className="px-6 py-3 text-right font-sans text-xs text-bark-400">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Product sales volume */}
      <div className="bg-cream-50 border border-cream-200 rounded-2xl overflow-hidden mb-8">
        <div className="px-4 sm:px-6 py-4 border-b border-cream-200">
          <h2 className="font-serif text-xl text-bark-600">Units Sold by Product</h2>
          <p className="font-sans text-xs text-bark-400 mt-0.5">How many of each item customers have bought across all paid orders. Use this to plan restocks.</p>
        </div>

        {productVolume.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-serif text-lg text-bark-400">No sales yet.</p>
            <p className="font-sans text-xs text-bark-400/70 mt-2">Once orders come in, your best-selling items will rank here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-cream-200">
                  <th className="text-left px-4 sm:px-6 py-3 font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400">Product</th>
                  <th className="text-right px-4 py-3 font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400">Units</th>
                  <th className="text-right px-4 sm:px-6 py-3 font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {productVolume.map((p, i) => (
                  <tr key={p.id} className={`border-b border-cream-100 ${i % 2 === 0 ? '' : 'bg-cream-50/50'}`}>
                    <td className="px-4 sm:px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-16 sm:w-24 h-1.5 bg-cream-200 rounded-full overflow-hidden shrink-0">
                          <div className="h-full bg-sage-400 rounded-full" style={{ width: `${Math.round((p.units / maxUnits) * 100)}%` }} />
                        </div>
                        <span className="font-sans text-sm text-bark-600 leading-tight">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-sans text-sm font-medium text-bark-600">{p.units}</td>
                    <td className="px-4 sm:px-6 py-3 text-right font-serif text-sm text-bark-600">{fmt(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <UTMLinkBuilder />
    </div>
  )
}
