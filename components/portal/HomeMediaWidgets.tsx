'use client'

// Homepage media widgets — image slots, the editorial video slot, and the
// bestsellers-carousel manager. Extracted from the old Home Images portal page
// so the merged "Homepage" panel can interleave them with the text editors,
// in the same order they appear on the homepage. API endpoints are unchanged.

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Upload, CheckCircle, Loader, Video, RotateCcw, Trash2, Plus, ArrowUp } from 'lucide-react'
import { CATEGORY_LABELS } from '@/lib/products'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

function getStorageUrl(slot: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/home-images/${slot}.jpg`
}

type UploadState = 'idle' | 'uploading' | 'done' | 'error'

// A rotating gallery slot — add several photos, choose which shows first, and
// they cross-fade on the homepage every few seconds. Backed by the per-slot
// /api/portal/home-gallery endpoint (site_images rows under `home.<slot>`).
export function GallerySlot({ slot, label, description, wide = false }: {
  slot: string
  label: string
  description: string
  wide?: boolean
}) {
  const [images, setImages] = useState<{ id: string; url: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const ratio = wide ? '16/9' : '4/3'

  async function load() {
    setLoading(true)
    try {
      const r = await fetch(`/api/portal/home-gallery?slot=${encodeURIComponent(slot)}`)
      const d = await r.json()
      setImages(d.images ?? [])
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [slot]) // eslint-disable-line react-hooks/exhaustive-deps

  async function add(file: File) {
    setBusy(true)
    try {
      const form = new FormData(); form.append('file', file); form.append('slot', slot)
      await fetch('/api/portal/home-gallery', { method: 'POST', body: form })
      await load()
    } finally { setBusy(false) }
  }
  async function remove(id: string) {
    setBusy(true)
    try {
      await fetch('/api/portal/home-gallery', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      await load()
    } finally { setBusy(false) }
  }
  async function makeFirst(id: string) {
    const order = [id, ...images.filter(i => i.id !== id).map(i => i.id)]
    setBusy(true)
    try {
      await fetch('/api/portal/home-gallery', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order }) })
      await load()
    } finally { setBusy(false) }
  }

  return (
    <div className="bg-cream-50 border border-cream-200 rounded-xl p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="font-sans text-xs font-medium text-bark-600">{label}</p>
          {description && <p className="font-sans text-[10px] text-bark-400 mt-0.5 leading-relaxed">{description}</p>}
        </div>
        {images.length > 1 && <span className="font-sans text-[9px] tracking-[0.15em] uppercase text-gold-500 shrink-0">Rotates · 5s</span>}
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-bark-400 py-4 text-xs"><Loader size={12} className="animate-spin" /> Loading…</div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {images.map((img, i) => (
            <div key={img.id} className="relative group rounded-lg overflow-hidden border border-cream-200" style={{ aspectRatio: ratio }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="w-full h-full object-cover" />
              {i === 0 && <span className="absolute top-1 left-1 bg-gold-400/90 text-bark-800 font-sans text-[7px] tracking-[0.1em] uppercase px-1.5 py-0.5 rounded-full">First</span>}
              <div className="absolute inset-0 bg-bark-700/0 group-hover:bg-bark-700/45 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                {i !== 0 && (
                  <button type="button" onClick={() => makeFirst(img.id)} title="Make first" className="bg-cream-50/90 rounded-full p-1.5 text-bark-600 hover:text-bark-800">
                    <ArrowUp size={12} />
                  </button>
                )}
                <button type="button" onClick={() => remove(img.id)} title="Remove" className="bg-cream-50/90 rounded-full p-1.5 text-bark-600 hover:text-red-500">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-cream-300 text-bark-400 hover:border-bark-400 hover:text-bark-600 transition-colors disabled:opacity-50"
            style={{ aspectRatio: ratio }}
          >
            {busy ? <Loader size={16} className="animate-spin" /> : <><Plus size={16} /><span className="font-sans text-[9px] tracking-[0.15em] uppercase">Add</span></>}
          </button>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) add(f); e.target.value = '' }} />
      <p className="font-sans text-[9px] text-bark-400/70 mt-2">Add several to cross-fade them. “First” shows before it rotates. Saves instantly.</p>
    </div>
  )
}

export function ImageSlotCard({
  slotKey, label, description, wide = false,
}: {
  slotKey: string
  label: string
  description: string
  wide?: boolean
}) {
  const [state, setState] = useState<UploadState>('idle')
  const [url, setUrl] = useState<string | null>(null)
  const [hasExisting, setHasExisting] = useState(true)
  const [removing, setRemoving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const displayUrl = url ?? (hasExisting ? getStorageUrl(slotKey) : null)
  const ratio = wide ? '16/9' : '4/3'

  async function removeFile() {
    if (!confirm('Remove this photo? The homepage section will be empty until you upload a new one.')) return
    setRemoving(true)
    setErrorMsg(null)
    try {
      const res = await fetch('/api/portal/home-images/delete', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slot: slotKey }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setErrorMsg(d.error || 'Delete failed'); setState('error'); return }
      setUrl(null); setHasExisting(false); setState('idle')
    } finally { setRemoving(false) }
  }

  async function handleFile(file: File) {
    setState('uploading')
    const form = new FormData()
    form.append('file', file)
    form.append('slot', slotKey)
    try {
      const res = await fetch('/api/portal/home-images/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (data.url) {
        setUrl(data.url + `?t=${Date.now()}`)
        setState('done')
        setErrorMsg(null)
      } else {
        setErrorMsg(data.error ?? 'Upload failed')
        setState('error')
      }
    } catch (err) {
      setErrorMsg(String(err))
      setState('error')
    }
  }

  return (
    <div className="bg-cream-50 border border-cream-200 rounded-xl overflow-hidden">
      <div
        className="relative bg-cream-200 cursor-pointer group"
        style={{ aspectRatio: ratio }}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault()
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
      >
        {displayUrl && (
          <Image
            src={displayUrl}
            alt={label}
            fill
            className="object-cover object-center"
            unoptimized
            onError={() => setHasExisting(false)}
          />
        )}

        <div className={`absolute inset-0 flex flex-col items-center justify-center gap-2 transition-opacity
          ${state === 'uploading'
            ? 'bg-cream-50/80 opacity-100'
            : 'opacity-0 group-hover:opacity-100 bg-bark-600/50'}`}
        >
          {state === 'uploading' ? (
            <Loader size={24} className="text-bark-600 animate-spin" />
          ) : state === 'done' ? (
            <CheckCircle size={24} className="text-cream-50" />
          ) : (
            <>
              <Upload size={20} className="text-cream-50" />
              <span className="font-sans text-[10px] tracking-[0.2em] uppercase text-cream-50">
                {displayUrl ? 'Replace' : 'Upload'}
              </span>
            </>
          )}
        </div>

        {!displayUrl && state === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
            <Upload size={20} className="text-bark-400" />
            <span className="font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400">Drop photo here</span>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ''
          }}
        />
      </div>

      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-sans text-xs font-medium text-bark-600">{label}</p>
            <p className="font-sans text-[10px] text-bark-400 mt-0.5 leading-relaxed">{description}</p>
          </div>
          {displayUrl && (
            <button
              type="button"
              onClick={removeFile}
              disabled={removing}
              className="shrink-0 inline-flex items-center gap-1 font-sans text-[9px] tracking-[0.15em] uppercase text-bark-400 hover:text-red-500 transition-colors disabled:opacity-40"
            >
              {removing ? <Loader size={10} className="animate-spin" /> : <Trash2 size={10} />} Remove
            </button>
          )}
        </div>
        {state === 'error' && <p className="font-sans text-[10px] text-red-500 mt-1">{errorMsg ?? 'Upload failed'}</p>}
        {state === 'done' && <p className="font-sans text-[10px] text-sage-500 mt-1">Uploaded — live on homepage</p>}
      </div>
    </div>
  )
}

export function VideoSlotCard({ slotKey, label, description }: { slotKey: string; label: string; description: string }) {
  const [state, setState] = useState<UploadState>('idle')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setState('uploading')
    const form = new FormData()
    form.append('file', file)
    form.append('slot', slotKey)
    try {
      const res = await fetch('/api/portal/home-videos/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (data.url) {
        setVideoUrl(data.url + `?t=${Date.now()}`)
        setState('done')
        setErrorMsg(null)
      } else {
        setErrorMsg(data.error ?? 'Upload failed')
        setState('error')
      }
    } catch (err) {
      setErrorMsg(String(err))
      setState('error')
    }
  }

  return (
    <div className="bg-cream-50 border border-cream-200 rounded-xl overflow-hidden">
      <div
        className="relative bg-cream-200 cursor-pointer group"
        style={{ aspectRatio: '16/9' }}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault()
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
      >
        {videoUrl ? (
          <video src={videoUrl} className="w-full h-full object-cover" muted playsInline autoPlay loop />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <Video size={28} className="text-bark-300" />
            <span className="font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400">No video yet</span>
          </div>
        )}
        <div className={`absolute inset-0 flex flex-col items-center justify-center gap-2 transition-opacity
          ${state === 'uploading'
            ? 'bg-cream-50/80 opacity-100'
            : 'opacity-0 group-hover:opacity-100 bg-bark-600/50'}`}
        >
          {state === 'uploading' ? (
            <Loader size={24} className="text-bark-600 animate-spin" />
          ) : state === 'done' ? (
            <CheckCircle size={24} className="text-cream-50" />
          ) : (
            <>
              <Upload size={20} className="text-cream-50" />
              <span className="font-sans text-[10px] tracking-[0.2em] uppercase text-cream-50">
                {videoUrl ? 'Replace Video' : 'Upload Video'}
              </span>
            </>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ''
          }}
        />
      </div>
      <div className="px-4 py-3">
        <p className="font-sans text-xs font-medium text-bark-600">{label}</p>
        <p className="font-sans text-[10px] text-bark-400 mt-0.5 leading-relaxed">{description}</p>
        {state === 'error' && <p className="font-sans text-[10px] text-red-500 mt-1">{errorMsg ?? 'Upload failed'}</p>}
        {state === 'done' && <p className="font-sans text-[10px] text-sage-500 mt-1">Video uploaded — live on homepage</p>}
      </div>
    </div>
  )
}

interface BestsellerItem { id: string; name: string; category: string; image: string | null; featured: boolean }

function BestsellerCard({ item, curated, onRemove }: { item: BestsellerItem; curated: boolean; onRemove: (id: string) => void }) {
  const productId = item.id
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [overrideUrl, setOverrideUrl] = useState<string | null>(null)
  const [hasOverride, setHasOverride] = useState(true)
  const [resetting, setResetting] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const carouselSlot = `carousel-${productId}`
  const carouselStorageUrl = `${SUPABASE_URL}/storage/v1/object/public/home-images/${carouselSlot}.jpg`
  const productDefaultUrl = item.image || `${SUPABASE_URL}/storage/v1/object/public/product-images/${productId}.jpg`

  const [imgPhase, setImgPhase] = useState(0)
  const displayUrl = overrideUrl ?? (hasOverride ? carouselStorageUrl : productDefaultUrl)

  async function removeFromList() {
    setRemoving(true)
    try {
      await fetch('/api/portal/bestsellers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: productId, featured: false }),
      })
      onRemove(productId)
    } finally { setRemoving(false) }
  }

  async function handleFile(file: File) {
    setUploadState('uploading')
    const form = new FormData()
    form.append('file', file)
    form.append('slot', carouselSlot)
    try {
      const res = await fetch('/api/portal/home-images/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (data.url) {
        setOverrideUrl(data.url + `?t=${Date.now()}`)
        setHasOverride(true)
        setImgPhase(0)
        setUploadState('done')
        setErrorMsg(null)
      } else {
        setErrorMsg(data.error ?? 'Upload failed')
        setUploadState('error')
      }
    } catch (err) {
      setErrorMsg(String(err))
      setUploadState('error')
    }
  }

  async function resetToDefault() {
    setResetting(true)
    try {
      await fetch('/api/portal/home-images/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot: carouselSlot }),
      })
      setOverrideUrl(null)
      setHasOverride(false)
      setImgPhase(0)
      setUploadState('idle')
    } finally {
      setResetting(false)
    }
  }

  const isOverrideActive = !!overrideUrl || hasOverride

  return (
    <div className="bg-cream-50 border border-cream-200 rounded-xl overflow-hidden">
      <div
        className="relative bg-cream-200 cursor-pointer group"
        style={{ aspectRatio: '3/4' }}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault()
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
      >
        {displayUrl && imgPhase < 2 && (
          <Image
            src={displayUrl}
            alt={item.name}
            fill
            className="object-cover"
            unoptimized
            onError={() => {
              if (imgPhase === 0) {
                setHasOverride(false)
                setImgPhase(1)
              } else {
                setImgPhase(2)
              }
            }}
          />
        )}
        {imgPhase >= 2 && (
          <div className="absolute inset-0 flex items-center justify-center bg-cream-100 font-sans text-[10px] tracking-[0.2em] uppercase text-bark-300">
            No photo
          </div>
        )}

        {isOverrideActive && imgPhase < 2 && (
          <div className="absolute top-2 left-2 bg-gold-400/90 text-bark-800 font-sans text-[8px] tracking-[0.15em] uppercase px-2 py-0.5 rounded-full">
            Override active
          </div>
        )}

        <div className={`absolute inset-0 flex flex-col items-center justify-center gap-2 transition-opacity
          ${uploadState === 'uploading'
            ? 'bg-cream-50/80 opacity-100'
            : 'opacity-0 group-hover:opacity-100 bg-bark-600/50'}`}
        >
          {uploadState === 'uploading' ? (
            <Loader size={22} className="text-bark-600 animate-spin" />
          ) : uploadState === 'done' ? (
            <CheckCircle size={22} className="text-cream-50" />
          ) : (
            <>
              <Upload size={18} className="text-cream-50" />
              <span className="font-sans text-[10px] tracking-[0.2em] uppercase text-cream-50">Upload Override</span>
            </>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ''
          }}
        />
      </div>

      <div className="px-3 py-3">
        <p className="font-sans text-[9px] tracking-[0.2em] uppercase text-gold-500 mb-0.5">
          {CATEGORY_LABELS[item.category as keyof typeof CATEGORY_LABELS] ?? item.category}
        </p>
        <p className="font-sans text-xs font-medium text-bark-600 leading-snug mb-2">{item.name}</p>

        <div className="flex items-center justify-between gap-2">
          <button
            onClick={resetToDefault}
            disabled={resetting || (!overrideUrl && !hasOverride)}
            className="flex items-center gap-1.5 font-sans text-[9px] tracking-[0.15em] uppercase text-bark-400 hover:text-bark-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {resetting ? <Loader size={10} className="animate-spin" /> : <RotateCcw size={10} />}
            Reset photo
          </button>
          <button
            onClick={removeFromList}
            disabled={removing || !curated}
            title={curated ? 'Remove from bestsellers' : 'Pick at least one bestseller to curate the list'}
            className="flex items-center gap-1.5 font-sans text-[9px] tracking-[0.15em] uppercase text-bark-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {removing ? <Loader size={10} className="animate-spin" /> : <Trash2 size={10} />}
            Remove
          </button>
        </div>

        {uploadState === 'error' && (
          <p className="font-sans text-[10px] text-red-500 mt-1">{errorMsg ?? 'Upload failed'}</p>
        )}
        {uploadState === 'done' && (
          <p className="font-sans text-[10px] text-sage-500 mt-1">Photo live on homepage</p>
        )}
      </div>
    </div>
  )
}

export function BestsellerManager() {
  const [items, setItems] = useState<BestsellerItem[]>([])
  const [addable, setAddable] = useState<Array<{ id: string; name: string; category: string }>>([])
  const [curated, setCurated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/portal/bestsellers')
      const data = await res.json()
      setItems(data.items ?? [])
      setAddable(data.addable ?? [])
      setCurated(!!data.curated)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function addProduct(id: string) {
    if (!id) return
    setAdding(true)
    try {
      await fetch('/api/portal/bestsellers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, featured: true }),
      })
      await load()
    } finally { setAdding(false) }
  }

  return (
    <div>
      <p className="font-sans text-[10px] text-bark-400/80 mb-4">
        {curated
          ? 'These are exactly the products shown in the homepage carousel. Remove any, add more below, or upload a photo override per product.'
          : 'No bestsellers picked yet — the carousel is auto-filled by top sales. Add products below to curate the exact list shown.'}
      </p>
      <div className="flex items-center gap-2 mb-4">
        <select
          defaultValue=""
          disabled={adding}
          onChange={e => { addProduct(e.target.value); e.target.value = '' }}
          className="px-3 py-2 border border-cream-300 bg-white rounded text-sm text-bark-600 focus:outline-none focus:border-bark-400 max-w-xs"
        >
          <option value="">+ Add a product to bestsellers…</option>
          {addable.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {adding && <Loader size={14} className="animate-spin text-bark-400" />}
      </div>
      {loading ? (
        <div className="flex items-center gap-2 font-sans text-sm text-bark-400 py-8"><Loader size={14} className="animate-spin" /> Loading…</div>
      ) : items.length === 0 ? (
        <p className="font-sans text-sm text-bark-400 py-4">No products to show.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {items.map(item => (
            <BestsellerCard key={item.id} item={item} curated={curated} onRemove={() => load()} />
          ))}
        </div>
      )}
    </div>
  )
}
