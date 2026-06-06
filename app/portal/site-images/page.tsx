'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader, Upload, Check, Sparkles, Trash2 } from 'lucide-react'
import { IMAGE_SLOTS, slotsByGroup, type ImageSlot } from '@/lib/image-slots'
import { resizeImage } from '@/lib/image-resize'

interface Current { public_url: string; alt_text: string }

function SlotCard({ slot, current, onSaved }: { slot: ImageSlot; current?: Current; onSaved: (key: string, img: Current) => void }) {
  const [url, setUrl] = useState(current?.public_url ?? '')
  const [alt, setAlt] = useState(current?.alt_text ?? '')
  const [busy, setBusy] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [msg, setMsg] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function upload(file: File) {
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
      // Image is live; nudge for alt text if it's still missing (use the ✨ AI button).
      setMsg(alt.trim() ? 'Saved' : 'Uploaded — add alt text (or click ✨)')
      setTimeout(() => setMsg(''), alt.trim() ? 2000 : 4000)
    } finally { setBusy(false) }
  }

  async function saveAlt(text = alt) {
    if (!text.trim()) return
    setBusy(true)
    try {
      const form = new FormData()
      form.append('slotKey', slot.key)
      form.append('altText', text.trim())
      await fetch('/api/portal/site-images', { method: 'POST', body: form })
      onSaved(slot.key, { public_url: url, alt_text: text.trim() })
      setMsg('Alt saved'); setTimeout(() => setMsg(''), 2000)
    } finally { setBusy(false) }
  }

  async function remove() {
    if (!confirm('Remove this image? The page will fall back to its default.')) return
    setBusy(true); setMsg('')
    try {
      const res = await fetch(`/api/portal/site-images?slotKey=${encodeURIComponent(slot.key)}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setMsg(d.error || 'Delete failed'); return }
      setUrl(''); setAlt('')
      onSaved(slot.key, { public_url: '', alt_text: '' })
      setMsg('Removed'); setTimeout(() => setMsg(''), 2000)
    } finally { setBusy(false) }
  }

  async function suggestAlt() {
    const clean = url.split('?')[0]
    if (!clean) { setMsg('Upload an image first'); setTimeout(() => setMsg(''), 2500); return }
    setSuggesting(true); setMsg('')
    try {
      const res = await fetch('/api/portal/site-images/alt-suggest', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: clean, context: slot.label }),
      })
      const data = await res.json()
      if (data.altText) { setAlt(data.altText); await saveAlt(data.altText) }
      else { setMsg(data.error || 'AI failed'); setTimeout(() => setMsg(''), 2500) }
    } catch {
      setMsg('AI failed'); setTimeout(() => setMsg(''), 2500)
    } finally { setSuggesting(false) }
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
      <div className="flex items-stretch gap-1.5">
        <input
          value={alt}
          onChange={e => setAlt(e.target.value)}
          onBlur={() => saveAlt()}
          placeholder="Alt text (required)"
          className="flex-1 min-w-0 px-2 py-1.5 border border-cream-300 rounded text-xs text-bark-600 focus:outline-none focus:border-bark-400"
        />
        <button
          type="button"
          onClick={suggestAlt}
          disabled={suggesting || !url}
          title="Generate alt text with AI"
          className="shrink-0 inline-flex items-center gap-1 px-2 rounded border border-gold-300 bg-gold-50/50 text-bark-600 hover:border-gold-400 transition-colors disabled:opacity-40"
        >
          {suggesting ? <Loader size={12} className="animate-spin" /> : <Sparkles size={12} className="text-gold-400" />}
          <span className="text-[10px] tracking-[0.1em] uppercase hidden sm:inline">AI</span>
        </button>
      </div>
      <div className="flex items-center justify-between mt-1.5">
        {msg
          ? <p className={`font-sans text-[10px] ${msg.includes('fail') || msg.includes('alt text first') ? 'text-red-500' : 'text-sage-600'}`}>{msg === 'Saved' ? <span className="inline-flex items-center gap-1"><Check size={10} /> Saved</span> : msg}</p>
          : <span />}
        {url && (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="shrink-0 inline-flex items-center gap-1 font-sans text-[9px] tracking-[0.15em] uppercase text-bark-400 hover:text-red-500 transition-colors disabled:opacity-40"
          >
            <Trash2 size={10} /> Remove
          </button>
        )}
      </div>
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
