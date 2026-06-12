'use client'

import { useState, useEffect } from 'react'
import { Loader, Plus, Trash2, Check } from 'lucide-react'
import type { HomeContent, Perk, FeatureBlock, Review } from '@/lib/home-content'
import { ImageSlotCard, VideoSlotCard, BestsellerManager, GallerySlot } from '@/components/portal/HomeMediaWidgets'
import { Field, Area } from '@/components/portal/ContentFields'
import { SiteImageUploader } from '@/components/portal/SiteImageUploader'

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
        <SectionTitle n="1" title="Hero" note="Full-width banner at the very top of the homepage. Add several photos to cross-fade them." />
        <div className="max-w-2xl"><GallerySlot wide slot="hero" label="Hero Image(s)" description="Landscape — the box centered, lifestyle feel. ~2400×1350 (16:9). On narrow phones the sides crop; keep subject centered." /></div>
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
          <ImageSlotCard slotKey="newborn" label="Newborn Gifts" description="~800×600. Keep subject in upper half — desktop crops to tall portrait." />
          <ImageSlotCard slotKey="mama" label="For Mama" description="~800×600. Keep subject in upper half — desktop crops to tall portrait." />
          <ImageSlotCard slotKey="bundle" label="Mama & Baby Bundle" description="~800×600. Keep subject in upper half — desktop crops to tall portrait." />
          <ImageSlotCard slotKey="custom" label="Custom Box" description="~800×600. Keep subject in upper half — desktop crops to tall portrait." />
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
            <div key={i} className="bg-white border border-cream-200 rounded-lg p-4 space-y-4">
              <GallerySlot slot={f.slot} label={`Photo${' '}${i + 1} · shown ${i === 0 ? 'left' : 'right'}`} description="Add one or more — they cross-fade on the homepage." />
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
          <ImageSlotCard wide slotKey="kraft" label="Editorial Photo" description="Fallback if no video — open box, cinematic crop. ~2000×1125 (16:9)." />
          <VideoSlotCard slotKey="kraft" label="Editorial Video" description="Looping overlay. MP4/MOV/WebM — keep under 20 MB." />
        </div>
      </section>

      {/* 8 · Reviews */}
      <section className="mb-12">
        <SectionTitle n="8" title="Reviews" note="The testimonials block near the bottom of the homepage." />
        <div className="bg-white border border-cream-200 rounded-lg p-3 mb-5">
          <p className="font-sans text-[10px] text-bark-400 mb-2">Section background (optional)</p>
          <SiteImageUploader slotKey="home.testimonials_bg" context="Background behind the homepage reviews/testimonials section" ratio="21:9" hint="soft, light lifestyle · ~2000×860" compact />
        </div>
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
        <SectionTitle n="9" title="Final CTA background" note="Dark full-width section near the bottom — image shows at ~40% opacity. Add several to cross-fade." />
        <div className="max-w-md"><GallerySlot wide slot="box" label="CTA Background(s)" description="Cream box with ribbon — dark/moody works best. ~1600×900 (16:9)." /></div>
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
