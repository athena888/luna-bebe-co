'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Loader, Upload, Trash2, Pencil, Check, X, AlertTriangle, BookOpen } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-browser'

// Lookbook image library. Upload (jpg/png/webp/heic ≤15MB) → browser PUTs the
// original straight to Supabase via a signed URL → server normalizes + one AI
// vision call auto-tags kind/tier/palette. Off-palette is a soft badge only —
// Emily always has final say via re-tag.

const KINDS = ['hero', 'tier', 'detail', 'lifestyle', 'logo'] as const

interface BrandImage {
  id: string; storage_path: string; kind: string | null; tier: string | null
  tags: string[]; off_palette: boolean; is_press?: boolean; width: number | null; height: number | null
  created_at: string; url?: string
}

export default function LookbookImagesPage() {
  const [images, setImages] = useState<BrandImage[]>([])
  const [tiers, setTiers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [edit, setEdit] = useState<{ kind: string; tier: string; tags: string }>({ kind: '', tier: '', tags: '' })
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [imgs, t] = await Promise.all([
        fetch('/api/portal/lookbook/images').then(r => r.json()),
        fetch('/api/portal/lookbook/tiers').then(r => r.json()),
      ])
      setImages(imgs.images ?? [])
      setTiers(((t.tiers ?? []) as { name: string }[]).map(x => x.name))
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  async function onFiles(files: FileList | null) {
    if (!files?.length) return
    setError(null)
    for (const file of Array.from(files)) {
      if (file.size > 15 * 1024 * 1024) { setError(`${file.name}: over the 15MB limit`); continue }
      setUploading(file.name)
      try {
        const signed = await fetch('/api/portal/lookbook/images/sign-upload', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name }),
        }).then(r => r.json())
        if (signed.error) throw new Error(signed.error)
        const up = await supabaseBrowser.storage.from('brand-assets')
          .uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type || 'application/octet-stream' })
        if (up.error) throw new Error(up.error.message)
        const processed = await fetch('/api/portal/lookbook/images/process', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: signed.path }),
        }).then(r => r.json())
        if (processed.error) throw new Error(processed.error)
      } catch (e) {
        setError(`${file.name}: ${e instanceof Error ? e.message : 'upload failed'}`)
      }
    }
    setUploading(null)
    if (fileRef.current) fileRef.current.value = ''
    await load()
  }

  async function saveTags(id: string) {
    await fetch('/api/portal/lookbook/images', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id, kind: edit.kind || null, tier: edit.tier || null,
        tags: edit.tags.split(',').map(s => s.trim()).filter(Boolean),
      }),
    })
    setEditing(null)
    await load()
  }

  async function remove(id: string) {
    if (!confirm('Delete this image? It will disappear from any unpublished lookbook draft.')) return
    await fetch(`/api/portal/lookbook/images?id=${id}`, { method: 'DELETE' })
    await load()
  }

  async function togglePress(img: BrandImage) {
    setImages(list => list.map(i => i.id === img.id ? { ...i, is_press: !img.is_press } : i))
    await fetch('/api/portal/lookbook/images', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: img.id, is_press: !img.is_press }),
    })
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="font-serif text-2xl text-bark-700">Lookbook — Image Library</h1>
        <Link href="/portal/lookbook/builder" className="inline-flex items-center gap-1.5 bg-bark-700 text-cream-50 hover:bg-bark-600 font-sans text-xs px-4 py-2.5 rounded-xl transition-colors">
          <BookOpen size={13} /> Open builder
        </Link>
      </div>
      <p className="font-sans text-xs text-bark-400 mb-5">jpg / png / webp / heic, up to 15MB. Images are auto-tagged by AI — you can re-tag anything. “Off palette” is a soft warning, never blocking.</p>

      <label className="block border-2 border-dashed border-cream-300 hover:border-gold-300 rounded-2xl p-8 text-center cursor-pointer bg-white transition-colors mb-3">
        <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp,.heic,.heif,image/*" multiple className="hidden"
          onChange={e => onFiles(e.target.files)} disabled={uploading !== null} />
        <div className="inline-flex items-center gap-2 font-sans text-sm text-bark-500">
          {uploading ? <><Loader size={15} className="animate-spin" /> Uploading + tagging {uploading}…</> : <><Upload size={15} /> Tap to upload photos</>}
        </div>
      </label>
      {error && <p className="font-sans text-xs text-bark-700 bg-rose-200/70 border border-rose-300 rounded-lg px-3 py-2 mb-4">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-16 text-bark-400"><Loader className="animate-spin" /></div>
      ) : !images.length ? (
        <p className="font-sans text-sm text-bark-400 text-center py-10">No images yet — upload product photos when you have them.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {images.map(img => (
            <div key={img.id} className="bg-white rounded-xl border border-cream-300 overflow-hidden">
              <div className="relative aspect-square bg-cream-200">
                {img.url && (
                  // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL; next/image can't optimize it
                  <img src={img.url} alt={img.tags.join(', ') || 'brand image'} className="w-full h-full object-cover" />
                )}
                {img.off_palette && (
                  <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 bg-gold-400/95 text-cream-50 font-sans text-[9px] tracking-wide uppercase px-1.5 py-0.5 rounded" title="Dominant colors sit outside the brand palette — your call.">
                    <AlertTriangle size={9} /> off palette
                  </span>
                )}
              </div>
              {editing === img.id ? (
                <div className="p-2 space-y-1.5">
                  <select value={edit.kind} onChange={e => setEdit({ ...edit, kind: e.target.value })}
                    className="w-full font-sans text-xs border border-cream-300 rounded px-1.5 py-1 bg-cream-50">
                    <option value="">kind…</option>
                    {KINDS.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                  <select value={edit.tier} onChange={e => setEdit({ ...edit, tier: e.target.value })}
                    className="w-full font-sans text-xs border border-cream-300 rounded px-1.5 py-1 bg-cream-50">
                    <option value="">tier…</option>
                    {tiers.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input value={edit.tags} onChange={e => setEdit({ ...edit, tags: e.target.value })} placeholder="tags, comma separated"
                    className="w-full font-sans text-xs border border-cream-300 rounded px-1.5 py-1 bg-cream-50" />
                  <div className="flex gap-1">
                    <button onClick={() => saveTags(img.id)} className="flex-1 inline-flex justify-center items-center gap-1 bg-sage-500 text-cream-50 rounded py-1 text-xs"><Check size={11} /> Save</button>
                    <button onClick={() => setEditing(null)} className="inline-flex items-center bg-cream-200 text-bark-500 rounded px-2 text-xs"><X size={11} /></button>
                  </div>
                </div>
              ) : (
                <div className="p-2">
                  <div className="flex items-center gap-1 font-sans text-[10px] text-bark-500 uppercase tracking-wide">
                    <span className="bg-cream-200 rounded px-1.5 py-0.5">{img.kind ?? 'untagged'}</span>
                    {img.tier && <span className="bg-sage-100 text-sage-600 rounded px-1.5 py-0.5 normal-case">{img.tier}</span>}
                    <button onClick={() => togglePress(img)}
                      title="Show this image on the public /press kit page (and its download zip)"
                      className={`rounded px-1.5 py-0.5 transition-colors ${img.is_press ? 'bg-terra-300 text-cream-50' : 'bg-cream-200 text-bark-300 hover:text-bark-500'}`}>
                      press
                    </button>
                  </div>
                  {img.tags.length > 0 && <p className="font-sans text-[10px] text-bark-400 mt-1 truncate">{img.tags.join(' · ')}</p>}
                  <div className="flex gap-1 mt-1.5">
                    <button onClick={() => { setEditing(img.id); setEdit({ kind: img.kind ?? '', tier: img.tier ?? '', tags: img.tags.join(', ') }) }}
                      className="inline-flex items-center gap-1 font-sans text-[10px] text-bark-500 hover:text-bark-700"><Pencil size={10} /> re-tag</button>
                    <button onClick={() => remove(img.id)} className="ml-auto inline-flex items-center gap-1 font-sans text-[10px] text-bark-400 hover:text-bark-700"><Trash2 size={10} /> delete</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
