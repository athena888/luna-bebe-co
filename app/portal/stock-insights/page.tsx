'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { LineChart, Loader2, TrendingUp, Package, Search, FileText } from 'lucide-react'

interface ColorStat { color: string; units: number }
interface SizeStat { size: string; units: number }
interface ProductStat {
  id: string
  name: string
  category: string
  image: string | null
  inCatalog: boolean
  currentStock: number
  sellPrice: number   // cents
  unitCost: number    // cents
  margin: number      // %
  units: number
  units90: number
  revenue: number     // cents
  profit: number      // cents
  byColor: ColorStat[]
  bySize: SizeStat[]
  byMonth: number[]   // 12 months
}

function fmt(cents: number) { return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}` }

// A tiny 12-month bar sparkline to show seasonality
function Sparkline({ data, labels }: { data: number[]; labels: string[] }) {
  const max = Math.max(...data, 1)
  return (
    <div className="flex items-end gap-[3px] h-12">
      {data.map((v, i) => {
        const peak = v === max && v > 0
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
            <div
              className={`w-full rounded-sm transition-all ${peak ? 'bg-gold-400' : 'bg-bark-200 group-hover:bg-bark-300'}`}
              style={{ height: `${Math.max(3, Math.round((v / max) * 100))}%` }}
            />
            {v > 0 && (
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-bark-700 text-cream-50 text-[9px] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity z-10">
                {labels[i]}: {v}
              </div>
            )}
            <span className="text-[7px] text-bark-300">{labels[i][0]}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function StockInsightsPage() {
  const [products, setProducts] = useState<ProductStat[]>([])
  const [monthLabels, setMonthLabels] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'units' | 'units90' | 'revenue' | 'profit' | 'stock'>('units90')

  useEffect(() => {
    fetch('/api/portal/inventory/analytics')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setProducts(d.products); setMonthLabels(d.monthLabels) } })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = products
    .filter(p => !search.trim() || `${p.name} ${p.id} ${p.category}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'units') return b.units - a.units
      if (sort === 'units90') return b.units90 - a.units90
      if (sort === 'revenue') return b.revenue - a.revenue
      if (sort === 'profit') return b.profit - a.profit
      return b.currentStock - a.currentStock
    })

  const totals = products.reduce(
    (s, p) => ({ units: s.units + p.units, revenue: s.revenue + p.revenue, profit: s.profit + p.profit, stock: s.stock + p.currentStock }),
    { units: 0, revenue: 0, profit: 0, stock: 0 }
  )

  if (loading) return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
      <Loader2 size={36} className="text-gold-400 animate-spin mb-4" />
      <p className="font-sans text-sm text-bark-400">Loading inventory history…</p>
    </div>
  )

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-bark-600 flex items-center gap-2"><LineChart size={26} className="text-gold-400" /> Stock Insights</h1>
          <p className="font-sans text-sm text-bark-400 mt-1 max-w-2xl">
            Every product that has ever sold or exists in your catalog — with photo, units sold (all-time &amp; last 90 days),
            color &amp; size breakdown, profit, and month-by-month seasonality to help you restock the right styles at the right time of year.
          </p>
        </div>
        <Link
          href="/portal/stock-insights/buy-sheet"
          target="_blank"
          className="shrink-0 flex items-center gap-2 bg-gold-400 text-white font-sans text-[11px] tracking-[0.2em] uppercase px-5 py-3 rounded hover:bg-gold-500 transition-colors whitespace-nowrap"
        >
          <FileText size={15} /> Generate Buy Sheet
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Units Sold', value: totals.units.toString(), icon: <Package size={18} className="text-sage-400" /> },
          { label: 'Total Revenue', value: fmt(totals.revenue), icon: <TrendingUp size={18} className="text-gold-400" /> },
          { label: 'Est. Gross Profit', value: fmt(totals.profit), icon: <TrendingUp size={18} className="text-bark-400" /> },
          { label: 'Units In Stock', value: totals.stock.toString(), icon: <Package size={18} className="text-rose-400" /> },
        ].map(c => (
          <div key={c.label} className="bg-cream-50 rounded-2xl border border-cream-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="font-sans text-[10px] font-semibold uppercase tracking-wider text-bark-400">{c.label}</span>
              {c.icon}
            </div>
            <div className="font-serif text-2xl text-bark-600">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-bark-300" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products…"
            className="w-full pl-9 pr-3 py-2 border border-cream-300 rounded-lg text-sm text-bark-600 focus:outline-none focus:border-bark-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-sans text-[10px] uppercase tracking-widest text-bark-400">Sort by</span>
          <select
            value={sort}
            onChange={e => setSort(e.target.value as typeof sort)}
            className="border border-cream-300 rounded-lg px-3 py-2 text-sm text-bark-600 focus:outline-none focus:border-bark-400"
          >
            <option value="units90">Sold last 90 days</option>
            <option value="units">Sold all-time</option>
            <option value="revenue">Revenue</option>
            <option value="profit">Profit</option>
            <option value="stock">Current stock</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-cream-50 border border-cream-200 rounded-2xl p-12 text-center">
          <p className="font-serif text-lg text-bark-400">No products to show yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(p => (
            <div key={p.id} className="bg-white border border-cream-200 rounded-2xl p-4 sm:p-5">
              <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] gap-4 lg:gap-6 items-start">

                {/* Photo + identity */}
                <div className="flex gap-3 items-center">
                  {p.image ? (
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-cream-100 shrink-0">
                      <Image src={p.image} alt={p.name} fill className="object-cover" unoptimized />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-cream-100 flex items-center justify-center text-2xl shrink-0">📦</div>
                  )}
                  <div className="min-w-0">
                    <p className="font-sans text-sm font-medium text-bark-600 leading-tight">{p.name}</p>
                    <p className="font-sans text-[10px] text-bark-400">{p.category}</p>
                    {!p.inCatalog && <p className="font-sans text-[10px] text-amber-600 mt-0.5">archived / not in catalog</p>}
                    <p className="font-sans text-[10px] text-bark-400 mt-1">
                      {p.currentStock} in stock · {p.sellPrice > 0 ? `${fmt(p.sellPrice)} retail` : 'no price'}
                      {p.unitCost > 0 && ` · ${p.margin}% margin`}
                    </p>
                  </div>
                </div>

                {/* Color + size breakdown */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-sans text-[9px] tracking-[0.15em] uppercase text-bark-400 mb-1.5">Sold by color</p>
                    {p.byColor.length === 0 ? (
                      <p className="font-sans text-[11px] text-bark-300">No color data</p>
                    ) : (
                      <div className="space-y-1">
                        {p.byColor.slice(0, 4).map(c => {
                          const max = p.byColor[0].units || 1
                          return (
                            <div key={c.color} className="flex items-center gap-2">
                              <span className="font-sans text-[11px] text-bark-500 w-20 truncate">{c.color}</span>
                              <div className="flex-1 h-1.5 bg-cream-200 rounded-full overflow-hidden">
                                <div className="h-full bg-sage-400 rounded-full" style={{ width: `${Math.round((c.units / max) * 100)}%` }} />
                              </div>
                              <span className="font-sans text-[11px] text-bark-500 w-6 text-right">{c.units}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-sans text-[9px] tracking-[0.15em] uppercase text-bark-400 mb-1.5">Sold by size</p>
                    {p.bySize.length === 0 ? (
                      <p className="font-sans text-[11px] text-bark-300">No size data</p>
                    ) : (
                      <div className="space-y-1">
                        {p.bySize.slice(0, 4).map(s => {
                          const max = p.bySize[0].units || 1
                          return (
                            <div key={s.size} className="flex items-center gap-2">
                              <span className="font-sans text-[11px] text-bark-500 w-12">{s.size}</span>
                              <div className="flex-1 h-1.5 bg-cream-200 rounded-full overflow-hidden">
                                <div className="h-full bg-gold-400 rounded-full" style={{ width: `${Math.round((s.units / max) * 100)}%` }} />
                              </div>
                              <span className="font-sans text-[11px] text-bark-500 w-6 text-right">{s.units}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Numbers + seasonality */}
                <div className="lg:w-56">
                  <div className="flex gap-4 mb-2">
                    <div>
                      <p className="font-serif text-xl text-bark-600">{p.units90}</p>
                      <p className="font-sans text-[9px] uppercase tracking-wider text-bark-400">sold / 90d</p>
                    </div>
                    <div>
                      <p className="font-serif text-xl text-bark-600">{p.units}</p>
                      <p className="font-sans text-[9px] uppercase tracking-wider text-bark-400">all-time</p>
                    </div>
                    <div>
                      <p className="font-serif text-xl text-bark-600">{fmt(p.profit)}</p>
                      <p className="font-sans text-[9px] uppercase tracking-wider text-bark-400">profit</p>
                    </div>
                  </div>
                  <Sparkline data={p.byMonth} labels={monthLabels} />
                  <p className="font-sans text-[9px] text-bark-300 mt-0.5 text-center">Units sold per month (last 12)</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="font-sans text-xs text-bark-400 mt-6 max-w-2xl">
        Color &amp; size breakdowns come from what customers actually selected at checkout. The seasonality bars highlight the
        peak month in gold — use them to spot which styles and colors sell at which time of year, and pre-order before the next peak.
        Profit is approximate: (retail − unit cost) × units sold.
      </p>
    </div>
  )
}
