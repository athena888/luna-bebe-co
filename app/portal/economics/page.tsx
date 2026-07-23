'use client'

import { useEffect, useMemo, useState } from 'react'
import { InsightsTabs } from '@/components/portal/InsightsTabs'

// Unit economics: editable cost fields per SKU, live-computed contribution,
// breakeven ROAS and CAC ceiling. Site channel = Stripe fee (2.9% + 30¢);
// Etsy channel = 9.5% flat (transaction + processing).

type CatalogProduct = { id: string; name: string; price: number; category: string; active?: boolean }
type EconRow = {
  sku_id: string
  channel: 'site' | 'etsy'
  retail_price: number | null
  landed_cost: number
  packaging_cost: number
  fulfillment_cost: number
}

const emptyRow = (sku_id: string, channel: 'site' | 'etsy'): EconRow =>
  ({ sku_id, channel, retail_price: null, landed_cost: 0, packaging_cost: 0, fulfillment_cost: 0 })

function fee(retail: number, channel: 'site' | 'etsy') {
  return channel === 'site' ? Math.round(retail * 0.029) + 30 : Math.round(retail * 0.095)
}
function fmt(cents: number) { return `$${(cents / 100).toFixed(2)}` }

// Dollar input backed by cents. Commits on blur/Enter.
function MoneyCell({ cents, onCommit, placeholder }: { cents: number | null; onCommit: (cents: number | null) => void; placeholder?: string }) {
  const [text, setText] = useState(cents == null ? '' : (cents / 100).toFixed(2))
  useEffect(() => { setText(cents == null ? '' : (cents / 100).toFixed(2)) }, [cents])
  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      placeholder={placeholder ?? '0.00'}
      onChange={e => setText(e.target.value)}
      onBlur={() => {
        const v = text.trim()
        onCommit(v === '' ? null : Math.max(0, Math.round(parseFloat(v) * 100) || 0))
      }}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
      className="w-20 px-2 py-1 text-right border border-cream-300 bg-cream-50 font-sans text-xs text-bark-600 focus:outline-none focus:border-gold-400 transition-colors"
    />
  )
}

