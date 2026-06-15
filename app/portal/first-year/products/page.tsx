'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Loader, Plus, Trash2, Check, ArrowLeft, Sparkles, Upload, Film, X, ImageIcon } from 'lucide-react'

interface FYProduct {
  id: string
  name: string
  description: string
  price_cents: number | null
  sizes: string | null
  shipment_index: number | null
  images: string[]
  video_url: string | null
  sort_order: number
  published: boolean
}

const SHIPMENTS = [
  { value: '', label: 'No shipment (catalog only)' },
  { value: '1', label: 'I · Welcome (NB–3mo)' },
  { value: '2', label: 'II · Growing (6–9mo)' },
  { value: '3', label: 'III · One (12–18mo)' },
]

const labelCls = 'block font-sans text-[10px] tracking-[0.15em] uppercase text-bark-400 mb-1.5'
const inputCls = 'w-full px-3 py-2 border border-cream-300 bg-white rounded text-sm text-bark-700 focus:outline-none focus:border-bark-400'

export default function FirstYearProductsPage() {
  const [products, setProducts] = useState<FYProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<FYProduct | null>(null)
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [err, setErr] = useState('')

  async function load() {
    setLoading(true)
    try {
      const r = await fetch('/api/portal/first-year/products')
      const d = await r.json()
      setProducts(d.products ?? [])
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function newProduct() {
    setCreating(true); setErr('')
    try {
      const r = await fetch('/api/portal/first-year/products', { method: 'POST' })
      const d = await r.json()
      if (!r.ok) { setErr(d.error || 'Could not create'); return }
      setEditing(d.product)
    } finally { setCreating(false) }
  }

  async function save() {
    if (!editing) return
    setSaving(true); setErr('')
    try {
      const r = await fetch('/api/portal/first-year/products', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      })
      const d = await r.json()
      if (!r.ok) { setErr(d.error || 'Save failed'); return }
      setEditing(null); await load()
    } finally { setSaving(false) }
  }

  async function remove(id: string) {
    if (!confirm('Delete this product (and its photos/video) permanently?')) return
    await fetch('/api/portal/first-year/products', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setEditing(null); await load()
  }

  if (editing) {
    return <Editor product={editing} setProduct={setEditing} onSave={save} onDelete={() => remove(editing.id)} onBack={() => setEditing(null)} saving={saving} err={err} />
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <Link href="/portal/first-year" className="inline-flex items-center gap-2 text-bark-400 hover:text-bark-600 transition-colors font-sans text-sm mb-6">
        <ArrowLeft size={16} /> First Year
      </Link>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl text-bark-600">First Year — Products</h1>
          <p className="font-sans text-sm text-bark-400 mt-1">Upload the individual items in this line — photos, a short video, price, sizes.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/portal/first-year/products/bulk" className="flex items-center gap-2 border border-[#9A80BD]/40 text-[#7C61A8] font-sans text-[11px] tracking-[0.2em] uppercase px-4 py-2.5 rounded hover:bg-[#9A80BD]/10 transition-colors">
            <Sparkles size={15} /> Bulk add
          </Link>
          <button onClick={newProduct} disabled={creating} className="flex items-center gap-2 bg-bark-600 text-white font-sans text-[11px] tracking-[0.2em] uppercase px-5 py-2.5 rounded hover:bg-bark-700 transition-colors disabled:opacity-50">
            {creating ? <Loader size={15} className="animate-spin" /> : <Plus size={15} />} New product
          </button>
        </div>
      </div>
      {err && <p className="font-sans text-xs text-red-500 mb-4">{err}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-bark-400 py-10 text-sm"><Loader size={14} className="animate-spin" /> Loading…</div>
      ) : products.length === 0 ? (
        <p className="font-sans text-sm text-bark-400 py-8">No products yet. Click “New product” to add your first.</p>
      ) : (
        <div className="space-y-3">
          {products.map(p => (
            <button key={p.id} onClick={() => setEditing(p)} className="w-full text-left bg-white border border-cream-200 rounded-lg p-3 hover:border-bark-300 transition-colors flex items-center gap-4">
              <div className="w-14 h-14 shrink-0 bg-cream-100 rounded overflow-hidden flex items-center justify-center">
                {p.images[0]
                  ? <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                  : <ImageIcon size={18} className="text-bark-300" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`font-sans text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 rounded-full ${p.published ? 'bg-sage-200 text-sage-600' : 'bg-cream-200 text-bark-400'}`}>{p.published ? 'Published' : 'Draft'}</span>
                  {p.shipment_index && <span className="font-sans text-[10px] text-bark-400">{SHIPMENTS.find(s => s.value === String(p.shipment_index))?.label}</span>}
                </div>
                <p className="font-serif text-lg text-bark-600 truncate">{p.name || 'Untitled product'}</p>
                <p className="font-sans text-xs text-bark-400">{p.price_cents != null ? `$${(p.price_cents / 100).toFixed(2)}` : 'No price'} · {p.images.length} photo{p.images.length === 1 ? '' : 's'}{p.video_url ? ' · video' : ''}</p>
              </div>
              <span className="font-sans text-[10px] tracking-[0.15em] uppercase text-bark-400 shrink-0">Edit →</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Editor ──────────────────────────────────────────────────────────────────
function Editor({ product, setProduct, onSave, onDelete, onBack, saving, err }: {
  product: FYProduct
  setProduct: (p: FYProduct) => void
  onSave: () => void
  onDelete: () => void
  onBack: () => void
  saving: boolean
  err: string
}) {
  const p = product
  const set = (patch: Partial<FYProduct>) => setProduct({ ...p, ...patch })
  const priceUsd = p.price_cents != null ? (p.price_cents / 100).toString() : ''

  const [imgBusy, setImgBusy] = useState(false)
  const [vidBusy, setVidBusy] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [localErr, setLocalErr] = useState('')
  const aiInputRef = useRef<HTMLInputElement>(null)

  async function addImage(file: File) {
    if (file.size > 4.3 * 1024 * 1024) { setLocalErr('Photo too large — keep it under ~4MB.'); return }
    setImgBusy(true); setLocalErr('')
    try {
      const fd = new FormData(); fd.append('file', file)
      const r = await fetch(`/api/portal/first-year/products/${p.id}/image`, { method: 'POST', body: fd })
      const d = await r.json()
      if (r.ok && d.images) set({ images: d.images })
      else setLocalErr(d.error || 'Upload failed')
    } catch { setLocalErr('Upload failed') } finally { setImgBusy(false) }
  }
  async function removeImage(url: string) {
    setImgBusy(true)
    try {
      const r = await fetch(`/api/portal/first-year/products/${p.id}/image`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) })
      const d = await r.json()
      if (r.ok) set({ images: d.images ?? p.images.filter(u => u !== url) })
    } finally { setImgBusy(false) }
  }
  async function uploadVideo(file: File) {
    if (file.size > 4.3 * 1024 * 1024) { setLocalErr('Video too large — a short, compressed 3–6s clip under ~4MB.'); return }
    setVidBusy(true); setLocalErr('')
    try {
      const fd = new FormData(); fd.append('file', file)
      const r = await fetch(`/api/portal/first-year/products/${p.id}/video`, { method: 'POST', body: fd })
      const d = await r.json()
      if (r.ok && d.videoUrl) set({ video_url: d.videoUrl })
      else setLocalErr(d.error || 'Upload failed')
    } catch { setLocalErr('Upload failed') } finally { setVidBusy(false) }
  }
  async function removeVideo() {
    setVidBusy(true)
    try { await fetch(`/api/portal/first-year/products/${p.id}/video`, { method: 'DELETE' }); set({ video_url: null }) }
    finally { setVidBusy(false) }
  }

  // Draft name / description / price from uploaded screenshots — fills empty fields only.
  async function draftFromScreenshots(files: FileList) {
    setAiBusy(true); setLocalErr('')
    try {
      const fd = new FormData()
      Array.from(files).slice(0, 4).forEach(f => fd.append('images', f))
      const r = await fetch('/api/portal/products/ai-from-image', { method: 'POST', body: fd })
      const d = await r.json()
      if (!r.ok) { setLocalErr(d.error || 'Could not read the screenshot'); return }
      const patch: Partial<FYProduct> = {}
      if (!p.name.trim() && d.name) patch.name = d.name
      if (!p.description.trim() && d.description) patch.description = d.description
      if (p.price_cents == null && d.suggested_price_cents) patch.price_cents = d.suggested_price_cents
      set(patch)
    } catch { setLocalErr('Could not read the screenshot') } finally { setAiBusy(false) }
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="flex items-center gap-2 text-bark-400 hover:text-bark-600 transition-colors font-sans text-sm">
          <ArrowLeft size={16} /> All products
        </button>
        <div className="flex items-center gap-3">
          <button onClick={onDelete} className="flex items-center gap-1.5 font-sans text-[11px] tracking-[0.1em] uppercase text-bark-400 hover:text-red-500 transition-colors"><Trash2 size={14} /> Delete</button>
          <button onClick={onSave} disabled={saving} className="flex items-center gap-2 bg-bark-600 text-white font-sans text-[11px] tracking-[0.2em] uppercase px-6 py-2.5 rounded hover:bg-bark-700 transition-colors disabled:opacity-40">
            {saving ? <Loader size={13} className="animate-spin" /> : <Check size={13} />} {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="bg-white border border-cream-300 rounded-xl p-6 space-y-5">
        {/* AI from screenshot */}
        <div className="bg-[#9A80BD]/5 border border-[#9A80BD]/20 rounded-lg p-4">
          <p className="font-sans text-sm font-medium text-bark-600 flex items-center gap-1.5 mb-1"><Sparkles size={14} className="text-[#7C61A8]" /> Draft from a screenshot</p>
          <p className="font-sans text-[11px] text-bark-400 mb-3 leading-relaxed">Upload a supplier listing / photo (showing the item and its cost). AI drafts the name, description, and a suggested retail price — filling only the empty fields below.</p>
          <button onClick={() => aiInputRef.current?.click()} disabled={aiBusy} className="inline-flex items-center gap-2 border border-[#9A80BD]/40 text-[#7C61A8] font-sans text-[11px] tracking-[0.15em] uppercase px-4 py-2 rounded hover:bg-[#9A80BD]/10 transition-colors disabled:opacity-40">
            {aiBusy ? <Loader size={13} className="animate-spin" /> : <Sparkles size={13} />} {aiBusy ? 'Reading…' : 'Upload screenshot(s)'}
          </button>
          <input ref={aiInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { if (e.target.files?.length) draftFromScreenshots(e.target.files); e.target.value = '' }} />
        </div>

        <div>
          <label className={labelCls}>Name</label>
          <input className={inputCls} value={p.name} onChange={e => set({ name: e.target.value })} placeholder="Newborn gown" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Price (USD)</label>
            <input type="number" min={0} step="1" className={inputCls} value={priceUsd}
              onChange={e => set({ price_cents: e.target.value === '' ? null : Math.round(Number(e.target.value) * 100) })} placeholder="—" />
          </div>
          <div>
            <label className={labelCls}>Sizes</label>
            <input className={inputCls} value={p.sizes ?? ''} onChange={e => set({ sizes: e.target.value })} placeholder="NB, 3mo, 6mo" />
          </div>
          <div>
            <label className={labelCls}>Shipment</label>
            <select className={inputCls} value={p.shipment_index != null ? String(p.shipment_index) : ''} onChange={e => set({ shipment_index: e.target.value === '' ? null : Number(e.target.value) })}>
              {SHIPMENTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Description</label>
          <textarea rows={3} className={inputCls + ' resize-none leading-relaxed'} value={p.description} onChange={e => set({ description: e.target.value })} />
        </div>

        {/* Photos */}
        <div>
          <label className={labelCls}>Photos</label>
          <div className="flex flex-wrap gap-3">
            {p.images.map(url => (
              <div key={url} className="relative w-24 h-24 rounded border border-cream-200 overflow-hidden group">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button onClick={() => removeImage(url)} disabled={imgBusy} className="absolute top-1 right-1 w-6 h-6 bg-white/90 rounded-full flex items-center justify-center text-bark-500 hover:text-red-500 shadow-sm">
                  <X size={13} />
                </button>
              </div>
            ))}
            <label className={`w-24 h-24 rounded border border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${imgBusy ? 'border-cream-300 text-bark-300' : 'border-bark-300 text-bark-400 hover:border-bark-500 hover:text-bark-600'}`}>
              {imgBusy ? <Loader size={16} className="animate-spin" /> : <Upload size={16} />}
              <span className="font-sans text-[9px] tracking-[0.1em] uppercase">Add photo</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" disabled={imgBusy} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) addImage(f); e.target.value = '' }} />
            </label>
          </div>
          <p className="font-sans text-[11px] text-bark-400 mt-2">First photo is the main image. JPG / PNG / WebP, under ~4MB each.</p>
        </div>

        {/* Video */}
        <div>
          <label className={labelCls}>Video (optional)</label>
          {p.video_url ? (
            <div>
              <video src={p.video_url} preload="none" muted loop playsInline controls className="w-full max-w-xs rounded border border-cream-200 bg-cream-100" />
              <div className="mt-2 flex items-center gap-3">
                <label className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.15em] uppercase text-bark-400 hover:text-bark-600 cursor-pointer">
                  <Upload size={12} /> Replace
                  <input type="file" accept="video/mp4,video/webm,video/quicktime" disabled={vidBusy} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadVideo(f); e.target.value = '' }} />
                </label>
                <button onClick={removeVideo} disabled={vidBusy} className="inline-flex items-center gap-1 text-[10px] tracking-[0.15em] uppercase text-bark-400 hover:text-red-500"><Trash2 size={12} /> Remove</button>
              </div>
            </div>
          ) : (
            <label className={`inline-flex items-center gap-2 font-sans text-[11px] tracking-[0.15em] uppercase px-4 py-2.5 rounded cursor-pointer transition-colors ${vidBusy ? 'bg-cream-200 text-bark-400' : 'bg-bark-600 text-cream-50 hover:bg-bark-700'}`}>
              {vidBusy ? <Loader size={14} className="animate-spin" /> : <Film size={14} />} {vidBusy ? 'Uploading…' : 'Upload video'}
              <input type="file" accept="video/mp4,video/webm,video/quicktime" disabled={vidBusy} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadVideo(f); e.target.value = '' }} />
            </label>
          )}
          <p className="font-sans text-[11px] text-bark-400 mt-2">A short clip (3–6s, under ~4MB). Loads only when played, so it never slows the page.</p>
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer pt-1">
          <input type="checkbox" checked={p.published} onChange={e => set({ published: e.target.checked })} className="w-5 h-5 accent-bark-600" />
          <span className="font-sans text-sm text-bark-600">Published <span className="text-bark-400">(unchecked = draft, hidden from the site)</span></span>
        </label>

        {(localErr || err) && <p className="font-sans text-xs text-red-500">{localErr || err}</p>}
        <p className="font-sans text-[11px] text-bark-400">Photos and video upload immediately. Click <strong>Save</strong> to store the name, price, sizes, description &amp; published state.</p>
      </div>
    </div>
  )
}
