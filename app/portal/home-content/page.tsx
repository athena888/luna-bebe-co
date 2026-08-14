'use client'

import { useState, useEffect } from 'react'
import { BestsellerBoxPicker } from '@/components/portal/BestsellerBoxPicker'
import { Loader, Plus, Trash2, Check } from 'lucide-react'
import type { HomeContent, Perk, Review } from '@/lib/home-content'
import { ImageSlotCard, GallerySlot } from '@/components/portal/HomeMediaWidgets'
import { Field, Area } from '@/components/portal/ContentFields'
import { SiteImageUploader } from '@/components/portal/SiteImageUploader'
import { ScrimControl } from '@/components/portal/ScrimControl'
import { CollectionsEditor } from '@/app/portal/collections/page'

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
    // Only boxes that are actually visible on the site — hidden drafts can't be
    // featured, so they don't belong in this picker (unhide in Prebuilt Boxes first).
    fetch('/api/portal/boxes')
      .then(r => r.json())
      .then(d => setBoxes(((d.boxes ?? []) as BoxLite[])
        .filter(b => b.active)
        .map(b => ({ slug: b.slug, name: b.name, variant: b.variant, image: b.image, featured: b.featured, active: b.active, style: b.style }))))
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
      <p className="font-sans text-[10px] text-bark-400/80 mb-4">Pick which of your visible boxes appear in the homepage carousel. {shown} selected. Hidden boxes aren&rsquo;t listed — unhide them under Prebuilt Boxes first.</p>
      {loading ? (
        <div className="flex items-center gap-2 text-bark-400 py-6 text-sm"><Loader size={14} className="animate-spin" /> Loading boxes…</div>
      ) : boxes.length === 0 ? (
        <p className="text-sm text-bark-400 py-4">No visible boxes yet — everything in Prebuilt Boxes is currently hidden. Unhide a box there and it will appear here.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {boxes.map(box => (
            <label key={box.slug} className={`flex items-center gap-3 bg-white border rounded-lg p-3 cursor-pointer transition-colors ${box.featured ? 'border-bark-400' : 'border-cream-200'}`}>
              <div className="w-12 h-14 shrink-0 bg-cream-200 rounded overflow-hidden">
                {box.image && <img src={box.image} alt={box.name} className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-serif text-base text-bark-600 truncate">{box.name}</p>
                <p className="font-sans text-[10px] tracking-[0.15em] uppercase text-gold-400">{box.style} · {box.variant}</p>
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
  const setUnf = (patch: Partial<HomeContent['unforgettable']>) => setC({ ...c, unforgettable: { ...c.unforgettable, ...patch } })
  const setReviews = (reviews: Partial<HomeContent['reviews']>) => setC({ ...c, reviews: { ...c.reviews, ...reviews } })

  return (
    <>
      {/* 1 · Hero */}
      <section className="mb-12">
        <SectionTitle n="1" title="Hero" note="Full-width banner at the very top of the homepage. Add several photos to cross-fade them." />
        <div className="max-w-2xl">
          <GallerySlot wide slot="hero" label="Hero Image(s)" description="Landscape — the box centered, lifestyle feel. ~2400×1350 (16:9). On narrow phones the sides crop; keep subject centered." />
          <ScrimControl scrimKey="home.hero" defaultScrim={{ hex: '#181716', opacity: 0.4 }} label="Hero colour overlay" note="darkens the bottom so the white headline stays readable" />
        </div>
      </section>

      {/* 2 · Promise ticker */}
      <section className="mb-12">
        <SectionTitle n="2" title="Promise ticker" note="The line that scrolls right-to-left directly below the hero." />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {c.perks.map((p, i) => (
            <Card key={i} onRemove={() => setPerks(c.perks.filter((_, j) => j !== i))}>
              <Field label="Headline" value={p.label} onChange={v => setPerks(c.perks.map((x, j) => j === i ? { ...x, label: v } : x))} ai={{ kind: 'text', context: 'a 2–3 word benefit headline in the promise ticker' }} />
              <Field label="Subtext" value={p.sub} onChange={v => setPerks(c.perks.map((x, j) => j === i ? { ...x, sub: v } : x))} />
              <Field label="Headline (Español)" value={p.es?.label ?? ''} onChange={v => setPerks(c.perks.map((x, j) => j === i ? { ...x, es: { ...x.es, label: v } } : x))} />
              <Field label="Subtext (Español)" value={p.es?.sub ?? ''} onChange={v => setPerks(c.perks.map((x, j) => j === i ? { ...x, es: { ...x.es, sub: v } } : x))} />
            </Card>
          ))}
        </div>
        <div className="mt-3"><AddButton onClick={() => setPerks([...c.perks, { label: '', sub: '' }])} label="Add ticker item" /></div>
      </section>

      {/* 3 · Best Sellers */}
      <section className="mb-12">
        <SectionTitle n="3" title="Best Sellers" note="The box strip below the promise ticker. Star the exact versions to feature — none starred shows all live boxes." />
        <BestsellerBoxPicker />
      </section>

      {/* 4 · The Collection — "Create Something Unforgettable" panel */}
      <section className="mb-12">
        <SectionTitle n="4" title={'The Collection · "Create Something Unforgettable" panel'} note="The framed olive panel on the left of The Collection carousel. Script heading, paragraph, and the hyphenated list. Shop Now links to the boxes page. The photos on the right are your box cover photos (Portal → Prebuilt Boxes)." />
        <div className="bg-white border border-cream-200 rounded-lg p-4 space-y-3">
          <Field label="Script heading (keeps to one line — keep it short)" value={c.unforgettable.title} onChange={v => setUnf({ title: v })} ai={{ kind: 'title', context: 'a short elegant script heading for the gift-box feature panel' }} />
          <Area label="Paragraph" value={c.unforgettable.body} onChange={v => setUnf({ body: v })} rows={3} ai={{ kind: 'body', context: 'the intro paragraph inside the framed feature panel about the mama gift box' }} />
          <Area label="List — one per line (each shown with a hyphen)" value={c.unforgettable.items.join('\n')} onChange={v => setUnf({ items: v.split('\n') })} rows={5} />
          <Field label="Script heading (Español)" value={c.unforgettable.es?.title ?? ''} onChange={v => setUnf({ es: { ...c.unforgettable.es, title: v } })} />
          <Area label="Paragraph (Español)" value={c.unforgettable.es?.body ?? ''} onChange={v => setUnf({ es: { ...c.unforgettable.es, body: v } })} rows={3} />
          <Area label="List (Español) — one per line" value={(c.unforgettable.es?.items ?? []).join('\n')} onChange={v => setUnf({ es: { ...c.unforgettable.es, items: v.split('\n') } })} rows={5} />
        </div>
      </section>

      {/* 5 · Shop by Category */}
      <section className="mb-12">
        <SectionTitle n="5" title="Shop by Category" note="The four category tiles. Newborn/Mama/Custom link into the build page; the Bundle tile cycles through your boxes." />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <ImageSlotCard slotKey="newborn" label="Newborn Gifts" description="~800×600. Keep subject in upper half — desktop crops to tall portrait." />
          <ImageSlotCard slotKey="mama" label="For Mama" description="~800×600. Keep subject in upper half — desktop crops to tall portrait." />
          <ImageSlotCard slotKey="bundle" label="Mama & Baby Bundle" description="~800×600. This photo IS the tile (the box cover is only a backstop)." />
          <ImageSlotCard slotKey="custom" label="Custom Box" description="~800×600. Keep subject in upper half — desktop crops to tall portrait." />
        </div>
        <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-bark-500 mb-2">Collections — name, subtitle and products behind each tile</p>
        <CollectionsEditor />
      </section>

      {/* 6 · What makes it special */}
      <section className="mb-12">
        <SectionTitle n="6" title={'"What makes it special"'} note="Full-bleed lifestyle photo with the heading + Shop Now overlaid at the bottom — now the closing section of the homepage (after the Our Story line)." />
        <div className="bg-white border border-cream-200 rounded-lg p-3 mb-5">
          <p className="font-sans text-[10px] text-bark-400 mb-2">Section photo — the text overlays its lower third</p>
          <SiteImageUploader slotKey="home.special_bg" context="Full-bleed editorial lifestyle photo behind the What makes it special heading" ratio="21:9" hint="wide editorial lifestyle · ~2200×950" compact />
          <p className="font-sans text-[10px] text-bark-400 mt-3 mb-2">Optional phone crop — shown on small screens instead</p>
          <SiteImageUploader slotKey="home.special_bg.mobile" context="Taller phone crop of the What makes it special photo" ratio="4:5" hint="taller phone crop · ~1000×1250" compact />
        </div>
        <div className="space-y-3">
          <Field label="Heading (first word renders italic, the rest in big caps)" value={c.why.title} onChange={v => setWhy({ title: v })} ai={{ kind: 'title', context: 'the section heading for why-choose-us' }} />
          <Area label="Subline under the heading" value={c.why.intro} onChange={v => setWhy({ intro: v })} ai={{ kind: 'body', context: 'the one-sentence subline under the why-choose-us heading' }} />
          <Field label="Heading (Español)" value={c.why.es?.title ?? ''} onChange={v => setWhy({ es: { ...c.why.es, title: v } })} />
          <Area label="Subline (Español)" value={c.why.es?.intro ?? ''} onChange={v => setWhy({ es: { ...c.why.es, intro: v } })} />
        </div>
      </section>

      {/* 7 · Reviews */}
      <section className="mb-12">
        <SectionTitle n="7" title="Reviews" note="The testimonials block near the bottom of the homepage. Only shows when reviews are enabled and at least one review exists." />
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
