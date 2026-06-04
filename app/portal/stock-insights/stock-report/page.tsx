'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Loader2, Printer, ArrowLeft } from 'lucide-react'

interface Row {
  productId: string; name: string; image: string | null
  color: string; color_code: string; color_hex: string | null; style: string; size: string
  quantity: number; sell: number; cost: number; ratio: number | null
}

function fmt(cents: number) { return cents ? `$${(cents / 100).toFixed(2)}` : '—' }

export default function StockReportPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/portal/inventory/stock-report')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.rows) setRows(d.rows) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const now = new Date()
  const totalUnits = rows.reduce((s, r) => s + r.quantity, 0)
  const stockCost = rows.reduce((s, r) => s + r.quantity * (r.cost / 100), 0)
  const stockRetail = rows.reduce((s, r) => s + r.quantity * (r.sell / 100), 0)

  if (loading) return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
      <Loader2 size={36} className="text-gold-400 animate-spin mb-4" />
      <p className="font-sans text-sm text-bark-400">Building stock report…</p>
    </div>
  )

  return (
    <div className="bg-white min-h-screen">
      <div className="print:hidden sticky top-0 z-10 flex items-center justify-between gap-3 px-6 py-3 bg-cream-50 border-b border-cream-200">
        <Link href="/portal/stock-insights" className="flex items-center gap-1.5 font-sans text-sm text-bark-500 hover:text-bark-700">
          <ArrowLeft size={16} /> Back to Stock Insights
        </Link>
        <button onClick={() => window.print()} className="flex items-center gap-2 bg-bark-600 text-white font-sans text-[11px] tracking-[0.2em] uppercase px-5 py-2.5 rounded hover:bg-bark-700 transition-colors">
          <Printer size={14} /> Save as PDF / Print
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8 print:px-0">
        <div className="text-center mb-6">
          <p className="font-sans text-[10px] tracking-[0.4em] uppercase text-gold-500 mb-1">Petite Lavande</p>
          <h1 className="font-serif text-3xl text-bark-700">Current Stock Report</h1>
          <p className="font-sans text-sm text-bark-400 mt-1">{rows.length} variants · {totalUnits} units · generated {now.toLocaleDateString()}</p>
          <p className="font-sans text-xs text-bark-400 mt-1">Stock at cost: <strong>${stockCost.toFixed(2)}</strong> · at retail: <strong>${stockRetail.toFixed(2)}</strong></p>
        </div>

        {rows.length === 0 ? (
          <p className="text-center py-16 font-serif text-xl text-bark-400">No variants in stock yet.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-y-2 border-bark-200 bg-cream-50">
                <th className="text-left px-2 py-2 font-sans text-[10px] uppercase tracking-wider text-bark-500">Photo</th>
                <th className="text-left px-2 py-2 font-sans text-[10px] uppercase tracking-wider text-bark-500">Product</th>
                <th className="text-left px-2 py-2 font-sans text-[10px] uppercase tracking-wider text-bark-500">Color</th>
                <th className="text-left px-2 py-2 font-sans text-[10px] uppercase tracking-wider text-bark-500">Style</th>
                <th className="text-left px-2 py-2 font-sans text-[10px] uppercase tracking-wider text-bark-500">Size</th>
                <th className="text-center px-2 py-2 font-sans text-[10px] uppercase tracking-wider text-bark-500">Qty</th>
                <th className="text-right px-2 py-2 font-sans text-[10px] uppercase tracking-wider text-bark-500">Sell</th>
                <th className="text-right px-2 py-2 font-sans text-[10px] uppercase tracking-wider text-bark-500">Cost</th>
                <th className="text-right px-2 py-2 font-sans text-[10px] uppercase tracking-wider text-bark-500">Sell÷Cost</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-cream-200">
                  <td className="px-2 py-2">
                    {r.image
                      ? <div className="relative w-11 h-11 rounded overflow-hidden bg-cream-100"><Image src={r.image} alt={r.name} fill className="object-cover" unoptimized /></div>
                      : <div className="w-11 h-11 rounded bg-cream-100" />}
                  </td>
                  <td className="px-2 py-2 font-sans text-xs text-bark-700">{r.name}</td>
                  <td className="px-2 py-2 font-sans text-xs text-bark-600">
                    <span className="inline-flex items-center gap-1.5">
                      {r.color_hex && <span className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: r.color_hex }} />}
                      {r.color}{r.color_code ? ` (${r.color_code})` : ''}
                    </span>
                  </td>
                  <td className="px-2 py-2 font-sans text-xs text-bark-600">{r.style || '—'}</td>
                  <td className="px-2 py-2 font-sans text-xs text-bark-600">{r.size}</td>
                  <td className="px-2 py-2 text-center font-sans text-xs text-bark-700">{r.quantity}</td>
                  <td className="px-2 py-2 text-right font-sans text-xs text-bark-600">{fmt(r.sell)}</td>
                  <td className="px-2 py-2 text-right font-sans text-xs text-bark-600">{fmt(r.cost)}</td>
                  <td className="px-2 py-2 text-right font-sans text-xs font-medium text-bark-700">{r.ratio ? `${r.ratio.toFixed(2)}×` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="font-sans text-[10px] text-bark-400 mt-4">Sell÷Cost shows your markup multiple (e.g. 3.00× means retail is 3× your unit cost). Sell price is the product&rsquo;s retail; cost is the per-unit cost recorded on the variant.</p>
      </div>
    </div>
  )
}
