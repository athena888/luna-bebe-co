'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Loader, Plus, Trash2, Check, Upload, Sparkles, ArrowRight } from 'lucide-react'
import { resizeImage } from '@/lib/image-resize'
import type { CardStyle, CardMeta } from '@/lib/card-styles'

const inputCls = 'w-full px-3 py-2 border border-cream-300 bg-white rounded text-sm text-bark-600 focus:outline-none focus:border-bark-400'
const labelCls = 'block font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-1'

interface Draft { name: string; sizeLabel: string; altText: string; wordLimit: string; sortOrder: string; active: boolean; file: File | null; preview: string; meta: CardMeta | null }

function emptyDraft(): Draft {
  return { name: '', sizeLabel: '', altText: '', wordLimit: '100', sortOrder: '0', active: true, file: null, preview: '', meta: null }
}

export default function CardStylesPage() {
  const [styles, setStyles] = useState<CardStyle[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft())
  const [busy, setBusy] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [err, setErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/portal/card-styles')
      const data = await res.json()
      setStyles(data.styles ?? [])
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  function startNew() { setEditing('new'); setDraft(emptyDraft()); setErr('') }
  function startEdit(s: CardStyle) {
    setEditing(s.id); setErr('')
    setDraft({ name: s.name, sizeLabel: s.size_label, altText: s.alt_text, wordLimit: String(s.word_limit), sortOrder: String(s.sort_order), active: s.active, file: null, preview: s.image_url, meta: s.meta ?? null })
  }

  async function pickFile(f: File | null) {
    if (!f) return
    // Cards are opaque artwork on cream — force JPEG so large PNGs don't blow
    // past the upload size limit.
    const resized = await resizeImage(f, 1800, 0.9, true)
    setDraft(d => ({ ...d, file: resized, preview: URL.createObjectURL(resized) }))
    // Auto-detect the card's name, description, size, message capacity, and
    // where the personal message should sit — so there's nothing to type.
    setDetecting(true); setErr('')
    try {
      const form = new FormData()
      form.append('file', resized)
      const res = await fetch('/api/portal/card-styles/detect', { method: 'POST', body: form })
      const data = await res.json()
      if (res.ok && data.detected) {
        const dt = data.detected as { name: string; altText: string; sizeLabel: string; wordLimit: number; meta: CardMeta }
        setDraft(d => ({
          ...d,
          name: d.name.trim() || dt.name,
          altText: d.altText.trim() || dt.altText,
          sizeLabel: d.sizeLabel.trim() || dt.sizeLabel,
          wordLimit: (!d.wordLimit || d.wordLimit === '100') ? String(dt.wordLimit) : d.wordLimit,
          meta: dt.meta ?? d.meta,
        }))
      }
    } catch { /* detection is best-effort */ } finally { setDetecting(false) }
  }

  async function save() {
    if (!draft.name.trim()) { setErr('Name is required'); return }
    if (editing === 'new' && !draft.file) { setErr('Upload a card image'); return }
    setBusy(true); setErr('')
    try {
      const form = new FormData()
      if (editing && editing !== 'new') form.append('id', editing)
      form.append('name', draft.name.trim())
      form.append('sizeLabel', draft.sizeLabel.trim())
      form.append('altText', draft.altText.trim())
      form.append('wordLimit', draft.wordLimit || '100')
      form.append('sortOrder', draft.sortOrder || '0')
      form.append('active', String(draft.active))
      if (draft.meta) form.append('meta', JSON.stringify(draft.meta))
      if (draft.file) form.append('file', draft.file)
      const res = await fetch('/api/portal/card-styles', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) { setErr(data.error || 'Save failed'); return }
      setEditing(null)
      await load()
    } finally { setBusy(false) }
  }

  async function remove(id: string) {
    if (!confirm('Delete this card style?')) return
    await fetch(`/api/portal/card-styles?id=${id}`, { method: 'DELETE' })
    await load()
  }

  // Message-placement zone (where the printed note sits) + font.
  const zone = draft.meta?.textZone ?? { x: 15, y: 40, w: 70, align: 'center' as const }
  const setZone = (patch: Partial<typeof zone>) =>
    setDraft(d => {
      const cur = d.meta?.textZone ?? { x: 15, y: 40, w: 70, align: 'center' as const }
      return { ...d, meta: { ...(d.meta ?? {}), textZone: { ...cur, ...patch } } }
    })
  const setFont = (font: 'serif' | 'script') =>
    setDraft(d => ({ ...d, meta: { ...(d.meta ?? {}), font } }))

  return (
    <div className="p-6 sm:p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-serif text-3xl text-bark-600">Card Styles</h1>
        {editing === null && (
          <button onClick={startNew} className="flex items-center gap-2 bg-bark-600 text-white font-sans text-[11px] tracking-[0.2em] uppercase px-5 py-2.5 rounded hover:bg-bark-700 transition-colors">
            <Plus size={14} /> Add Style
          </button>
        )}
      </div>
      <p className="font-sans text-sm text-bark-400 mb-3 max-w-2xl">
        Upload the printed greeting-card designs customers can choose from. Each style has a physical size and a word limit for the printed message.
      </p>
      <Link href="/portal/inside-card" className="inline-flex items-center gap-1.5 font-sans text-[11px] tracking-[0.1em] uppercase text-gold-500 hover:text-gold-600 mb-8">
        Edit inside-card item content (back-of-card descriptions) <ArrowRight size={12} />
      </Link>

      {/* Editor */}
      {editing !== null && (
        <div className="bg-white border border-cream-300 rounded-xl p-6 mb-8">
          <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark-400 mb-5">{editing === 'new' ? 'New Card Style' : 'Edit Card Style'}</p>
          <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-6">
            {/* Image */}
            <div>
              <div className="relative rounded-lg overflow-hidden border border-cream-300 bg-cream-100 mb-2">
                {draft.preview
                  ? <img src={draft.preview} alt="" className="w-full h-auto block" />
                  : <div className="aspect-[3/4] flex items-center justify-center text-bark-300"><Upload size={20} /></div>}
                {/* Message zone — drag the sliders below to position it */}
                {draft.preview && (
                  <div
                    className="absolute border border-dashed border-[#7b876a] bg-[#7b876a]/10 pointer-events-none flex items-center justify-center"
                    style={{ left: `${zone.x}%`, top: `${zone.y}%`, width: `${zone.w}%`, height: '20%' }}
                  >
                    <span className="font-sans text-[8px] tracking-[0.15em] uppercase text-[#5f6b4e]">message here</span>
                  </div>
                )}
                {detecting && (
                  <div className="absolute inset-0 bg-cream-50/70 flex items-center justify-center gap-2">
                    <Sparkles size={14} className="text-gold-400 animate-pulse" />
                    <span className="font-sans text-[10px] tracking-[0.15em] uppercase text-bark-500">Reading card…</span>
                  </div>
                )}
              </div>
              {draft.meta && !detecting && (
                <p className="font-sans text-[10px] text-sage-600 mb-2 inline-flex items-center gap-1"><Sparkles size={10} /> Auto-filled — edit anything below</p>
              )}
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => { pickFile(e.target.files?.[0] ?? null); e.target.value = '' }} />
              <button type="button" onClick={() => fileRef.current?.click()} className="w-full flex items-center justify-center gap-2 border border-cream-300 bg-cream-50 text-bark-600 text-[11px] tracking-[0.15em] uppercase py-2 rounded hover:border-bark-400">
                <Upload size={12} /> {draft.preview ? 'Replace image' : 'Upload image'}
              </button>
            </div>
            {/* Fields */}
            <div className="space-y-3">
              <div><label className={labelCls}>Style name</label><input className={inputCls} value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="e.g. Pressed Lavender" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Size</label><input className={inputCls} value={draft.sizeLabel} onChange={e => setDraft(d => ({ ...d, sizeLabel: e.target.value }))} placeholder="A6 — 4.1 × 5.8 in" /></div>
                <div><label className={labelCls}>Word limit</label><input type="number" className={inputCls} value={draft.wordLimit} onChange={e => setDraft(d => ({ ...d, wordLimit: e.target.value }))} /></div>
              </div>
              <div><label className={labelCls}>Alt text (for SEO/accessibility)</label><input className={inputCls} value={draft.altText} onChange={e => setDraft(d => ({ ...d, altText: e.target.value }))} placeholder="Describe the card design" /></div>
              <div className="grid grid-cols-2 gap-3 items-end">
                <div><label className={labelCls}>Sort order</label><input type="number" className={inputCls} value={draft.sortOrder} onChange={e => setDraft(d => ({ ...d, sortOrder: e.target.value }))} /></div>
                <label className="flex items-center gap-2 cursor-pointer pb-2"><input type="checkbox" checked={draft.active} onChange={e => setDraft(d => ({ ...d, active: e.target.checked }))} className="accent-bark-600 w-4 h-4" /><span className="font-sans text-sm text-bark-500">Show to customers</span></label>
              </div>

              {/* Message placement — fixes any card whose auto-position is off */}
              <div className="border-t border-cream-200 pt-3">
                <label className={labelCls}>Message placement{draft.meta?.theme ? ` · ${draft.meta.theme}` : ''}</label>
                <p className="font-sans text-[10px] text-bark-400 mb-2">Move the dashed box over the card&rsquo;s empty area — that&rsquo;s where the printed note prints.</p>
                {[
                  { k: 'x' as const, label: 'Left', min: 0, max: 90 },
                  { k: 'y' as const, label: 'Top', min: 0, max: 90 },
                  { k: 'w' as const, label: 'Width', min: 15, max: 100 },
                ].map(({ k, label, min, max }) => (
                  <div key={k} className="flex items-center gap-2 mb-1.5">
                    <span className="w-10 font-sans text-[10px] text-bark-400">{label}</span>
                    <input type="range" min={min} max={max} value={zone[k]} onChange={e => setZone({ [k]: +e.target.value })} className="flex-1 accent-[#7b876a]" />
                    <span className="w-8 text-right font-sans text-[10px] text-bark-500">{zone[k]}%</span>
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div><label className={labelCls}>Align</label>
                    <select value={zone.align} onChange={e => setZone({ align: e.target.value as 'left' | 'center' | 'right' })} className={inputCls}>
                      <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
                    </select>
                  </div>
                  <div><label className={labelCls}>Font</label>
                    <select value={draft.meta?.font ?? 'serif'} onChange={e => setFont(e.target.value as 'serif' | 'script')} className={inputCls}>
                      <option value="serif">Serif (classic)</option><option value="script">Script (flowing)</option>
                    </select>
                  </div>
                </div>
              </div>

              {err && <p className="font-sans text-xs text-red-500">{err}</p>}
              <div className="flex gap-2 pt-1">
                <button onClick={save} disabled={busy} className="flex items-center gap-2 bg-bark-600 text-white font-sans text-[11px] tracking-[0.2em] uppercase px-5 py-2.5 rounded hover:bg-bark-700 disabled:opacity-50">
                  {busy ? <Loader size={13} className="animate-spin" /> : <Check size={13} />} Save
                </button>
                <button onClick={() => setEditing(null)} className="font-sans text-[11px] tracking-[0.2em] uppercase px-5 py-2.5 rounded border border-cream-300 text-bark-500 hover:border-bark-400">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center gap-3 font-sans text-sm text-bark-400 py-12"><Loader size={16} className="animate-spin" /> Loading…</div>
      ) : styles.length === 0 ? (
        <p className="font-sans text-sm text-bark-400 py-8">No card styles yet. Add one so customers can choose a printed card.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {styles.map(s => (
            <div key={s.id} className="bg-white border border-cream-300 rounded-xl overflow-hidden">
              <div className="relative aspect-[3/2] bg-cream-100">
                <img src={s.image_url} alt={s.alt_text} className="w-full h-full object-cover" />
                {!s.active && <span className="absolute top-2 left-2 bg-bark-600/85 text-white text-[9px] tracking-[0.1em] uppercase px-2 py-0.5 rounded">Hidden</span>}
              </div>
              <div className="p-4">
                <p className="font-serif text-lg text-bark-600">{s.name}</p>
                <p className="font-sans text-[11px] text-bark-400">{s.size_label || '—'} · {s.word_limit} words max</p>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => startEdit(s)} className="flex-1 font-sans text-[10px] tracking-[0.15em] uppercase py-2 rounded border border-cream-300 text-bark-500 hover:border-bark-400">Edit</button>
                  <button onClick={() => remove(s.id)} className="p-2 rounded border border-cream-300 text-bark-400 hover:text-red-500 hover:border-red-300"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
