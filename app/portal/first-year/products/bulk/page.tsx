'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader, ArrowLeft, Upload, Sparkles, X, Check, Trash2, ImageIcon } from 'lucide-react'

interface Group {
  name: string
  description: string
  price_cents: number | null
  images: string[]
}

const SHIPMENTS = [
  { value: '', label: 'No shipment (set per product later)' },
  { value: '1', label: 'I · Welcome (NB–3mo)' },
  { value: '2', label: 'II · Growing (6–9mo)' },
  { value: '3', label: 'III · One (12–18mo)' },
]

const labelCls = 'block font-sans text-[10px] tracking-[0.15em] uppercase text-bark-400 mb-1.5'
const inputCls = 'w-full px-3 py-2 border border-cream-300 bg-white rounded text-sm text-bark-700 focus:outline-none focus:border-bark-400'

export default function BulkUploadPage() {
  const router = useRouter()
  const [urls, setUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [grouping, setGrouping] = useState(false)
  const [groups, setGroups] = useState<Group[] | null>(null)
  const [shipment, setShipment] = useState('')
  const [creating, setCreating] = useState(false)
  const [err, setErr] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function addFiles(files: FileList) {
    const arr = Array.from(files)
    setUploading(true); setErr(''); setProgress({ done: 0, total: arr.length })
    const next: string[] = []
    let done = 0
    for (const f of arr) {
      try {
        const fd = new FormData(); fd.append('file', f)
        const r = await fetch('/api/portal/first-year/products/staging-image', { method: 'POST', body: fd })
        const d = await r.json()
        if (r.ok && d.url) next.push(d.url)
        else setErr(d.error || 'A photo failed to upload')
      } catch { setErr('A photo failed to upload') }
      done++; setProgress({ done, total: arr.length })
    }
    setUrls(u => [...u, ...next])
    setUploading(false); setProgress(null)
  }

  async function group() {
    if (urls.length < 1) return
    setGrouping(true); setErr('')
    try {
      const r = await fetch('/api/portal/first-year/products/group', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls }),
      })
      const d = await r.json()
      if (!r.ok) { setErr(d.error || 'Grouping failed'); return }
      setGroups(d.groups ?? [])
    } catch { setErr('Grouping failed') } finally { setGrouping(false) }
  }

  function setGroup(i: number, patch: Partial<Group>) {
    setGroups(gs => gs ? gs.map((g, idx) => idx === i ? { ...g, ...patch } : g) : gs)
  }
  function removePhoto(i: number, url: string) {
    setGroups(gs => {
      if (!gs) return gs
      const next = gs.map((g, idx) => idx === i ? { ...g, images: g.images.filter(u => u !== url) } : g)
      return next.filter(g => g.images.length > 0)
    })
  }
  function removeGroup(i: number) {
    setGroups(gs => gs ? gs.filter((_, idx) => idx !== i) : gs)
  }

  async function create() {
    if (!groups?.length) return
    setCreating(true); setErr('')
    try {
      const r = await fetch('/api/portal/first-year/products/bulk-create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groups, shipment_index: shipment === '' ? null : Number(shipment) }),
      })
      const d = await r.json()
      if (!r.ok) { setErr(d.error || 'Could not create'); return }
      router.push('/portal/first-year/products')
    } finally { setCreating(false) }
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <Link href="/portal/first-year/products" className="inline-flex items-center gap-2 text-bark-400 hover:text-bark-600 transition-colors font-sans text-sm mb-6">
        <ArrowLeft size={16} /> Products
      </Link>
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-bark-600">Bulk add — AI auto-group</h1>
        <p className="font-sans text-sm text-bark-400 mt-1">Upload a pile of photos. AI sorts them into products (same item grouped together) and drafts each one. You review, then create them — all as drafts.</p>
      </div>
      {err && <p className="font-sans text-xs text-red-500 mb-4">{err}</p>}

      {/* Step 1 — upload */}
      <div className="bg-white border border-cream-300 rounded-xl p-6 mb-6">
        <p className="font-sans text-sm font-medium text-bark-600 mb-1">1 · Upload photos</p>
        <p className="font-sans text-[11px] text-bark-400 mb-4">JPG / PNG / WebP, under ~4MB each. Add all the photos for several products at once.</p>

        {urls.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {urls.map(url => (
              <div key={url} className="w-16 h-16 rounded border border-cream-200 overflow-hidden">
                <img src={url} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => inputRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-2 border border-bark-300 text-bark-600 font-sans text-[11px] tracking-[0.15em] uppercase px-4 py-2.5 rounded hover:border-bark-500 transition-colors disabled:opacity-50">
            {uploading ? <Loader size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploading && progress ? `Uploading ${progress.done}/${progress.total}…` : urls.length ? 'Add more' : 'Choose photos'}
          </button>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={e => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = '' }} />
          {urls.length > 0 && <span className="font-sans text-xs text-bark-400">{urls.length} photo{urls.length === 1 ? '' : 's'} ready</span>}
        </div>
      </div>

      {/* Step 2 — group */}
      <div className="bg-white border border-cream-300 rounded-xl p-6 mb-6">
        <p className="font-sans text-sm font-medium text-bark-600 mb-1">2 · Group with AI</p>
        <p className="font-sans text-[11px] text-bark-400 mb-4">AI sorts your {urls.length || ''} photos into products and drafts a name, description &amp; price for each.</p>
        <button onClick={group} disabled={grouping || urls.length < 1} className="inline-flex items-center gap-2 bg-[#7C61A8] text-white font-sans text-[11px] tracking-[0.2em] uppercase px-5 py-2.5 rounded hover:bg-[#6b5293] transition-colors disabled:opacity-40">
          {grouping ? <Loader size={14} className="animate-spin" /> : <Sparkles size={14} />} {grouping ? 'Grouping…' : groups ? 'Re-group' : 'Group photos'}
        </button>
      </div>

      {/* Step 3 — review + create */}
      {groups && (
        <div className="bg-white border border-cream-300 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <p className="font-sans text-sm font-medium text-bark-600">3 · Review {groups.length} product{groups.length === 1 ? '' : 's'}</p>
            <button onClick={create} disabled={creating || groups.length === 0} className="inline-flex items-center gap-2 bg-bark-600 text-white font-sans text-[11px] tracking-[0.2em] uppercase px-6 py-2.5 rounded hover:bg-bark-700 transition-colors disabled:opacity-40">
              {creating ? <Loader size={13} className="animate-spin" /> : <Check size={13} />} {creating ? 'Creating…' : `Create ${groups.length} (as drafts)`}
            </button>
          </div>

          <div className="mb-5 max-w-xs">
            <label className={labelCls}>Assign all to shipment</label>
            <select className={inputCls} value={shipment} onChange={e => setShipment(e.target.value)}>
              {SHIPMENTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {groups.length === 0 ? (
            <p className="font-sans text-sm text-bark-400 py-4 flex items-center gap-2"><ImageIcon size={16} /> No groups left.</p>
          ) : (
            <div className="space-y-5">
              {groups.map((g, i) => (
                <div key={i} className="border border-cream-200 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {g.images.map(url => (
                        <div key={url} className="relative w-16 h-16 rounded border border-cream-200 overflow-hidden group">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <button onClick={() => removePhoto(i, url)} className="absolute top-0.5 right-0.5 w-5 h-5 bg-white/90 rounded-full flex items-center justify-center text-bark-500 hover:text-red-500 shadow-sm">
                            <X size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => removeGroup(i)} title="Discard this product" className="text-bark-400 hover:text-red-500 shrink-0"><Trash2 size={15} /></button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className={labelCls}>Name</label>
                      <input className={inputCls} value={g.name} onChange={e => setGroup(i, { name: e.target.value })} placeholder="Product name" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="sm:col-span-1">
                        <label className={labelCls}>Price (USD)</label>
                        <input type="number" min={0} step="1" className={inputCls}
                          value={g.price_cents != null ? (g.price_cents / 100).toString() : ''}
                          onChange={e => setGroup(i, { price_cents: e.target.value === '' ? null : Math.round(Number(e.target.value) * 100) })} placeholder="—" />
                      </div>
                      <div className="sm:col-span-3">
                        <label className={labelCls}>Description</label>
                        <textarea rows={2} className={inputCls + ' resize-none leading-relaxed'} value={g.description} onChange={e => setGroup(i, { description: e.target.value })} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="font-sans text-[11px] text-bark-400 mt-4">Products are created as <strong>drafts</strong> — open each in Products to add a video, fine-tune, and publish.</p>
        </div>
      )}
    </div>
  )
}
