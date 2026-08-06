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

function economicsOf(v: Variant, itemById: Map<string, Item>, packaging: number, labelCost: number): { pct: number | null; worst: number | null; missing: number; cost: number; retail: number } {
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
  const worst = pct === null ? null : Math.round((1 - (cost + labelCost) / v.price) * 100)
  return { pct, worst, missing, cost, retail }
}


// Custom item picker — native <select> options can't render images, so the
// open list is our own: thumbnail + name + price per row, searchable.
function ItemPicker({ items, value, onChange }: { items: Item[]; value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const current = items.find(i => i.id === value)
  const shown = q.trim() ? items.filter(i => i.name.toLowerCase().includes(q.trim().toLowerCase())) : items
  const thumb = (i: Item | undefined, size: string) => i?.image
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={i.image} alt="" className={`${size} shrink-0 object-cover rounded border border-cream-300`} />
    : <span className={`${size} shrink-0 rounded border border-dashed border-cream-300 flex items-center justify-center font-sans text-[8px] text-bark-300`}>{i?.active === false ? 'draft' : 'no img'}</span>
  return (
    <div className="relative flex-1 min-w-0">
      <button type="button" onClick={() => { setOpen(o => !o); setQ('') }}
        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 border border-cream-300 bg-white rounded-lg font-sans text-sm text-bark-600 hover:border-bark-400 transition-colors text-left">
        {thumb(current, 'w-8 h-8')}
        <span className="flex-1 truncate">{current?.name ?? 'Pick an item'}</span>
        {current?.active === false && <span className="shrink-0 text-[10px] uppercase text-bark-400">draft</span>}
        <ChevronDown size={13} className="shrink-0 text-bark-400" />
      </button>
      {open && (
        <>
          <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="fixed inset-0 z-30 cursor-default" tabIndex={-1} />
          <div className="absolute z-40 top-full left-0 right-0 mt-1 bg-white border border-cream-300 rounded-lg shadow-lg max-h-80 overflow-y-auto">
            <div className="sticky top-0 bg-white p-2 border-b border-cream-200">
              <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search items…"
                className="w-full px-2.5 py-1.5 border border-cream-300 rounded font-sans text-xs text-bark-600 focus:outline-none focus:border-bark-400" />
            </div>
            {shown.map(i => (
              <button key={i.id} type="button" onClick={() => { onChange(i.id); setOpen(false) }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-left hover:bg-cream-100 transition-colors ${i.id === value ? 'bg-cream-100' : ''}`}>
                {thumb(i, 'w-9 h-9')}
                <span className="flex-1 font-sans text-[13px] text-bark-600 truncate">{i.name}</span>
                <span className="shrink-0 font-sans text-[11px] text-bark-400">${(i.price / 100).toFixed(0)}{i.active === false ? ' · DRAFT' : ''}</span>
              </button>
            ))}
            {shown.length === 0 && <p className="px-3 py-3 font-sans text-xs text-bark-400">No items match.</p>}
          </div>
        </>
      )}
    </div>
  )
}


// AI naming assistant — French name options + fairy-tale description from the
// box's actual items, with an optional direction from Emily.
function NameAssistant({ itemNames, onPick }: { itemNames: string[]; onPick: (name: string) => void }) {
  const [req, setReq] = useState('')
  const [busy, setBusy] = useState(false)
  const [out, setOut] = useState<Array<{ name: string; story: string }>>([])
  async function go() {
    setBusy(true); setOut([])
    try {
      const r = await fetch('/api/portal/catalog/suggest-name', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemNames, request: req }),
      })
      const d = await r.json()
      if (d.error) window.alert(d.error)
      else setOut(d.suggestions ?? [])
    } finally { setBusy(false) }
  }
  return (
    <div className="border border-cream-200 rounded-lg p-4 bg-cream-50">
      <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-2">Name it — AI assistant</p>
      <div className="flex gap-2">
        <input value={req} onChange={e => setReq(e.target.value)} placeholder="Optional direction — e.g. wintery, for grandmothers, strawberry theme…"
          className="flex-1 min-w-0 px-3 py-2 border border-cream-300 bg-white rounded-lg font-sans text-xs text-bark-600 focus:outline-none focus:border-bark-400" />
        <button onClick={go} disabled={busy || itemNames.length === 0}
          className="shrink-0 flex items-center gap-2 bg-[#7A8E7C] hover:bg-[#6d8070] text-white rounded-lg font-sans text-[10px] tracking-[0.15em] uppercase px-4 py-2 transition-colors disabled:opacity-50">
          {busy ? <Loader size={12} className="animate-spin" /> : null} {busy ? 'Dreaming…' : 'Suggest names'}
        </button>
      </div>
      {itemNames.length === 0 && <p className="font-sans text-[11px] text-bark-400 mt-2">Add items first — names come from what&apos;s inside.</p>}
      {out.length > 0 && (
        <div className="mt-3 space-y-3">
          {out.map((o, i) => (
            <div key={i} className="bg-white border border-cream-200 rounded-lg p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-serif text-base text-espresso">{o.name}</p>
                <button onClick={() => onPick(o.name)} className="shrink-0 font-sans text-[10px] tracking-[0.15em] uppercase border border-cream-300 rounded px-2.5 py-1 text-bark-500 hover:border-bark-400">Use this name</button>
              </div>
              <p className="font-sans text-xs text-bark-500 leading-relaxed mt-1">{o.story}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


// Uploadable page backgrounds + scrim swatch, managed here (no separate
// panel per Emily): Gift Boxes hub + FAQ page, desktop and mobile crops.
function PageBackgrounds() {
  const SLOTS = [
    { key: 'boxes.page_bg', label: 'Gift Boxes page background' },
    { key: 'faq.page_bg', label: 'FAQ page background' },
  ]
  const [images, setImages] = useState<Record<string, { public_url: string }>>({})
  const [scrims, setScrims] = useState<Record<string, { hex: string; opacity: number }>>({})
  const [msg, setMsg] = useState('')
  const load = useCallback(() => {
    fetch('/api/portal/site-images').then(r => r.json()).then(d => setImages(d.images ?? {})).catch(() => {})
    fetch('/api/portal/site-scrims').then(r => r.json()).then(d => setScrims(d.scrims ?? {})).catch(() => {})
  }, [])
  useEffect(load, [load])
  async function upload(slotKey: string, f: File) {
    const fd = new FormData(); fd.append('file', f); fd.append('slotKey', slotKey); fd.append('altText', 'Page background')
    const r = await fetch('/api/portal/site-images', { method: 'POST', body: fd })
    const d = await r.json()
    if (d.error) window.alert(d.error); else { setMsg('Uploaded'); setTimeout(() => setMsg(''), 1500); load() }
  }
  async function saveScrim(slotKey: string, hex: string, opacity: number) {
    await fetch('/api/portal/site-scrims', { method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotKey, hex, opacity }) })
    setMsg('Saved'); setTimeout(() => setMsg(''), 1500); load()
  }
  return (
    <div className="mt-10">
      <h2 className="font-serif text-xl text-bark-600 mb-1">Page backgrounds</h2>
      <p className="font-sans text-xs text-bark-400 mb-4">Full-bleed photo behind the page (no white space, all screens). Upload a separate mobile crop if the wide photo doesn&apos;t suit phones. The swatch tints over the photo so text stays readable. {msg && <span className="text-sage-700">{msg}</span>}</p>
      <div className="space-y-5">
        {SLOTS.map(slot => {
          const scrim = scrims[slot.key] ?? { hex: '#FFFFFF', opacity: 0.7 }
          return (
            <div key={slot.key} className="bg-white border border-cream-300 rounded-xl p-4">
              <p className="font-sans text-sm font-medium text-bark-600 mb-3">{slot.label}</p>
              <div className="flex flex-wrap items-center gap-5">
                {[{ k: slot.key, l: 'Desktop' }, { k: `${slot.key}.mobile`, l: 'Mobile' }].map(v => (
                  <div key={v.k} className="flex items-center gap-2">
                    <span className="font-sans text-[10px] uppercase tracking-wide text-bark-400 w-14">{v.l}</span>
                    {images[v.k]?.public_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={images[v.k].public_url} alt="" className="w-16 h-10 object-cover rounded border border-cream-300" />
                      : <span className="w-16 h-10 rounded border border-dashed border-cream-300" />}
                    <label className="font-sans text-[10px] uppercase tracking-wide text-bark-500 border border-cream-300 rounded px-2 py-1.5 cursor-pointer hover:border-bark-400">
                      Upload
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) upload(v.k, f); e.target.value = '' }} />
                    </label>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <span className="font-sans text-[10px] uppercase tracking-wide text-bark-400">Swatch</span>
                  <input type="color" defaultValue={scrim.hex} onBlur={e => saveScrim(slot.key, e.target.value, scrim.opacity)} className="w-9 h-9 border border-cream-300 rounded cursor-pointer" />
                  <input type="number" min="0" max="1" step="0.05" defaultValue={scrim.opacity} title="Opacity 0-1"
                    onBlur={e => saveScrim(slot.key, scrim.hex, Math.min(1, Math.max(0, parseFloat(e.target.value) || 0)))}
                    className="w-16 px-2 py-1.5 border border-cream-300 rounded font-sans text-xs text-bark-600" />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function CatalogEditor() {
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [variants, setVariants] = useState<Variant[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [packaging, setPackaging] = useState(850)
  const [labelCost, setLabelCost] = useState(1200)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  const load = useCallback(() => {
    fetch('/api/portal/catalog').then(r => r.json()).then(d => {
      setProducts(d.products ?? []); setVariants(d.variants ?? []); setItems(d.items ?? [])
      if (typeof d.packaging === 'number') setPackaging(d.packaging)
      if (typeof d.label === 'number') setLabelCost(d.label)
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
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl text-bark-600">Gift Boxes</h1>
            <p className="font-sans text-sm text-bark-400 mt-1">
              Every box on /boxes. Click a card to edit details and contents — prices in dollars, all margins include packaging.
            </p>
          </div>
          <button
            onClick={() => {
              const name = window.prompt('New box name:')
              if (!name?.trim()) return
              const priceStr = window.prompt('Box price in dollars (draft, editable):', '100')
              const price = Math.round(parseFloat(priceStr || '100') * 100)
              post({ action: 'add-product', name: name.trim(), price }).then(ok => ok && load())
            }}
            className="shrink-0 flex items-center gap-2 bg-[#7A8E7C] hover:bg-[#6d8070] text-white rounded-lg font-sans text-[10px] tracking-[0.15em] uppercase px-4 py-2.5 transition-colors"
          >
            <Plus size={13} /> Add Box
          </button>
        </div>
        {msg && <p className="font-sans text-xs text-sage-700 mt-2">{msg}</p>}
        <div className="flex items-center gap-2 mt-3 font-sans text-xs text-bark-500">
          Per-box packaging (basket + mailer + kraft): $
          <input type="number" step="0.5" defaultValue={packaging / 100}
            onBlur={e => post({ action: 'save-packaging', packaging_cents: Math.round(parseFloat(e.target.value || '0') * 100) }).then(load)}
            className="w-20 px-2 py-1 border border-cream-300 rounded font-sans text-xs text-bark-600 focus:outline-none focus:border-bark-400" />
          <span className="text-bark-400">— in every margin</span>
          <span className="ml-3">Worst-case absorbed label: $</span>
          <input type="number" step="0.5" defaultValue={labelCost / 100}
            onBlur={e => post({ action: 'save-packaging', which: 'label', packaging_cents: Math.round(parseFloat(e.target.value || '0') * 100) }).then(load)}
            className="w-20 px-2 py-1 border border-cream-300 rounded font-sans text-xs text-bark-600 focus:outline-none focus:border-bark-400" />
          <span className="text-bark-400">— the &quot;worst case&quot; %</span>
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

              {!isOpen && (
                <div className="px-4 pb-4 space-y-2">
                  <NameAssistant
                    itemNames={[...new Set(pv.flatMap(v => v.contents.map(c => itemById.get(c.item_id)?.name).filter(Boolean)))] as string[]}
                    onPick={name => post({ action: 'save-product', slug: p.slug, patch: { name } }).then(load)}
                  />

                  {pv.map(v => {
                    const m = economicsOf(v, itemById, packaging, labelCost)
                    return (
                      <div key={v.key} className="flex items-center gap-3 flex-wrap border-t border-cream-100 pt-2">
                        <span className="font-sans text-xs font-medium text-bark-600 w-20 shrink-0 truncate">{v.label}</span>
                        <div className="flex -space-x-1.5 shrink-0">
                          {v.contents.map((c, ci) => {
                            const it = itemById.get(c.item_id)
                            return it?.image
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img key={ci} src={it.image} alt="" title={`${it.name}${c.qty > 1 ? ` ×${c.qty}` : ''}`} className="w-8 h-8 rounded-full object-cover border-2 border-white" />
                              : <span key={ci} title={it?.name ?? c.item_id} className="w-8 h-8 rounded-full border-2 border-white bg-cream-200 flex items-center justify-center font-sans text-[8px] text-bark-400">{(it?.name ?? '?').slice(0, 2)}</span>
                          })}
                          {v.contents.length === 0 && <span className="font-sans text-[11px] text-bark-300">no items yet</span>}
                        </div>
                        <span className="font-sans text-[11px] text-bark-500 shrink-0">box <strong className="text-bark-600">${(v.price / 100).toFixed(0)}</strong> · retail ${(m.retail / 100).toFixed(0)}</span>
                        {m.pct !== null
                          ? <span className={`font-sans text-[11px] shrink-0 ${m.pct < 60 ? 'text-terra-500' : 'text-sage-700'}`}>margin {m.pct}% · worst {m.worst}%</span>
                          : <span className="font-sans text-[11px] text-bark-300 shrink-0">no costs</span>}
                      </div>
                    )
                  })}
                </div>
              )}

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
                    {!p.active && (
                      <button onClick={() => window.confirm(`Delete ${p.name} permanently? Its variants go with it.`) && post({ action: 'delete-product', slug: p.slug }).then(load)}
                        className="font-sans text-[10px] tracking-[0.15em] uppercase border border-cream-300 px-3 py-2 rounded-lg text-bark-400 hover:border-red-400 hover:text-red-500">
                        Delete box
                      </button>
                    )}
                    <button onClick={() => post({ action: 'save-product', slug: p.slug, patch: { visible: !p.visible } }).then(load)} className="font-sans text-[10px] tracking-[0.15em] uppercase border border-cream-300 px-3 py-2 rounded-lg text-bark-500 hover:border-bark-400" title="Removes it from nav + sitemap without deleting the page, so the URL and its reviews persist year to year.">
                      {p.visible ? 'Hide for the season' : 'Restore from hiding'}
                    </button>
                  </div>
                  {p.seasonal && <p className="font-sans text-xs text-bark-400">Seasonal product — &quot;Hide for the season&quot; removes it from nav + sitemap without deleting the page, so the URL and its reviews persist year to year.</p>}

                  {pv.map(v => {
                    const m = economicsOf(v, itemById, packaging, labelCost)
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
                                cost ${(m.cost / 100).toFixed(2)} incl. pkg → margin ~{m.pct}%{m.worst !== null ? ` · worst case ${m.worst}%` : ''}{m.missing ? ` (${m.missing} uncosted)` : ''}{m.pct < 60 ? ' — below 60%' : ''}
                              </span>
                            )}
                            {m.pct === null && <span className="font-sans text-[11px] text-bark-400">margin — add item costs</span>}
                            <button onClick={() => window.confirm(`Delete ${v.label}?`) && post({ action: 'delete-variant', product_slug: p.slug, key: v.key }).then(load)} className="text-bark-400 hover:text-terra-500"><Trash2 size={13} /></button>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 mb-3">
                          <div><label className={label}>Price $</label>
                            <input type="number" defaultValue={v.price / 100} onBlur={e => post({ action: 'save-variant', variant: { ...v, price: Math.round(parseFloat(e.target.value || '0') * 100) } }).then(load)} className={field} /></div>
                          <div><label className={label}>Basket (L×W×D)</label>
                            <input defaultValue={v.basket} onBlur={e => post({ action: 'save-variant', variant: { ...v, basket: e.target.value } }).then(load)} className={field} /></div>
                          <div><label className={label}>Depth cm</label>
                            <input type="number" step="0.5" defaultValue={v.basket_depth_cm ?? ''} onBlur={e => post({ action: 'save-variant', variant: { ...v, basket_depth_cm: parseFloat(e.target.value) || null } }).then(load)} className={field} /></div>

                        </div>

                        <div className="flex items-center gap-2 mb-1">
                          <span className="flex-1 font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400">Contents</span>
                          <span className="w-14 shrink-0 text-right font-sans text-[9px] uppercase text-bark-300">cost</span>
                          <span className="w-12 shrink-0 text-right font-sans text-[9px] uppercase text-bark-300">retail</span>
                          <span className="w-12 shrink-0 text-center font-sans text-[9px] uppercase text-bark-300">qty</span>
                          <span className="w-8 shrink-0" />
                        </div>
                        {v.contents.map((c, ci) => {
                          const it = itemById.get(c.item_id)
                          const isBlanket = /blanket/i.test(it?.name ?? '')
                          return (
                          <div key={ci} className="flex items-center gap-2 mb-2">
                            <ItemPicker items={items} value={c.item_id}
                              onChange={id => { const nc = [...v.contents]; nc[ci] = { ...c, item_id: id }; post({ action: 'save-variant', variant: { ...v, contents: nc } }).then(load) }} />
                            <span className="w-14 shrink-0 text-right font-sans text-[11px] text-bark-400" title="Unit cost">{it?.cost_cents ? `$${(it.cost_cents / 100).toFixed(2)}` : '—'}</span>
                            <span className="w-12 shrink-0 text-right font-sans text-[11px] text-bark-600" title="Unit retail">${((it?.price ?? 0) / 100).toFixed(0)}</span>
                            <input type="number" min="1" title="Quantity" value={c.qty} onChange={e => { const nc = [...v.contents]; nc[ci] = { ...c, qty: parseInt(e.target.value) || 1 }; post({ action: 'save-variant', variant: { ...v, contents: nc } }).then(load) }} className="w-12 shrink-0 px-1 py-2 border border-cream-300 bg-white rounded-lg font-sans text-sm text-bark-600 text-center focus:outline-none focus:border-bark-400" />
                            {isBlanket && (
                              <button title={c.color_choice ? 'Buyer picks the color — click to fix the colorway' : 'Fixed colorway — click to let the buyer pick'} onClick={() => { const nc = [...v.contents]; nc[ci] = { ...c, color_choice: !c.color_choice }; post({ action: 'save-variant', variant: { ...v, contents: nc } }).then(load) }}
                                className={`shrink-0 font-sans text-[9px] tracking-wide uppercase border rounded px-1.5 py-1 ${c.color_choice ? 'border-espresso bg-espresso text-cream-50' : 'border-cream-300 text-bark-400 hover:border-bark-400'}`}>
                                color pick
                              </button>
                            )}
                            <button onClick={() => post({ action: 'save-variant', variant: { ...v, contents: v.contents.filter((_, i2) => i2 !== ci) } }).then(load)} className="shrink-0 text-bark-400 hover:text-terra-500"><Trash2 size={12} /></button>
                          </div>
                          )
                        })}
                        <button onClick={() => post({ action: 'save-variant', variant: { ...v, contents: [...v.contents, { item_id: items[0]?.id, qty: 1 }] } }).then(load)} className="font-sans text-[10px] tracking-[0.15em] uppercase text-bark-500 border border-cream-300 rounded-lg px-3 py-1.5 hover:border-bark-400 flex items-center gap-1.5"><Plus size={11} /> Add item</button>

                        <div className="mt-4">
                          <label className={label}>Photos — first one is this version&apos;s cover (shows on chips, cards and the page)</label>
                          <div className="flex flex-wrap items-center gap-2">
                            {v.images.map((img, ii) => (
                              <div key={ii} className="relative group">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={img} alt="" className="w-16 h-16 object-cover rounded border border-cream-300" />
                                {ii > 0 && (
                                  <button title="Make cover" onClick={() => { const ni = [img, ...v.images.filter((_, x) => x !== ii)]; post({ action: 'save-variant', variant: { ...v, images: ni } }).then(load) }}
                                    className="absolute bottom-0.5 left-0.5 hidden group-hover:flex bg-white/90 border border-cream-300 rounded px-1 font-sans text-[8px] uppercase text-bark-500">cover</button>
                                )}
                                <button title="Remove" onClick={() => post({ action: 'save-variant', variant: { ...v, images: v.images.filter((_, x) => x !== ii) } }).then(load)}
                                  className="absolute -top-1.5 -right-1.5 hidden group-hover:flex w-4 h-4 items-center justify-center bg-white border border-cream-300 rounded-full text-bark-500 hover:text-red-500 text-[10px] leading-none">×</button>
                              </div>
                            ))}
                            <label className="w-16 h-16 flex items-center justify-center border border-dashed border-cream-300 rounded cursor-pointer text-bark-400 hover:border-bark-400 hover:text-bark-600">
                              <Plus size={14} />
                              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={async e => {
                                const f = e.target.files?.[0]; if (!f) return
                                const fd = new FormData(); fd.append('file', f)
                                const r = await fetch(`/api/portal/boxes/${p.slug}-${v.key}/upload-image`, { method: 'POST', body: fd })
                                const d = await r.json()
                                if (d.url) post({ action: 'save-variant', variant: { ...v, images: [...v.images, d.url] } }).then(load)
                                else window.alert(d.error || 'Upload failed')
                                e.target.value = ''
                              }} />
                            </label>
                          </div>
                        </div>
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

      <PageBackgrounds />

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
