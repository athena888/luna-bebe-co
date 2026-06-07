'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Upload, CheckCircle, Loader, Video, RotateCcw, Trash2, Plus } from 'lucide-react'
import { CATEGORY_LABELS } from '@/lib/products'
import { resizeImage } from '@/lib/image-resize'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

function getStorageUrl(slot: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/home-images/${slot}.jpg`
}

type UploadState = 'idle' | 'uploading' | 'done' | 'error'

function ImageSlotCard({
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

function VideoSlotCard({ slotKey, label, description }: { slotKey: string; label: string; description: string }) {
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

  // What to display: override → product default → placeholder
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
      {/* Image preview */}
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

        {/* Override badge */}
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

      {/* Info + actions */}
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

function BestsellerManager() {
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
    <div className="mb-10">
      <SectionHeader
        label="Bestsellers Carousel"
        note={curated
          ? "These are exactly the products shown in the homepage carousel. Remove any, add more below, or upload a photo override per product."
          : "No bestsellers picked yet — the carousel is auto-filled by top sales. Add products below to curate the exact list shown."}
      />
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

function BoxGalleryManager() {
  const [images, setImages] = useState<Array<{ path: string; url: string }>>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/portal/home-gallery')
      const data = await res.json()
      setImages(data.images ?? [])
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function addFiles(files: FileList | null) {
    if (!files?.length) return
    setBusy(true)
    try {
      for (const f of Array.from(files)) {
        const resized = await resizeImage(f, 2000, 0.9)
        const form = new FormData()
        form.append('file', resized)
        await fetch('/api/portal/home-gallery', { method: 'POST', body: form })
      }
      await load()
    } finally { setBusy(false) }
  }

  async function remove(path: string) {
    if (!confirm('Remove this photo from the gallery?')) return
    setImages(imgs => imgs.filter(i => i.path !== path))
    await fetch(`/api/portal/home-gallery?path=${encodeURIComponent(path)}`, { method: 'DELETE' })
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {!loading && images.map(img => (
        <div key={img.path} className="relative group aspect-[4/3] bg-cream-200 rounded-xl overflow-hidden border border-cream-200">
          <Image src={img.url} alt="Box gallery photo" fill className="object-cover" unoptimized />
          <button
            onClick={() => remove(img.path)}
            className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center bg-white/90 rounded-full text-bark-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Remove"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="aspect-[4/3] border-2 border-dashed border-cream-300 rounded-xl flex flex-col items-center justify-center gap-2 text-bark-400 hover:border-bark-400 hover:text-bark-600 transition-colors disabled:opacity-50"
      >
        {busy ? <Loader size={20} className="animate-spin" /> : <Plus size={20} />}
        <span className="font-sans text-[10px] tracking-[0.15em] uppercase">{busy ? 'Uploading…' : 'Add photo(s)'}</span>
      </button>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden"
        onChange={e => { addFiles(e.target.files); e.target.value = '' }} />
    </div>
  )
}

function SectionHeader({ label, note }: { label: string; note?: string }) {
  return (
    <div className="mb-4 pb-3 border-b border-cream-300">
      <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark-400">{label}</p>
      {note && <p className="font-sans text-[10px] text-bark-400/70 mt-1">{note}</p>}
    </div>
  )
}

export default function HomeImagesPage() {
  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-10">
        <h1 className="font-serif text-3xl text-bark-600">Homepage Photos</h1>
        <p className="font-sans text-sm text-bark-400 mt-1">
          Click or drag a photo onto any slot to replace it. Goes live instantly.
        </p>
      </div>

      {/* ── Bestsellers Carousel ── */}
      <BestsellerManager />

      {/* ── 1. Hero ── */}
      <div className="mb-10">
        <SectionHeader label="1 · Hero" note="Full-width banner at the top of the homepage." />
        <div className="max-w-2xl">
          <ImageSlotCard wide slotKey="hero" label="Hero Image" description="Landscape — the box centered, lifestyle feel. Recommended: 2400 × 1400px." />
        </div>
      </div>

      {/* ── 2. Collection Cards ── */}
      <div className="mb-10">
        <SectionHeader label="2 · Shop by Occasion cards" note="Four cards in the 'Shop by Occasion' grid. Vertical / portrait format." />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <ImageSlotCard slotKey="newborn" label="Newborn Gifts"      description="Baby in white eyelet romper" />
          <ImageSlotCard slotKey="mama"    label="For Mama"           description="Mom + baby, soft pink tones" />
          <ImageSlotCard slotKey="bundle"  label="Mama & Baby Bundle" description="Mom holding newborn, box on table" />
          <ImageSlotCard slotKey="custom"  label="Custom Box"         description="Baby on rug with bunny blanket" />
        </div>
      </div>

      {/* ── 3. Editorial Strip ── */}
      <div className="mb-10">
        <SectionHeader label="3 · Editorial Strip — &quot;Every detail, intentional.&quot;" note="Full-width cinematic section. Upload a video to make it loop; the photo is used as fallback." />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
          <ImageSlotCard wide slotKey="kraft" label="Editorial Photo" description="Fallback if no video — open box, cinematic crop. Recommended: 2000 × 1100px." />
          <VideoSlotCard slotKey="kraft" label="Editorial Video" description="Looping video overlay. MP4, MOV, or WebM — keep under 20 MB." />
        </div>
      </div>

      {/* ── 4. Brand Story ── */}
      <div className="mb-10">
        <SectionHeader label="4 · Brand Story — &quot;Organic Cotton, Ethically Sourced&quot;" note="Left half of the two-column editorial pair." />
        <div className="max-w-xs">
          <ImageSlotCard slotKey="brand" label="Brand Story" description="Portrait — baby in wicker basket with lavender. Recommended: 900 × 1100px." />
        </div>
      </div>

      {/* ── 5. What's Inside ── */}
      <div className="mb-10">
        <SectionHeader label="5 · What&apos;s Inside — &quot;A moment they'll never forget.&quot;" note="Right half of the two-column editorial pair." />
        <div className="max-w-xs">
          <ImageSlotCard slotKey="inside" label="What's Inside" description="Open box with letter, hello world disc. Recommended: 900 × 1100px." />
        </div>
      </div>

      {/* ── 6. Box Gallery (dynamic) ── */}
      <div className="mb-10">
        <SectionHeader label="6 · The Box Gallery — horizontal scroll" note="Add as many photos as you like — they appear in the scrollable strip on the homepage. Hover a photo to remove it." />
        <BoxGalleryManager />
      </div>

      {/* ── 7. CTA Background ── */}
      <div className="mb-10">
        <SectionHeader label="7 · Final CTA background — &quot;Create Something Unforgettable&quot;" note="Dark full-width section near the bottom of the page. Image appears at 40% opacity." />
        <div className="max-w-xs">
          <ImageSlotCard slotKey="box" label="CTA Background" description="Cream box with ribbon — dark/moody works best. Recommended: 1600 × 900px." />
        </div>
      </div>

      <div className="p-5 bg-cream-200/50 border border-cream-300 rounded-xl">
        <p className="font-sans text-xs text-bark-400 leading-loose">
          <span className="font-medium text-bark-600">All images are stored in Supabase Storage</span> under the{' '}
          <code className="bg-cream-300/60 px-1 rounded">home-images</code> bucket (photos) and{' '}
          <code className="bg-cream-300/60 px-1 rounded">home-videos</code> bucket (video). Changes go live immediately.
        </p>
      </div>
    </div>
  )
}
