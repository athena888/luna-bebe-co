'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader, Plus, Trash2, Check, Upload, Sparkles } from 'lucide-react'
import type { HomeContent, Perk, FeatureBlock, Review } from '@/lib/home-content'
import { ImageSlotCard, VideoSlotCard, BestsellerManager } from '@/components/portal/HomeMediaWidgets'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

// ── AI copy assistant ────────────────────────────────────────────────────────
// A small ✨ button that asks Claude (brand voice) for a few on-brand options
// for the field it sits on; click one to drop it in.
function AiSuggest({ fieldLabel, kind, current, context, onPick }: {
  fieldLabel: string
  kind: 'eyebrow' | 'title' | 'tagline' | 'body' | 'bullet' | 'text'
  current?: string
  context?: string
  onPick: (v: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const [opts, setOpts] = useState<string[] | null>(null)
  const [err, setErr] = useState('')

  async function go() {
    setBusy(true); setErr(''); setOpts(null)
    try {
      const res = await fetch('/api/portal/home-content/ai-suggest', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldLabel, kind, current, context }),
      })
      const d = await res.json()
      if (d.options?.length) setOpts(d.options)
      else setErr(d.error || 'No ideas')
    } catch { setErr('Failed') } finally { setBusy(false) }
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={go}
        disabled={busy}
        title="Suggest a few on-brand options"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-gold-300 bg-gold-50/40 text-bark-500 hover:border-gold-400 hover:text-bark-700 transition-colors disabled:opacity-40"
      >
        {busy ? <Loader size={11} className="animate-spin" /> : <Sparkles size={11} className="text-gold-400" />}
        <span className="font-sans text-[9px] tracking-[0.15em] uppercase">Ideas</span>
      </button>
      {(opts || err) && (
        <div className="absolute right-0 z-40 mt-1 w-72 bg-white border border-cream-300 rounded-lg shadow-xl p-1">
          {err ? (
            <p className="px-2 py-1.5 font-sans text-[11px] text-red-500">{err}</p>
          ) : (
            opts!.map((o, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { onPick(o); setOpts(null) }}
                className="block w-full text-left px-2.5 py-2 font-sans text-xs text-bark-600 leading-snug hover:bg-cream-100 rounded transition-colors"
              >
                {o}
              </button>
            ))
          )}
          <button type="button" onClick={() => { setOpts(null); setErr('') }} className="block w-full text-center px-2 py-1 font-sans text-[10px] tracking-[0.15em] uppercase text-bark-400 hover:text-bark-600">Close</button>
        </div>
      )}
    </div>
  )
}

type AiOpt = { kind: 'eyebrow' | 'title' | 'tagline' | 'body' | 'bullet' | 'text'; context?: string }

// ── Reusable field bits ──────────────────────────────────────────────────────
function Field({ label, value, onChange, placeholder, ai }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; ai?: AiOpt }) {
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-2 min-h-[18px]">
        <span className="font-sans text-[10px] tracking-[0.15em] uppercase text-bark-400">{label}</span>
        {ai && <AiSuggest fieldLabel={label} kind={ai.kind} current={value} context={ai.context} onPick={onChange} />}
      </span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full px-3 py-2 border border-cream-300 bg-white rounded text-sm text-bark-700 focus:outline-none focus:border-bark-400"
      />
    </label>
  )
}

function Area({ label, value, onChange, rows = 3, ai }: { label: string; value: string; onChange: (v: string) => void; rows?: number; ai?: AiOpt }) {
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-2 min-h-[18px]">
        <span className="font-sans text-[10px] tracking-[0.15em] uppercase text-bark-400">{label}</span>
        {ai && <AiSuggest fieldLabel={label} kind={ai.kind} current={value} context={ai.context} onPick={onChange} />}
      </span>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        className="mt-1 w-full px-3 py-2 border border-cream-300 bg-white rounded text-sm text-bark-700 leading-relaxed focus:outline-none focus:border-bark-400"
      />
    </label>
  )
}

function Card({ children, onRemove }: { children: React.ReactNode; onRemove?: () => void }) {
  return (
    <div className="relative bg-white border border-cream-200 rounded-lg p-4 space-y-3">
      {onRemove && (
        <button onClick={onRemove} className="absolute top-3 right-3 text-bark-300 hover:text-red-500 transition-colors" title="Remove">
          <Trash2 size={14} />
        </button>
      )}
      {children}
    </div>
  )
}

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 font-sans text-[10px] tracking-[0.15em] uppercase text-bark-500 hover:text-bark-700 border border-dashed border-cream-300 hover:border-bark-400 rounded px-3 py-2 transition-colors">
      <Plus size={13} /> {label}
    </button>
  )
}

