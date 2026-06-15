'use client'

import { useState } from 'react'
import { Loader, Upload, Trash2, Film } from 'lucide-react'

const MAX = 4.3 * 1024 * 1024 // serverless body limit ~4.5MB

// Upload a short product video (reuses the hover-video route + product-images
// bucket). Playback is optimized: preload="none" + a poster means it never slows
// the page — it only loads when played/viewed.
export function ProductVideoUpload({ productId, initialUrl, poster }: { productId: string; initialUrl: string | null; poster?: string | null }) {
  const [url, setUrl] = useState<string | null>(initialUrl)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [bust, setBust] = useState(0)

  async function upload(file: File) {
    if (file.size > MAX) { setErr('Too large — keep it under ~4MB (a short, compressed 3–6s clip).'); return }
    setBusy(true); setErr('')
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch(`/api/portal/products/${productId}/hover-video`, { method: 'POST', body: fd })
      const d = await res.json()
      if (res.ok && d.videoUrl) { setUrl(d.videoUrl); setBust(b => b + 1) }
      else setErr(d.error || 'Upload failed')
    } catch { setErr('Upload failed') } finally { setBusy(false) }
  }
  async function remove() {
    setBusy(true)
    try { await fetch(`/api/portal/products/${productId}/hover-video`, { method: 'DELETE' }); setUrl(null) }
    finally { setBusy(false) }
  }

  return (
    <div className="bg-white border border-cream-200 rounded-lg p-4">
      <p className="font-sans text-sm font-medium text-bark-600 mb-1 flex items-center gap-1.5"><Film size={14} className="text-bark-400" /> Product video</p>
      <p className="font-sans text-[11px] text-bark-400 mb-3 leading-relaxed">A short clip (MP4 / WebM, ideally 3–6s, under ~4MB). It loads only when played, so it never slows the product page.</p>
      {url ? (
        <div>
          <video key={bust} src={`${url}${url.includes('?') ? '&' : '?'}t=${bust}`} poster={poster ?? undefined} preload="none" muted loop playsInline controls
            className="w-full max-w-xs rounded border border-cream-200 bg-cream-100" />
          <div className="mt-2 flex items-center gap-3">
            <label className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.15em] uppercase text-bark-400 hover:text-bark-600 cursor-pointer">
              <Upload size={12} /> Replace
              <input type="file" accept="video/mp4,video/webm,video/quicktime" disabled={busy} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = '' }} />
            </label>
            <button onClick={remove} disabled={busy} className="inline-flex items-center gap-1 text-[10px] tracking-[0.15em] uppercase text-bark-400 hover:text-red-500"><Trash2 size={12} /> Remove</button>
          </div>
        </div>
      ) : (
        <label className={`inline-flex items-center gap-2 font-sans text-[11px] tracking-[0.15em] uppercase px-4 py-2.5 rounded cursor-pointer transition-colors ${busy ? 'bg-cream-200 text-bark-400' : 'bg-bark-600 text-cream-50 hover:bg-bark-700'}`}>
          {busy ? <Loader size={14} className="animate-spin" /> : <Upload size={14} />} {busy ? 'Uploading…' : 'Upload video'}
          <input type="file" accept="video/mp4,video/webm,video/quicktime" disabled={busy} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = '' }} />
        </label>
      )}
      {err && <p className="font-sans text-xs text-red-500 mt-2">{err}</p>}
    </div>
  )
}
