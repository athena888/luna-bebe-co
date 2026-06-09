'use client'

import { useState, useEffect } from 'react'
import { Loader, Plus, Trash2, Check } from 'lucide-react'
import type { HomeContent, Perk, WhyItem, Review } from '@/lib/home-content'

// ── Reusable field bits ──────────────────────────────────────────────────────
function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="font-sans text-[10px] tracking-[0.15em] uppercase text-bark-400">{label}</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full px-3 py-2 border border-cream-300 bg-white rounded text-sm text-bark-700 focus:outline-none focus:border-bark-400"
      />
    </label>
  )
}

function Area({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <label className="block">
      <span className="font-sans text-[10px] tracking-[0.15em] uppercase text-bark-400">{label}</span>
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

// ── Box selector — which prebuilt boxes appear on the homepage ───────────────
interface BoxLite { slug: string; name: string; variant: string; image?: string | null; featured: boolean; active: boolean; style: string }

function HomeBoxesManager() {
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
      setBoxes(bs => bs.map(b => b.slug === slug ? { ...b, featured: !next } : b)) // revert
    } finally { setBusy(null) }
  }

  const shown = boxes.filter(b => b.featured).length

  return (
    <section className="mb-12">
      <SectionTitle n="1" title="Boxes shown on the homepage" note={`Pick which Curated Gift Sets appear in the homepage carousel. ${shown} selected. (Inactive boxes never show, even if selected.)`} />
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
    </section>
  )
}

// ── Text content editor ──────────────────────────────────────────────────────
function ContentEditor() {
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

  if (!c) return <div className="flex items-center gap-2 text-bark-400 py-6 text-sm"><Loader size={14} className="animate-spin" /> Loading content…</div>

  // immutable helpers
  const setPerks = (perks: Perk[]) => setC({ ...c, perks })
  const setWhy = (why: Partial<HomeContent['why']>) => setC({ ...c, why: { ...c.why, ...why } })
  const setReviews = (reviews: Partial<HomeContent['reviews']>) => setC({ ...c, reviews: { ...c.reviews, ...reviews } })

  return (
    <>
      {/* Perks bar */}
      <section className="mb-12">
        <SectionTitle n="2" title="Perks bar" note="The four short benefits in the strip under the hero." />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {c.perks.map((p, i) => (
            <Card key={i} onRemove={() => setPerks(c.perks.filter((_, j) => j !== i))}>
              <Field label="Headline" value={p.label} onChange={v => setPerks(c.perks.map((x, j) => j === i ? { ...x, label: v } : x))} />
              <Field label="Subtext" value={p.sub} onChange={v => setPerks(c.perks.map((x, j) => j === i ? { ...x, sub: v } : x))} />
            </Card>
          ))}
        </div>
        <div className="mt-3"><AddButton onClick={() => setPerks([...c.perks, { label: '', sub: '' }])} label="Add perk" /></div>
      </section>

      {/* What makes it special */}
      <section className="mb-12">
        <SectionTitle n="3" title="“What makes it special” section" note="The why-choose-us block below the Curated Gift Sets." />
        <div className="space-y-3 mb-4">
          <Field label="Eyebrow (small caps)" value={c.why.eyebrow} onChange={v => setWhy({ eyebrow: v })} />
          <Field label="Heading" value={c.why.title} onChange={v => setWhy({ title: v })} />
          <Area label="Intro paragraph" value={c.why.intro} onChange={v => setWhy({ intro: v })} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {c.why.items.map((it, i) => (
            <Card key={i} onRemove={() => setWhy({ items: c.why.items.filter((_, j) => j !== i) })}>
              <Field label="Title" value={it.t} onChange={v => setWhy({ items: c.why.items.map((x, j) => j === i ? { ...x, t: v } : x) })} />
              <Area label="Body" value={it.b} onChange={v => setWhy({ items: c.why.items.map((x, j) => j === i ? { ...x, b: v } : x) })} />
            </Card>
          ))}
        </div>
        <div className="mt-3"><AddButton onClick={() => setWhy({ items: [...c.why.items, { t: '', b: '' } as WhyItem] })} label="Add point" /></div>
      </section>

      {/* Reviews */}
      <section className="mb-12">
        <SectionTitle n="4" title="Reviews" note="The testimonials block near the bottom of the homepage." />
        <div className="space-y-3 mb-4">
          <Field label="Eyebrow (small caps)" value={c.reviews.eyebrow} onChange={v => setReviews({ eyebrow: v })} />
          <Field label="Heading" value={c.reviews.title} onChange={v => setReviews({ title: v })} />
          <Field label="Rating line" value={c.reviews.ratingLine} onChange={v => setReviews({ ratingLine: v })} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {c.reviews.items.map((r, i) => (
            <Card key={i} onRemove={() => setReviews({ items: c.reviews.items.filter((_, j) => j !== i) })}>
              <Area label="Quote" value={r.quote} onChange={v => setReviews({ items: c.reviews.items.map((x, j) => j === i ? { ...x, quote: v } : x) })} rows={4} />
              <Field label="Name" value={r.name} onChange={v => setReviews({ items: c.reviews.items.map((x, j) => j === i ? { ...x, name: v } : x) })} />
              <Field label="Context" value={r.context} onChange={v => setReviews({ items: c.reviews.items.map((x, j) => j === i ? { ...x, context: v } : x) })} />
            </Card>
          ))}
        </div>
        <div className="mt-3"><AddButton onClick={() => setReviews({ items: [...c.reviews.items, { quote: '', name: '', context: '' } as Review] })} label="Add review" /></div>
      </section>

      {/* Save bar */}
      <div className="sticky bottom-0 -mx-8 px-8 py-4 bg-cream-100/95 backdrop-blur border-t border-cream-300 flex items-center gap-4">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-bark-600 text-cream-50 font-sans text-[11px] tracking-[0.2em] uppercase px-8 py-3 rounded hover:bg-bark-700 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null}
          {saving ? 'Saving…' : saved ? 'Saved' : 'Save changes'}
        </button>
        <p className="font-sans text-xs text-bark-400">Changes go live on the homepage within a few minutes.</p>
      </div>
    </>
  )
}

export default function HomeContentPage() {
  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-10">
        <h1 className="font-serif text-3xl text-bark-600">Homepage Content</h1>
        <p className="font-sans text-sm text-bark-400 mt-1">Choose which boxes appear and edit the homepage wording — no code needed.</p>
      </div>
      <HomeBoxesManager />
      <ContentEditor />
    </div>
  )
}