export default function EconomicsPage() {
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [rows, setRows] = useState<Map<string, EconRow>>(new Map())
  const [suggested, setSuggested] = useState<Record<string, number>>({})
  const channel = 'site' as const
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    fetch('/api/portal/economics')
      .then(r => r.json())
      .then(d => {
        setProducts(d.products ?? [])
        setSuggested(d.suggestedCost ?? {})
        const map = new Map<string, EconRow>()
        for (const r of (d.econ ?? []) as EconRow[]) map.set(`${r.sku_id}:${r.channel}`, r)
        setRows(map)
        if ((d.products ?? []).length > 0 && !Array.isArray(d.econ)) {
          setNotice('Cost rows will save once migration §31 (sku_economics) is run.')
        }
      })
      .catch(() => setNotice('Failed to load — refresh to retry.'))
      .finally(() => setLoading(false))
  }, [])

  function rowFor(p: CatalogProduct): EconRow {
    return rows.get(`${p.id}:${channel}`) ?? emptyRow(p.id, channel)
  }

  async function saveRow(next: EconRow) {
    setRows(prev => new Map(prev).set(`${next.sku_id}:${next.channel}`, next))
    const res = await fetch('/api/portal/economics', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    })
    if (!res.ok) setNotice('Save failed — is migration §31 run?')
  }

  const computed = useMemo(() => products.map(p => {
    const r = rowFor(p)
    const retail = r.retail_price ?? p.price
    const costs = r.landed_cost + r.packaging_cost + r.fulfillment_cost
    const f = retail > 0 ? fee(retail, channel) : 0
    const contribution = retail - costs - f
    const hasCosts = costs > 0
    return {
      p, r, retail, fee: f, contribution,
      margin: retail > 0 ? contribution / retail : null,
      breakevenRoas: contribution > 0 ? retail / contribution : null,
      cacCeiling: contribution > 0 ? Math.round(contribution * 0.35) : null,
      hasCosts,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [products, rows, channel])

  const withCosts = computed.filter(c => c.hasCosts && c.contribution > 0)
  const avg = (ns: number[]) => ns.length ? ns.reduce((s, n) => s + n, 0) / ns.length : null
  const summary = {
    margin: avg(withCosts.map(c => c.margin!).filter(n => n != null)),
    roas: avg(withCosts.map(c => c.breakevenRoas!).filter(n => n != null)),
    cac: avg(withCosts.map(c => c.cacCeiling!).filter(n => n != null)),
  }

  return (
    <div className="p-4 sm:p-8">
      <InsightsTabs active="economics" />
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-bark-600">Unit Economics</h1>
        <p className="font-sans text-sm text-bark-400 mt-1">
          Change a cost, watch margin, breakeven ROAS and the CAC ceiling move. Fees: Stripe 2.9% + 30¢.
        </p>
        {notice && <p className="font-sans text-xs text-rose-400 mt-2">{notice}</p>}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Avg contribution margin', value: summary.margin != null ? `${(summary.margin * 100).toFixed(1)}%` : '—' },
          { label: 'Avg breakeven ROAS', value: summary.roas != null ? `${summary.roas.toFixed(2)}×` : '—' },
          { label: 'Avg CAC ceiling (35%)', value: summary.cac != null ? fmt(Math.round(summary.cac)) : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-cream-50 rounded-2xl border border-cream-200 p-5">
            <p className="font-sans text-[10px] font-semibold uppercase tracking-wider text-bark-400 mb-2">{label}</p>
            <p className="font-serif text-2xl text-bark-600">{value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <p className="font-sans text-sm text-bark-400">Loading…</p>
      ) : (
        <div className="bg-cream-50 border border-cream-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-cream-200">
                  <th className="text-left px-6 py-3 font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400">Product</th>
                  {['Retail', 'Landed', 'Packaging', 'Fulfillment', 'Fee', 'Contribution', 'Margin', 'B/E ROAS', 'CAC ceiling'].map(h => (
                    <th key={h} className="text-right px-3 py-3 font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {computed.map(({ p, r, retail, fee: f, contribution, margin, breakevenRoas, cacCeiling, hasCosts }, i) => (
                  <tr key={p.id} className={`border-b border-cream-100 ${i % 2 === 1 ? 'bg-cream-50/50' : ''}`}>
                    <td className="px-6 py-2">
                      <span className="font-sans text-sm text-bark-600">{p.name}</span>
                      {p.active === false && <span className="ml-2 font-sans text-[9px] tracking-[0.1em] uppercase px-1.5 py-0.5 rounded bg-cream-200 text-bark-400">draft</span>}
                      {r.landed_cost === 0 && suggested[p.id] != null && (
                        <button
                          onClick={() => saveRow({ ...r, landed_cost: suggested[p.id] })}
                          className="ml-2 font-sans text-[10px] text-gold-500 hover:text-gold-600 underline underline-offset-2"
                          title="Use the average variant unit cost from inventory"
                        >
                          use cost {fmt(suggested[p.id])}
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <MoneyCell cents={r.retail_price} placeholder={(p.price / 100).toFixed(2)} onCommit={v => saveRow({ ...r, retail_price: v })} />
                    </td>
                    <td className="px-3 py-2 text-right"><MoneyCell cents={r.landed_cost} onCommit={v => saveRow({ ...r, landed_cost: v ?? 0 })} /></td>
                    <td className="px-3 py-2 text-right"><MoneyCell cents={r.packaging_cost} onCommit={v => saveRow({ ...r, packaging_cost: v ?? 0 })} /></td>
                    <td className="px-3 py-2 text-right"><MoneyCell cents={r.fulfillment_cost} onCommit={v => saveRow({ ...r, fulfillment_cost: v ?? 0 })} /></td>
                    <td className="px-3 py-2 text-right font-sans text-xs text-bark-400">{retail > 0 ? fmt(f) : '—'}</td>
                    <td className={`px-3 py-2 text-right font-serif text-sm ${contribution < 0 ? 'text-rose-400' : 'text-bark-600'}`}>
                      {hasCosts ? fmt(contribution) : '—'}
                    </td>
                    <td className={`px-3 py-2 text-right font-sans text-xs ${margin != null && margin < 0.3 && hasCosts ? 'text-rose-400' : 'text-bark-400'}`}>
                      {hasCosts && margin != null ? `${(margin * 100).toFixed(1)}%` : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-sans text-xs text-bark-400">{hasCosts && breakevenRoas != null ? `${breakevenRoas.toFixed(2)}×` : '—'}</td>
                    <td className="px-3 py-2 text-right font-sans text-xs text-bark-400">{hasCosts && cacCeiling != null ? fmt(cacCeiling) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 border-t border-cream-200">
            <p className="font-sans text-[11px] text-bark-400">
              Retail defaults to the live product price — override it here without touching the store. Costs save automatically on blur, per channel.
              Contribution = retail − costs − fee. Breakeven ROAS = retail ÷ contribution. CAC ceiling = 35% of contribution.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
