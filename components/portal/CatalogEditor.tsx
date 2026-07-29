'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'

// Phase 6 — Box Products editor. Everything the seed script wrote is editable
// here: product flags (incl. the seasonal hide-not-delete toggle), variant
// prices/baskets/contents, and per-item costs feeding the margin readout
// (warn < 60%, block nothing — the salt-jar depth rule is the only blocker,
// enforced by the API).

interface Item { id: string; name: string; price: number; cost_cents: number | null; category: string; image: string | null; active: boolean }
interface Variant {
  product_slug: string; key: string; label: string; price: number; basket: string
  basket_depth_cm: number | null; adds: string
  contents: Array<{ item_id: string; qty: number; color_choice?: boolean }>
  images: string[]; active: boolean; sort_order: number
}
interface CatalogProduct {
  slug: string; name: string; subtitle: string; variant_label: string
  seasonal: boolean; visible: boolean; active: boolean; sort_order: number
}

const field = "w-full px-3 py-2 border border-cream-300 bg-white rounded-lg font-sans text-sm text-bark-600 focus:outline-none focus:border-bark-400"
const label = "block font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-1.5"

function economicsOf(v: Variant, itemById: Map<string, Item>, packaging: number): { pct: number | null; missing: number; cost: number; retail: number } {
  let cost = 0, missing = 0, retail = 0
  for (const c of v.contents) {
    const item = itemById.get(c.item_id)
    if (!item) continue
    retail += item.price * (c.qty || 1)
    if (!item.cost_cents) { missing++; continue }
    cost += item.cost_cents * (c.qty || 1)
  }
  cost += packaging
  const pct = (missing === v.contents.length || v.price === 0) ? null : Math.round((1 - cost / v.price) * 100)
  return { pct, missing, cost, retail }
}

