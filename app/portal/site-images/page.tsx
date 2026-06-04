'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader, Upload, Check } from 'lucide-react'
import { IMAGE_SLOTS, slotsByGroup, type ImageSlot } from '@/lib/image-slots'
import { resizeImage } from '@/lib/image-resize'

interface Current { public_url: string; alt_text: string }

function SlotCard({ slot, current, onSaved }: { slot: ImageSlot; current?: Current; onSaved: (key: string, img: Current) => void }) {
  const [url, setUrl] = useState(current?.public_url ?? '')
  const [alt, setAlt] = useState(current?.alt_text ?? '')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function upload(file: File) {
    if (!alt.trim()) { setMsg('Add alt text first (required for SEO)'); setTimeout(() => setMsg(''), 2500); return }
    setBusy(true); setMsg('')
    try {
      const resized = await resizeImage(file, 2000, 0.9)
      const form = new FormData()
      form.append('file', resized)
      form.append('slotKey', slot.key)
      form.append('altText', alt.trim())
      const res = await fetch('/api/portal/site-images', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok || !data.url) { setMsg(data.error || 'Upload failed'); return }
      setUrl(data.url + `?t=${Date.now()}`)
      onSaved(slot.key, { public_url: data.url, alt_text: alt.trim() })
      setMsg('Saved')
      setTimeout(() => setMsg(''), 2000)
    } finally { setBusy(false) }
  }

  async function saveAlt() {
    if (!alt.trim()) return
    setBusy(true)
    try {
      const form = new FormData()
      form.append('slotKey', slot.key)
      form.append('altText', alt.trim())
      await fetch('/api/portal/site-images', { method: 'POST', body: form })
      onSaved(slot.key, { public_url: url, alt_text: alt.trim() })
      setMsg('Alt saved'); setTimeout(() => setMsg(''), 2000)
    } finally { setBusy(false) }
  }

  return (
    <div className="bg-white border border-cream-300 rounded-xl p-4">
      <p className="font-sans text-sm font-medium text-bark-600">{slot.label}</p>
      <p className="font-sans text-[10px] text-bark-400 mb-2">{slot.ratio} · {slot.hint}</p>
      <div
        className="relative aspect-[4/3] bg-cream-100 rounded-lg overflow-hidden mb-2 cursor-pointer border border-cream-200 group"
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) upload(f) }}
      >
        {url
          ? <img src={url} alt={alt} className="w-full h-full object-cover" />
          : <div className="absolute inset-0 flex items-center justify-center text-bark-300"><Upload size={20} /></div>}
        <div className="absolute inset-0 bg-bark-600/0 group-hover:bg-bark-600/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          {busy ? <Loader size={18} className="text-white animate-spin" /> : <span className="font-sans text-[10px] tracking-[0.2em] uppercase text-white">Replace</span>}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = '' }} />
      <input
        value={alt}
        onChange={e => setAlt(e.target.value)}
        onBlur={saveAlt}
        placeholder="Alt text (required)"
        className="w-full px-2 py-1.5 border border-cream-300 rounded text-xs text-bark-600 focus:outline-none focus:border-bark-400"
      />
      {msg && <p className={`font-sans text-[10px] mt-1 ${msg.includes('fail') || msg.includes('alt text first') ? 'text-red-500' : 'text-sage-600'}`}>{msg === 'Saved' ? <span className="inline-flex items-center gap-1"><Check size={10} /> Saved</span> : msg}</p>}
    </div>
  )
}

export default function SiteImagesPage() {
  const [images, setImages] = useState<Record<string, Current>>({})
  const [loading, setLoading] = useState(true)
  const groups = slotsByGroup()

  useEffect(() => {
    fetch('/api/portal/site-images').then(r => r.json()).then(d => setImages(d.images ?? {})).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-6 sm:p-8 max-w-6xl">
      <h1 className="font-serif text-3xl text-bark-600 mb-1">Site Images</h1>
      <p className="font-sans text-sm text-bark-400 mb-8 max-w-2xl">
        Upload or replace any standalone image slot — Story, Build banners, Gift Guide, gift card, and the social-share image.
        Changes go live within a minute. <strong>Alt text is required</strong> (it&rsquo;s read by search engines &amp; screen readers).
        Home page tiles are managed under <a href="/portal/home-images" className="text-gold-500 underline">Home Images</a>.
      </p>

      {loading ? (
        <div className="flex items-center gap-3 font-sans text-sm text-bark-400 py-12"><Loader size={16} className="animate-spin" /> Loading…</div>
      ) : (
        Object.entries(groups).map(([group, slots]) => (
          <div key={group} className="mb-10">
            <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark-400 mb-4 pb-2 border-b border-cream-300">{group}</p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {slots.map(slot => (
                <SlotCard key={slot.key} slot={slot} current={images[slot.key]} onSaved={(k, img) => setImages(prev => ({ ...prev, [k]: img }))} />
              ))}
            </div>
          </div>
        ))
      )}
      <p className="font-sans text-[10px] text-bark-400/70 mt-2">{IMAGE_SLOTS.length} slots · stored in the home-images bucket · resized to ~2000px before upload.</p>
    </div>
  )
}