function SectionTitle({ n, title, note }: { n: string; title: string; note?: string }) {
  return (
    <div className="mb-4 pb-3 border-b border-cream-300">
      <h2 className="font-serif text-xl text-bark-600">{n} · {title}</h2>
      {note && <p className="font-sans text-xs text-bark-400 mt-1">{note}</p>}
    </div>
  )
}

// Inline photo uploader for an editorial feature — writes straight to the
// home-images slot so the picture sits next to its copy.
function FeatureImage({ slot }: { slot: string }) {
  const [url, setUrl] = useState(`${SUPABASE_URL}/storage/v1/object/public/home-images/${slot}.jpg`)
  const [exists, setExists] = useState(true)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setBusy(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('slot', slot)
      const res = await fetch('/api/portal/home-images/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (data.url) { setUrl(data.url + `?t=${Date.now()}`); setExists(true) }
    } finally { setBusy(false) }
  }

  return (
    <div
      className="relative aspect-[3/4] bg-cream-100 rounded-lg overflow-hidden cursor-pointer border border-cream-200 group"
      onClick={() => inputRef.current?.click()}
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
    >
      {exists
        ? <img src={url} alt="" className="w-full h-full object-cover" onError={() => setExists(false)} />
        : <div className="absolute inset-0 flex items-center justify-center text-bark-300"><Upload size={20} /></div>}
      <div className="absolute inset-0 bg-bark-600/0 group-hover:bg-bark-600/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
        {busy ? <Loader size={18} className="text-white animate-spin" /> : <span className="font-sans text-[10px] tracking-[0.2em] uppercase text-white">{exists ? 'Replace' : 'Upload'}</span>}
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
    </div>
  )
}

// ── Box picker — which prebuilt boxes appear in the homepage carousel ────────
interface BoxLite { slug: string; name: string; variant: string; image?: string | null; featured: boolean; active: boolean; style: string }

