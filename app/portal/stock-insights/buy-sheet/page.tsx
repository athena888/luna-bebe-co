'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Loader2, Printer, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface ColorStat { color: string; units: number }
interface SizeStat { size: string; units: number }
interface ProductStat {
  id: string; name: string; category: string; image: string | null
  inCatalog: boolean; currentStock: number; sellPrice: number; unitCost: number; margin: number
  units: number; units90: number; revenue: number; profit: number
  byColor: ColorStat[]; bySize: SizeStat[]; byMonth: number[]
}

interface Rec {
  p: ProductStat
  recommended: number
  seasonalDemand: number
  colors: { color: string; qty: number }[]
  sizes: { size: string; qty: number }[]
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Split a total into parts by a historical mix; default 60/40 across 0-3/3-6 when no size data
function splitByMix(total: number, mix: { key: string; units: number }[], fallback: { key: string; weight: number }[]) {
  if (total <= 0) return []
  const base = mix.length > 0 && mix.some(m => m.units > 0)
    ? mix.map(m => ({ key: m.key, weight: m.units }))
    : fallback
  const sum = base.reduce((s, b) => s + b.weight, 0) || 1
  let assigned = 0
  const out = base.map((b, i) => {
    const isLast = i === base.length - 1
    const qty = isLast ? total - assigned : Math.round(total * (b.weight / sum))
    assigned += qty
    return { key: b.key, qty }
  })
  return out.filter(o => o.qty > 0)
}

export default function BuySheetPage() {
  const [products, setProducts] = useState<ProductStat[]>([])
  const [monthLabels, setMonthLabels] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/portal/inventory/analytics')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setProducts(d.products); setMonthLabels(d.monthLabels) } })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Upcoming 3 calendar months from today
  const now = new Date()
  const upcoming = [0, 1, 2].map(i => MONTHS[(now.getMonth() + i) % 12])
  const seasonLabel = `${upcoming[0]}–${upcoming[2]} ${now.getFullYear()}`

  // Build recommendations
  const recs: Rec[] = products.map(p => {
    // seasonal demand: historical units in the same upcoming calendar months
    let seasonalDemand = 0
    p.byMonth.forEach((units, i) => {
      if (upcoming.includes(monthLabels[i])) seasonalDemand += units
    })
    // expected = higher of seasonal history or recent 90-day velocity
    const expected = Math.max(seasonalDemand, p.units90)
    const recommended = Math.max(0, expected - p.currentStock)
    const colorParts = splitByMix(
      recommended,
      p.byColor.map(c => ({ key: c.color, units: c.units })),
      [{ key: 'Assorted', weight: 1 }]
    )
    const sizeParts = splitByMix(
      recommended,
      p.bySize.map(s => ({ key: s.size, units: s.units })),
      [{ key: '0-3', weight: 60 }, { key: '3-6', weight: 40 }]
    )
    return {
      p, recommended, seasonalDemand,
      colors: colorParts.map(c => ({ color: c.key, qty: c.qty })),
      sizes: sizeParts.map(s => ({ size: s.key, qty: s.qty })),
    }
  }).filter(r => r.recommended > 0)
    .sort((a, b) => b.recommended - a.recommended)

  const totalUnits = recs.reduce((s, r) => s + r.recommended, 0)
  const totalCost = recs.reduce((s, r) => s + r.recommended * (r.p.unitCost / 100), 0)

  if (loading) return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
      <Loader2 size={36} className="text-gold-400 animate-spin mb-4" />
      <p className="font-sans text-sm text-bark-400">Building your suggested buy sheet…</p>
    </div>
  )

