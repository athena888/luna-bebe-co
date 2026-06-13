'use client'

import { useState, useEffect } from 'react'
import { Loader, Check } from 'lucide-react'
import { CURRENCY_SYMBOL, type Currency } from '@/lib/markets'

const CURRENCIES: Currency[] = ['USD', 'GBP', 'EUR']

// Per-currency price editor for one product. USD mirrors the base price (the
// product's existing `price`); GBP/EUR are explicit rows in product_prices —
// a product with no row for a currency is "unavailable" in that market.
export function ProductPrices({ productId, basePriceCents }: { productId: string; basePriceCents: number }) {
  const [rows, setRows] = useState<Record<Currency, { unit_amount: number; active: boolean }>>({} as never)
  const [draft, setDraft] = useState<Record<Currency, string>>({ USD: '', GBP: '', EUR: '' })
  const [saving, setSaving] = useState<Currency | null>(null)
  const [saved, setSaved] = useState<Currency | null>(null)

  useEffect(() => {
    fetch(`/api/portal/product-prices?productId=${encodeURIComponent(productId)}`)
      .then(r => r.json())
      .then(d => {
        const p = (d.prices ?? {}) as Record<Currency, { unit_amount: number; active: boolean }>
        setRows(p)
        setDraft({
          USD: p.USD ? (p.USD.unit_amount / 100).toFixed(2) : (basePriceCents / 100).toFixed(2),
          GBP: p.GBP ? (p.GBP.unit_amount / 100).toFixed(2) : '',
          EUR: p.EUR ? (p.EUR.unit_amount / 100).toFixed(2) : '',
        })
      })
      .catch(() => {})
  }, [productId, basePriceCents])

  async function save(currency: Currency) {
    const val = parseFloat(draft[currency])
    if (!Number.isFinite(val)) return
    setSaving(currency)
    try {
      await fetch('/api/portal/product-prices', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, currency, unitAmount: Math.round(val * 100), active: true }),
      })
      setRows(prev => ({ ...prev, [currency]: { unit_amount: Math.round(val * 100), active: true } }))
      setSaved(currency); setTimeout(() => setSaved(null), 1500)
    } finally { setSaving(null) }
  }

  return (
    <div className="bg-white border border-cream-300 rounded-xl p-4">
      <p className="font-sans text-sm font-medium text-bark-600 mb-1">International prices</p>
      <p className="font-sans text-[11px] text-bark-400 mb-3 leading-relaxed">
        Explicit per-market prices (no FX conversion). A market shows this product only if a price exists for its currency.
        USD mirrors the base price above. GBP/EUR markets are disabled until launched.
      </p>
      <div className="space-y-2">
        {CURRENCIES.map(c => (
          <div key={c} className="flex items-center gap-2">
            <span className="w-10 font-sans text-xs text-bark-500">{c}</span>
            <span className="text-bark-400 text-sm">{CURRENCY_SYMBOL[c]}</span>
            <input
              value={draft[c]}
              onChange={e => setDraft(d => ({ ...d, [c]: e.target.value }))}
              placeholder={c === 'USD' ? 'base price' : 'not sold'}
              inputMode="decimal"
              className="w-28 px-2 py-1.5 border border-cream-300 rounded text-sm text-bark-600 focus:outline-none focus:border-bark-400"
            />
            <button
              onClick={() => save(c)} disabled={saving === c || !draft[c].trim()}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-bark-600 text-white font-sans text-[10px] tracking-[0.15em] uppercase hover:bg-bark-700 disabled:opacity-40"
            >
              {saving === c ? <Loader size={11} className="animate-spin" /> : saved === c ? <Check size={11} /> : null}
              {saved === c ? 'Saved' : 'Save'}
            </button>
            {!rows[c] && c !== 'USD' && <span className="font-sans text-[10px] text-bark-400/70">unavailable in {c}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