function BoxPicker() {
  const [boxes, setBoxes] = useState<BoxLite[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/portal/boxes')
      .then(r => r.json())
      .then(d => setBoxes((d.boxes ?? []).map((b: BoxLite) => ({ slug: b.slug, name: b.name, variant: b.variant, image: b.image, featured: b.featured, active: b.active, style: b.style }))))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function toggle(slug: string, next: boolean) {
    setBusy(slug)
    setBoxes(bs => bs.map(b => b.slug === slug ? { ...b, featured: next } : b))
    try {
      await fetch(`/api/portal/boxes/${slug}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ featured: next }),
      })
    } catch {
      setBoxes(bs => bs.map(b => b.slug === slug ? { ...b, featured: !next } : b))
    } finally { setBusy(null) }
  }

  const shown = boxes.filter(b => b.featured).length

  return (
    <>
      <p className="font-sans text-[10px] text-bark-400/80 mb-4">Pick which Curated Gift Sets appear in the homepage carousel. {shown} selected. (Inactive boxes never show, even if selected.)</p>
      {loading ? (
        <div className="flex items-center gap-2 text-bark-400 py-6 text-sm"><Loader size={14} className="animate-spin" /> Loading boxes…</div>
      ) : boxes.length === 0 ? (
        <p className="text-sm text-bark-400 py-4">No boxes yet. Create them under Prebuilt Boxes.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {boxes.map(box => (
            <label key={box.slug} className={`flex items-center gap-3 bg-white border rounded-lg p-3 cursor-pointer transition-colors ${box.featured ? 'border-bark-400' : 'border-cream-200'} ${!box.active ? 'opacity-60' : ''}`}>
              <div className="w-12 h-14 shrink-0 bg-cream-200 rounded overflow-hidden">
                {box.image && <img src={box.image} alt={box.name} className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-serif text-base text-bark-600 truncate">{box.name}</p>
                <p className="font-sans text-[10px] tracking-[0.15em] uppercase text-gold-400">{box.style} · {box.variant}{!box.active && ' · hidden'}</p>
              </div>
              {busy === box.slug
                ? <Loader size={16} className="animate-spin text-bark-400" />
                : <input type="checkbox" checked={box.featured} onChange={e => toggle(box.slug, e.target.checked)} className="w-5 h-5 accent-bark-600" />}
            </label>
          ))}
        </div>
      )}
    </>
  )
}

// ── Merged Homepage editor — sections in homepage top-to-bottom order ────────
function HomepageEditor() {
  const [c, setC] = useState<HomeContent | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/portal/home-content').then(r => r.json()).then(d => setC(d.content)).catch(() => {})
  }, [])

  async function save() {
    if (!c) return
    setSaving(true); setSaved(false)
    try {
      const res = await fetch('/api/portal/home-content', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c),
      })
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500) }
    } finally { setSaving(false) }
  }

  if (!c) return <div className="flex items-center gap-2 text-bark-400 py-10 text-sm"><Loader size={14} className="animate-spin" /> Loading…</div>

  const setPerks = (perks: Perk[]) => setC({ ...c, perks })
  const setWhy = (why: Partial<HomeContent['why']>) => setC({ ...c, why: { ...c.why, ...why } })
  const setFeature = (i: number, patch: Partial<FeatureBlock>) =>
    setWhy({ features: c.why.features.map((f, j) => j === i ? { ...f, ...patch } : f) })
  const setReviews = (reviews: Partial<HomeContent['reviews']>) => setC({ ...c, reviews: { ...c.reviews, ...reviews } })

  return (
    <>
      {/* 1 · Hero */}
      <section className="mb-12">
        <SectionTitle n="1" title="Hero" note="Full-width banner at the very top of the homepage." />
        <div className="max-w-2xl"><ImageSlotCard wide slotKey="hero" label="Hero Image" description="Landscape — the box centered, lifestyle feel. ~2400×1400." /></div>
      </section>

      {/* 2 · Perks bar */}
      <section className="mb-12">
        <SectionTitle n="2" title="Perks bar" note="The four short benefits in the strip under the hero." />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {c.perks.map((p, i) => (
            <Card key={i} onRemove={() => setPerks(c.perks.filter((_, j) => j !== i))}>
              <Field label="Headline" value={p.label} onChange={v => setPerks(c.perks.map((x, j) => j === i ? { ...x, label: v } : x))} ai={{ kind: 'text', context: 'a 2–3 word benefit headline in the perks strip' }} />
              <Field label="Subtext" value={p.sub} onChange={v => setPerks(c.perks.map((x, j) => j === i ? { ...x, sub: v } : x))} />
            </Card>
          ))}
        </div>
        <div className="mt-3"><AddButton onClick={() => setPerks([...c.perks, { label: '', sub: '' }])} label="Add perk" /></div>
      </section>

      {/* 3 · Shop by Occasion */}
      <section className="mb-12">
        <SectionTitle n="3" title="Shop by Occasion cards" note="Four portrait cards in the 'Shop by Occasion' grid." />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <ImageSlotCard slotKey="newborn" label="Newborn Gifts" description="Baby in white eyelet romper" />
          <ImageSlotCard slotKey="mama" label="For Mama" description="Mom + baby, soft pink tones" />
          <ImageSlotCard slotKey="bundle" label="Mama & Baby Bundle" description="Mom holding newborn, box on table" />
          <ImageSlotCard slotKey="custom" label="Custom Box" description="Baby on rug with bunny blanket" />
        </div>
      </section>

      {/* 4 · Curated Gift Sets */}
      <section className="mb-12">
        <SectionTitle n="4" title="Curated Gift Sets" note="Which prebuilt boxes appear in the homepage carousel." />
        <BoxPicker />
      </section>

      {/* 5 · What makes it special */}
      <section className="mb-12">
        <SectionTitle n="5" title="“What makes it special” section" note="The intro and the two editorial image features. Each photo and its words are edited together." />
        <div className="space-y-3 mb-6">
          <Field label="Eyebrow (small caps)" value={c.why.eyebrow} onChange={v => setWhy({ eyebrow: v })} ai={{ kind: 'eyebrow', context: 'the small eyebrow above the section heading' }} />
          <Field label="Heading" value={c.why.title} onChange={v => setWhy({ title: v })} ai={{ kind: 'title', context: 'the section heading for why-choose-us' }} />
          <Area label="Intro paragraph" value={c.why.intro} onChange={v => setWhy({ intro: v })} ai={{ kind: 'body', context: 'the intro paragraph under the why-choose-us heading' }} />
        </div>
        <div className="space-y-4">
          {c.why.features.map((f, i) => (
            <div key={i} className="bg-white border border-cream-200 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-4">
              <div>
                <span className="font-sans text-[10px] tracking-[0.15em] uppercase text-bark-400">Photo {i + 1}{i === 0 ? ' · left' : ' · right'}</span>
                <div className="mt-1.5"><FeatureImage slot={f.slot} /></div>
                <p className="font-sans text-[9px] text-bark-400/70 mt-1.5">Click or drop a photo — saves instantly.</p>
              </div>
              <div className="space-y-3">
                <Field label="Eyebrow (small caps)" value={f.eyebrow} onChange={v => setFeature(i, { eyebrow: v })} ai={{ kind: 'eyebrow', context: 'the eyebrow label for an editorial feature block' }} />
                <Area label="Title (press Enter for a line break)" value={f.title} onChange={v => setFeature(i, { title: v })} rows={2} ai={{ kind: 'title', context: 'the headline for an editorial feature block about the brand' }} />
                <Area label="Body paragraph" value={f.body} onChange={v => setFeature(i, { body: v })} rows={5} ai={{ kind: 'body', context: 'the body copy for an editorial feature block about the brand' }} />
                <Area label="Bullet list — one per line (optional)" value={f.bullets.join('\n')} onChange={v => setFeature(i, { bullets: v.split('\n') })} rows={4} />
              </div>
            </div>
          ))}
        </div>
        <p className="font-sans text-[10px] text-bark-400/80 mt-3">Photos upload immediately; text changes go live when you press “Save changes” below.</p>
      </section>

      {/* 6 · Bestsellers */}
      <section className="mb-12">
        <SectionTitle n="6" title="Bestsellers carousel" note="The looping product carousel. Curate the exact products and override photos." />
        <BestsellerManager />
      </section>

      {/* 7 · Editorial Strip */}
      <section className="mb-12">
        <SectionTitle n="7" title="Editorial Strip — “Every detail, intentional.”" note="Full-width cinematic section. Upload a video to make it loop; the photo is the fallback." />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
          <ImageSlotCard wide slotKey="kraft" label="Editorial Photo" description="Fallback if no video — open box, cinematic crop. ~2000×1100." />
          <VideoSlotCard slotKey="kraft" label="Editorial Video" description="Looping overlay. MP4/MOV/WebM — keep under 20 MB." />
        </div>
      </section>

      {/* 8 · Reviews */}
      <section className="mb-12">
        <SectionTitle n="8" title="Reviews" note="The testimonials block near the bottom of the homepage." />
        <div className="space-y-3 mb-4">
          <Field label="Eyebrow (small caps)" value={c.reviews.eyebrow} onChange={v => setReviews({ eyebrow: v })} ai={{ kind: 'eyebrow', context: 'the eyebrow above the reviews heading' }} />
          <Field label="Heading" value={c.reviews.title} onChange={v => setReviews({ title: v })} ai={{ kind: 'title', context: 'the reviews section heading' }} />
          <Field label="Rating line" value={c.reviews.ratingLine} onChange={v => setReviews({ ratingLine: v })} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {c.reviews.items.map((r, i) => (
            <Card key={i} onRemove={() => setReviews({ items: c.reviews.items.filter((_, j) => j !== i) })}>
              <Area label="Quote" value={r.quote} onChange={v => setReviews({ items: c.reviews.items.map((x, j) => j === i ? { ...x, quote: v } : x) })} rows={4} ai={{ kind: 'body', context: 'a warm, specific customer testimonial quote' }} />
              <Field label="Name" value={r.name} onChange={v => setReviews({ items: c.reviews.items.map((x, j) => j === i ? { ...x, name: v } : x) })} />
              <Field label="Context" value={r.context} onChange={v => setReviews({ items: c.reviews.items.map((x, j) => j === i ? { ...x, context: v } : x) })} />
            </Card>
          ))}
        </div>
        <div className="mt-3"><AddButton onClick={() => setReviews({ items: [...c.reviews.items, { quote: '', name: '', context: '' } as Review] })} label="Add review" /></div>
      </section>

      {/* 9 · Final CTA */}
      <section className="mb-12">
        <SectionTitle n="9" title="Final CTA background" note="Dark full-width section near the bottom — image shows at ~40% opacity." />
        <div className="max-w-xs"><ImageSlotCard slotKey="box" label="CTA Background" description="Cream box with ribbon — dark/moody works best. ~1600×900." /></div>
      </section>

      {/* Save bar (text only — photos & box picker save on their own) */}
      <div className="sticky bottom-0 -mx-8 px-8 py-4 bg-cream-100/95 backdrop-blur border-t border-cream-300 flex items-center gap-4">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-bark-600 text-cream-50 font-sans text-[11px] tracking-[0.2em] uppercase px-8 py-3 rounded hover:bg-bark-700 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null}
          {saving ? 'Saving…' : saved ? 'Saved' : 'Save changes'}
        </button>
        <p className="font-sans text-xs text-bark-400">Photos &amp; box choices save instantly. Text changes go live within a few minutes after saving.</p>
      </div>
    </>
  )
}

export default function HomeContentPage() {
  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-10">
        <h1 className="font-serif text-3xl text-bark-600">Homepage</h1>
        <p className="font-sans text-sm text-bark-400 mt-1">Every homepage section — photos, words, and box choices — in the order they appear, top to bottom. ✨ buttons suggest on-brand copy.</p>
      </div>
      <HomepageEditor />
    </div>
  )
}
