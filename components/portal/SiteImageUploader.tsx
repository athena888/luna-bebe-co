'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader, Upload, Sparkles, Trash2, Check } from 'lucide-react'
import { resizeImage } from '@/lib/image-resize'

// Self-contained uploader for a `site_images` slot (fetches its own current
// value). Posts to /api/portal/site-images, with alt text + ✨ AI alt. Used
// inside the Story editor so each image edits beside its copy.
export function SiteImageUploader({ slotKey, ratio, hint, context, compact = false }: {
  slotKey: string
  ratio?: string
  hint?: string
  context: string
  compact?: boolean
}) {
  const [url, setUrl] = useState('')
  const [alt, setAlt] = useState('')
  const [busy, setBusy] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [msg, setMsg] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let alive = true
    fetch(`/api/site-images?keys=${encodeURIComponent(slotKey)}`)
      .then(r => r.json())
      .then(d => { if (alive) { const cur = d.images?.[slotKey]; if (cur) { setUrl(cur.public_url); setAlt(cur.alt_text ?? '') } } })
      .catch(() => {})
    return () => { alive = false }
  }, [slotKey])

  async function upload(file: File) {
    setBusy(true); setMsg('')
    try {
      const resized = await resizeImage(file, 2000, 0.9)
      // resizeImage returns the original if it can't decode (e.g. HEIC on Chrome)
      const isHeic = /heic|heif/i.test(resized.type) || /\.(heic|heif)$/i.test(resized.name)
      if (isHeic) {
        setMsg('HEIC not supported here — in Photos, tap Share → Save as JPEG, then upload again.')
        return
      }
      const form = new FormData()
      form.append('file', resized)
      form.append('slotKey', slotKey)
      form.append('altText', alt.trim())
      const res = await fetch('/api/portal/site-images', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok || !data.url) { setMsg(data.error || 'Upload failed'); return }
      setUrl(data.url + `?t=${Date.now()}`)
      setMsg(alt.trim() ? 'Saved' : 'Uploaded — add alt text (or ✨)')
      setTimeout(() => setMsg(''), alt.trim() ? 2000 : 4000)
    } finally { setBusy(false) }
  }

  async function saveAlt(text = alt) {
    if (!text.trim()) return
    setBusy(true)
    try {
      const form = new FormData()
      form.append('slotKey', slotKey)
      form.append('altText', text.trim())
      await fetch('/api/portal/site-images', { method: 'POST', body: form })
      setMsg('Alt saved'); setTimeout(() => setMsg(''), 1800)
    } finally { setBusy(false) }
  }

  async function remove() {
    if (!confirm('Remove this image?')) return
    setBusy(true); setMsg('')
    try {
      const res = await fetch(`/api/portal/site-images?slotKey=${encodeURIComponent(slotKey)}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setMsg(d.error || 'Delete failed'); return }
      setUrl(''); setAlt(''); setMsg('Removed'); setTimeout(() => setMsg(''), 1800)
    } finally { setBusy(false) }
  }

  async function suggestAlt() {
    const clean = url.split('?')[0]
    if (!clean) return
    setSuggesting(true); setMsg('')
    try {
      const res = await fetch('/api/portal/site-images/alt-suggest', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageUrl: clean, context }),
      })
      const data = await res.json()
      if (data.altText) { setAlt(data.altText); await saveAlt(data.altText) }
      else { setMsg(data.error || 'AI failed'); setTimeout(() => setMsg(''), 2500) }
    } catch { setMsg('AI failed'); setTimeout(() => setMsg(''), 2500) } finally { setSuggesting(false) }
  }

  return (
    <div>
      {(ratio || hint) && <p className="font-sans text-[10px] text-bark-400 mb-1.5">{ratio}{hint ? ` · ${hint}` : ''}</p>}
      <div
        className={`relative ${compact ? 'aspect-square' : 'aspect-[3/4]'} bg-cream-100 rounded-lg overflow-hidden mb-2 cursor-pointer border border-cream-200 group`}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) upload(f) }}
      >
        {url
          ? <img src={url} alt={alt} className="w-full h-full object-cover" />
          : <div className="absolute inset-0 flex items-center justify-center text-bark-300"><Upload size={18} /></div>}
        <div className="absolute inset-0 bg-bark-600/0 group-hover:bg-bark-600/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          {busy ? <Loader size={18} className="text-white animate-spin" /> : <span className="font-sans text-[10px] tracking-[0.2em] uppercase text-white">{url ? 'Replace' : 'Upload'}</span>}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml,image/heic,image/heif" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = '' }} />
      <div className="flex items-stretch gap-1.5">
        <input value={alt} onChange={e => setAlt(e.target.value)} onBlur={() => saveAlt()} placeholder="Alt text" className="flex-1 min-w-0 px-2 py-1.5 border border-cream-300 rounded text-xs text-bark-600 focus:outline-none focus:border-bark-400" />
        <button type="button" onClick={suggestAlt} disabled={suggesting || !url} title="AI alt text" className="shrink-0 inline-flex items-center px-2 rounded border border-gold-300 bg-gold-50/50 text-bark-600 hover:border-gold-400 transition-colors disabled:opacity-40">
          {suggesting ? <Loader size={12} className="animate-spin" /> : <Sparkles size={12} className="text-gold-400" />}
        </button>
      </div>
      <div className="flex items-center justify-between mt-1.5 min-h-[16px]">
        {msg ? <p className={`font-sans text-[10px] ${msg.includes('fail') ? 'text-red-500' : 'text-sage-600'}`}>{msg === 'Saved' ? <span className="inline-flex items-center gap-1"><Check size={10} /> Saved</span> : msg}</p> : <span />}
        {url && <button type="button" onClick={remove} disabled={busy} className="shrink-0 inline-flex items-center gap-1 font-sans text-[9px] tracking-[0.15em] uppercase text-bark-400 hover:text-red-500 transition-colors disabled:opacity-40"><Trash2 size={10} /> Remove</button>}
      </div>
    </div>
  )
}