export function CatalogEditor() {
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [variants, setVariants] = useState<Variant[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [packaging, setPackaging] = useState(850)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  const load = useCallback(() => {
    fetch('/api/portal/catalog').then(r => r.json()).then(d => {
      setProducts(d.products ?? []); setVariants(d.variants ?? []); setItems(d.items ?? [])
      if (typeof d.packaging === 'number') setPackaging(d.packaging)
    }).finally(() => setLoading(false))
  }, [])
  useEffect(load, [load])

  const itemById = new Map(items.map(i => [i.id, i]))

  async function post(payload: Record<string, unknown>): Promise<boolean> {
    const res = await fetch('/api/portal/catalog', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })
    const d = await res.json()
    if (d.error) { window.alert(d.error); return false }
    setMsg('Saved'); setTimeout(() => setMsg(''), 1500)
    return true
  }

  if (loading) return <div className="flex items-center gap-3 font-sans text-sm text-bark-400 py-12"><Loader size={16} className="animate-spin" /> Loading catalog…</div>

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-bark-600">Box Products</h1>
        <p className="font-sans text-sm text-bark-400 mt-1">
          The six parent products on /boxes. Contents lists render on the live product pages and feed checkout —
          prices are in dollars here, margins appear once item costs are filled in below each variant.
        </p>
        {msg && <p className="font-sans text-xs text-sage-700 mt-2">{msg}</p>}
        <div className="flex items-center gap-2 mt-3 font-sans text-xs text-bark-500">
          Per-box packaging (basket + mailer + kraft): $
          <input type="number" step="0.5" defaultValue={packaging / 100}
            onBlur={e => post({ action: 'save-packaging', packaging_cents: Math.round(parseFloat(e.target.value || '0') * 100) }).then(load)}
            className="w-20 px-2 py-1 border border-cream-300 rounded font-sans text-xs text-bark-600 focus:outline-none focus:border-bark-400" />
          <span className="text-bark-400">— included in every margin below</span>
        </div>
      </div>

      <div className="space-y-4">
        {products.map(p => {
          const pv = variants.filter(v => v.product_slug === p.slug).sort((a, b) => a.sort_order - b.sort_order)
          const isOpen = open === p.slug
          return (
            <div key={p.slug} className="bg-white border border-cream-300 rounded-xl">
              <button onClick={() => setOpen(isOpen ? null : p.slug)} className="w-full flex items-center justify-between p-4 text-left">
                <div className="flex items-center gap-3">
                  {isOpen ? <ChevronDown size={15} className="text-bark-400" /> : <ChevronRight size={15} className="text-bark-400" />}
                  <span className="font-serif text-lg text-bark-600">{p.name}</span>
                  <span className="font-sans text-[10px] tracking-[0.15em] uppercase text-bark-400">/boxes/{p.slug} · {pv.length} variant{pv.length !== 1 ? 's' : ''}</span>
                </div>
                <span className={`font-sans text-[10px] tracking-[0.15em] uppercase px-2 py-1 rounded ${p.active ? (p.visible ? 'bg-sage-50 text-sage-700' : 'bg-cream-200 text-bark-500') : 'bg-cream-200 text-bark-400'}`}>
                  {!p.active ? 'Inactive' : p.visible ? 'Live' : 'Hidden (seasonal)'}
                </span>
              </button>

              {isOpen && (
                <div className="px-4 pb-5 border-t border-cream-200 pt-4 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={label}>Name</label>
                      <input defaultValue={p.name} onBlur={e => e.target.value !== p.name && post({ action: 'save-product', slug: p.slug, patch: { name: e.target.value } }).then(load)} className={field} />
                    </div>
                    <div>
                      <label className={label}>French subtitle</label>
                      <input defaultValue={p.subtitle} onBlur={e => e.target.value !== p.subtitle && post({ action: 'save-product', slug: p.slug, patch: { subtitle: e.target.value } }).then(load)} className={field} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button onClick={() => post({ action: 'save-product', slug: p.slug, patch: { active: !p.active } }).then(load)} className="font-sans text-[10px] tracking-[0.15em] uppercase border border-cream-300 px-3 py-2 rounded-lg text-bark-500 hover:border-bark-400">
                      {p.active ? 'Deactivate (page 404s)' : 'Activate'}
                    </button>
                    <button onClick={() => post({ action: 'save-product', slug: p.slug, patch: { visible: !p.visible } }).then(load)} className="font-sans text-[10px] tracking-[0.15em] uppercase border border-cream-300 px-3 py-2 rounded-lg text-bark-500 hover:border-bark-400" title="Removes it from nav + sitemap without deleting the page, so the URL and its reviews persist year to year.">
                      {p.visible ? 'Hide for the season' : 'Restore from hiding'}
                    </button>
                  </div>
                  {p.seasonal && <p className="font-sans text-xs text-bark-400">Seasonal product — &quot;Hide for the season&quot; removes it from nav + sitemap without deleting the page, so the URL and its reviews persist year to year.</p>}

                  {pv.map(v => {
                    const m = economicsOf(v, itemById, packaging)
                    return (
                      <div key={v.key} className="border border-cream-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="font-sans text-sm font-medium text-bark-600">{v.label}</p>
                          <div className="flex items-center gap-3">
                            <span className="font-sans text-[11px] text-bark-400">
                              retail value ${(m.retail / 100).toFixed(0)} · box ${(v.price / 100).toFixed(0)}
                              {m.retail > 0 ? ` (${v.price <= m.retail ? '-' : '+'}${Math.abs(Math.round((1 - v.price / m.retail) * 100))}%)` : ''}
                            </span>
                            {m.pct !== null && (
                              <span className={`font-sans text-[11px] ${m.pct < 60 ? 'text-terra-500' : 'text-sage-700'}`}>
                                cost ${(m.cost / 100).toFixed(2)} incl. pkg → margin ~{m.pct}%{m.missing ? ` (${m.missing} uncosted)` : ''}{m.pct < 60 ? ' — below 60%' : ''}
                              </span>
                            )}
                            {m.pct === null && <span className="font-sans text-[11px] text-bark-400">margin — add item costs</span>}
                            <button onClick={() => window.confirm(`Delete ${v.label}?`) && post({ action: 'delete-variant', product_slug: p.slug, key: v.key }).then(load)} className="text-bark-400 hover:text-terra-500"><Trash2 size={13} /></button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                          <div><label className={label}>Price $</label>
                            <input type="number" defaultValue={v.price / 100} onBlur={e => post({ action: 'save-variant', variant: { ...v, price: Math.round(parseFloat(e.target.value || '0') * 100) } }).then(load)} className={field} /></div>
                          <div><label className={label}>Basket (L×W×D)</label>
                            <input defaultValue={v.basket} onBlur={e => post({ action: 'save-variant', variant: { ...v, basket: e.target.value } }).then(load)} className={field} /></div>
                          <div><label className={label}>Depth cm</label>
                            <input type="number" step="0.5" defaultValue={v.basket_depth_cm ?? ''} onBlur={e => post({ action: 'save-variant', variant: { ...v, basket_depth_cm: parseFloat(e.target.value) || null } }).then(load)} className={field} /></div>
                          <div><label className={label}>&quot;Adds&quot; line</label>
                            <input defaultValue={v.adds} onBlur={e => post({ action: 'save-variant', variant: { ...v, adds: e.target.value } }).then(load)} className={field} /></div>
                        </div>

                        <label className={label}>Contents</label>
                        {v.contents.map((c, ci) => (
                          <div key={ci} className="flex items-center gap-2 mb-2">
                            {(() => { const it = itemById.get(c.item_id); return it?.image
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={it.image} alt="" className="w-9 h-9 shrink-0 object-cover rounded border border-cream-300" />
                              : <span className="w-9 h-9 shrink-0 rounded border border-dashed border-cream-300 flex items-center justify-center font-sans text-[9px] text-bark-300">{itemById.get(c.item_id)?.active === false ? 'draft' : 'no img'}</span> })()}
                            <select value={c.item_id} onChange={e => { const nc = [...v.contents]; nc[ci] = { ...c, item_id: e.target.value }; post({ action: 'save-variant', variant: { ...v, contents: nc } }).then(load) }} className="flex-1 min-w-0 px-3 py-2 border border-cream-300 bg-white rounded-lg font-sans text-sm text-bark-600 focus:outline-none focus:border-bark-400">
                              {items.map(i => <option key={i.id} value={i.id}>{i.name} — ${(i.price / 100).toFixed(0)}{i.active === false ? ' · DRAFT (placeholder, not sold yet)' : ''}</option>)}
                            </select>
                            <input type="number" min="1" value={c.qty} onChange={e => { const nc = [...v.contents]; nc[ci] = { ...c, qty: parseInt(e.target.value) || 1 }; post({ action: 'save-variant', variant: { ...v, contents: nc } }).then(load) }} className="w-16 shrink-0 px-2 py-2 border border-cream-300 bg-white rounded-lg font-sans text-sm text-bark-600 text-center focus:outline-none focus:border-bark-400" />
                            <label className="flex items-center gap-1.5 font-sans text-[10px] uppercase tracking-wide text-bark-400 whitespace-nowrap">
                              <input type="checkbox" checked={!!c.color_choice} onChange={e => { const nc = [...v.contents]; nc[ci] = { ...c, color_choice: e.target.checked }; post({ action: 'save-variant', variant: { ...v, contents: nc } }).then(load) }} className="accent-sage-500" /> color pick
                            </label>
                            <button onClick={() => post({ action: 'save-variant', variant: { ...v, contents: v.contents.filter((_, i2) => i2 !== ci) } }).then(load)} className="text-bark-400 hover:text-terra-500"><Trash2 size={12} /></button>
                          </div>
                        ))}
                        <button onClick={() => post({ action: 'save-variant', variant: { ...v, contents: [...v.contents, { item_id: items[0]?.id, qty: 1 }] } }).then(load)} className="font-sans text-[10px] tracking-[0.15em] uppercase text-bark-500 border border-cream-300 rounded-lg px-3 py-1.5 hover:border-bark-400 flex items-center gap-1.5"><Plus size={11} /> Add item</button>
                      </div>
                    )
                  })}

                  <button
                    onClick={() => {
                      const name = window.prompt(`New ${p.variant_label || 'variant'} name (e.g. "Cherry"):`)
                      if (!name) return
                      const key = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
                      post({ action: 'add-variant', variant: { product_slug: p.slug, key, label: name, price: 14000, basket: '', basket_depth_cm: null, adds: '', contents: [], images: [], active: true, sort_order: pv.length } }).then(ok => ok && load())
                    }}
                    className="font-sans text-[10px] tracking-[0.15em] uppercase text-white bg-[#7A8E7C] hover:bg-[#6d8070] rounded-lg px-4 py-2.5 flex items-center gap-2"
                  >
                    <Plus size={12} /> Add {p.variant_label || 'variant'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-10">
        <h2 className="font-serif text-xl text-bark-600 mb-1">Item costs</h2>
        <p className="font-sans text-xs text-bark-400 mb-4">Wholesale cost per item — feeds the margin readout above. Blank = uncosted.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
          {items.map(i => (
            <div key={i.id} className="flex items-center justify-between gap-3 border-b border-cream-200 py-1.5">
              <span className="font-sans text-xs text-bark-600 truncate">{i.name}</span>
              <div className="flex items-center gap-1 font-sans text-xs text-bark-400">$
                <input type="number" step="0.5" defaultValue={i.cost_cents ? i.cost_cents / 100 : ''} placeholder="—"
                  onBlur={e => post({ action: 'save-item-cost', item_id: i.id, cost_cents: Math.round(parseFloat(e.target.value || '0') * 100) }).then(load)}
                  className="w-20 px-2 py-1 border border-cream-300 rounded font-sans text-xs text-bark-600 focus:outline-none focus:border-bark-400" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