  return (
    <div className="bg-white min-h-screen">
      {/* Toolbar — hidden when printing */}
      <div className="print:hidden sticky top-0 z-10 flex items-center justify-between gap-3 px-6 py-3 bg-cream-50 border-b border-cream-200">
        <Link href="/portal/stock-insights" className="flex items-center gap-1.5 font-sans text-sm text-bark-500 hover:text-bark-700">
          <ArrowLeft size={16} /> Back to Stock Insights
        </Link>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-bark-600 text-white font-sans text-[11px] tracking-[0.2em] uppercase px-5 py-2.5 rounded hover:bg-bark-700 transition-colors"
        >
          <Printer size={14} /> Save as PDF / Print
        </button>
      </div>

      {/* Printable sheet */}
      <div className="max-w-4xl mx-auto px-8 py-8 print:px-0 print:py-0">
        <div className="text-center mb-6">
          <p className="font-sans text-[10px] tracking-[0.4em] uppercase text-gold-500 mb-1">Petite Lavande</p>
          <h1 className="font-serif text-3xl text-bark-700">Suggested Buy Sheet</h1>
          <p className="font-sans text-sm text-bark-400 mt-1">Restock plan for <strong>{seasonLabel}</strong> · generated {now.toLocaleDateString()}</p>
        </div>

        <div className="flex justify-center gap-8 mb-6 text-center">
          <div>
            <p className="font-serif text-2xl text-bark-700">{recs.length}</p>
            <p className="font-sans text-[10px] uppercase tracking-wider text-bark-400">products to restock</p>
          </div>
          <div>
            <p className="font-serif text-2xl text-bark-700">{totalUnits}</p>
            <p className="font-sans text-[10px] uppercase tracking-wider text-bark-400">total units</p>
          </div>
          <div>
            <p className="font-serif text-2xl text-bark-700">${totalCost.toFixed(2)}</p>
            <p className="font-sans text-[10px] uppercase tracking-wider text-bark-400">est. purchase cost</p>
          </div>
        </div>

        {recs.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-serif text-xl text-bark-400">You&rsquo;re well stocked for {seasonLabel}.</p>
            <p className="font-sans text-sm text-bark-400/70 mt-2">No products are projected to run short this season based on recent and seasonal demand.</p>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-y-2 border-bark-200 bg-cream-50">
                <th className="text-left px-2 py-2 font-sans text-[10px] uppercase tracking-wider text-bark-500">Photo</th>
                <th className="text-left px-2 py-2 font-sans text-[10px] uppercase tracking-wider text-bark-500">Product ID</th>
                <th className="text-left px-2 py-2 font-sans text-[10px] uppercase tracking-wider text-bark-500">Name</th>
                <th className="text-left px-2 py-2 font-sans text-[10px] uppercase tracking-wider text-bark-500">Colors</th>
                <th className="text-left px-2 py-2 font-sans text-[10px] uppercase tracking-wider text-bark-500">Sizes</th>
                <th className="text-center px-2 py-2 font-sans text-[10px] uppercase tracking-wider text-bark-500">In stock</th>
                <th className="text-center px-2 py-2 font-sans text-[10px] uppercase tracking-wider text-bark-500">Buy</th>
              </tr>
            </thead>
            <tbody>
              {recs.map(r => (
                <tr key={r.p.id} className="border-b border-cream-200 align-top">
                  <td className="px-2 py-3">
                    {r.p.image ? (
                      <div className="relative w-14 h-14 rounded overflow-hidden bg-cream-100">
                        <Image src={r.p.image} alt={r.p.name} fill className="object-cover" unoptimized />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded bg-cream-100 flex items-center justify-center text-xl">📦</div>
                    )}
                  </td>
                  <td className="px-2 py-3 font-mono text-[11px] text-bark-500">{r.p.id}</td>
                  <td className="px-2 py-3 font-sans text-sm text-bark-700">{r.p.name}</td>
                  <td className="px-2 py-3">
                    {r.colors.length > 0 ? (
                      <div className="space-y-0.5">
                        {r.colors.map(c => (
                          <p key={c.color} className="font-sans text-[11px] text-bark-600">{c.color}: <strong>{c.qty}</strong></p>
                        ))}
                      </div>
                    ) : <span className="font-sans text-[11px] text-bark-400">—</span>}
                  </td>
                  <td className="px-2 py-3">
                    {r.sizes.length > 0 ? (
                      <div className="space-y-0.5">
                        {r.sizes.map(s => (
                          <p key={s.size} className="font-sans text-[11px] text-bark-600">{s.size}: <strong>{s.qty}</strong></p>
                        ))}
                      </div>
                    ) : <span className="font-sans text-[11px] text-bark-400">—</span>}
                  </td>
                  <td className="px-2 py-3 text-center font-sans text-sm text-bark-500">{r.p.currentStock}</td>
                  <td className="px-2 py-3 text-center">
                    <span className="font-serif text-lg text-bark-700">{r.recommended}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="mt-6 pt-4 border-t border-cream-200">
          <p className="font-sans text-[10px] text-bark-400 leading-relaxed">
            <strong>How these are calculated:</strong> For each product we estimate demand for {seasonLabel} as the higher of
            (a) units sold in those same calendar months historically, and (b) recent 90-day velocity. We subtract current stock
            to get the suggested buy quantity, then split it across colors and sizes using each product&rsquo;s historical sales mix
            (defaulting to a 60/40 split across 0-3 / 3-6 when no size history exists). Confirm safety certifications before ordering.
          </p>
        </div>
      </div>
    </div>
  )
}
