'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Upload, CheckCircle, Loader, Video, RotateCcw } from 'lucide-react'
import { FEATURED_IDS, getProductById, CATEGORY_LABELS } from '@/lib/products'

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
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const displayUrl = url ?? (hasExisting ? getStorageUrl(slotKey) : null)
  const ratio = wide ? '16/9' : '4/3'

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
        <p className="font-sans text-xs font-medium text-bark-600">{label}</p>
        <p className="font-sans text-[10px] text-bark-400 mt-0.5 leading-relaxed">{description}</p>
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

function BestsellerCard({ productId }: { productId: string }) {
  const product = getProductById(productId)
  if (!product) return null

  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [overrideUrl, setOverrideUrl] = useState<string | null>(null)
  const [hasOverride, setHasOverride] = useState(true)
  const [resetting, setResetting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const carouselSlot = `carousel-${productId}`
  const carouselStorageUrl = `${SUPABASE_URL}/storage/v1/object/public/home-images/${carouselSlot}.jpg`
  const productDefaultUrl = `${SUPABASE_URL}/storage/v1/object/public/product-images/${productId}.jpg`

  // What to display: override → product default → emoji
  const [imgPhase, setImgPhase] = useState(0)
  const displayUrl = overrideUrl ?? (hasOverride ? carouselStorageUrl : productDefaultUrl)

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
            alt={product.name}
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
          <div className="absolute inset-0 flex items-center justify-center bg-cream-100" style={{ fontSize: '4rem' }}>
            {product.imageEmoji}
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
          {CATEGORY_LABELS[product.category as keyof typeof CATEGORY_LABELS]}
        </p>
        <p className="font-sans text-xs font-medium text-bark-600 leading-snug mb-2">{product.name}</p>

        <button
          onClick={resetToDefault}
          disabled={resetting || (!overrideUrl && !hasOverride)}
          className="flex items-center gap-1.5 font-sans text-[9px] tracking-[0.15em] uppercase text-bark-400 hover:text-bark-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          {resetting
            ? <Loader size={10} className="animate-spin" />
            : <RotateCcw size={10} />}
          Reset to default
        </button>

        {uploadState === 'error' && (
          <p className="font-sans text-[10px] text-red-500 mt-1">{errorMsg ?? 'Upload failed'}</p>
        )}
        {uploadState === 'done' && (
          <p className="font-sans text-[10px] text-sage-500 mt-1">Override live on homepage</p>
        )}
      </div>
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
      <div className="mb-10">
        <SectionHeader
          label="Bestsellers Carousel"
          note="Upload a photo override for any product. Falls back to the product's own photo, then the emoji. Click 'Reset to default' to remove the override."
        />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {FEATURED_IDS.map(id => <BestsellerCard key={id} productId={id} />)}
        </div>
      </div>

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

      {/* ── 6. Box Gallery ── */}
      <div className="mb-10">
        <SectionHeader label="6 · The Box Gallery — horizontal scroll" note="Four photos in the scrollable gallery strip below the brand story pair." />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <ImageSlotCard slotKey="gallery-1" label="Gallery Photo 1" description="Box detail or lifestyle shot" />
          <ImageSlotCard slotKey="gallery-2" label="Gallery Photo 2" description="Box detail or lifestyle shot" />
          <ImageSlotCard slotKey="gallery-3" label="Gallery Photo 3" description="Box detail or lifestyle shot" />
          <ImageSlotCard slotKey="gallery-4" label="Gallery Photo 4" description="Box detail or lifestyle shot" />
        </div>
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
