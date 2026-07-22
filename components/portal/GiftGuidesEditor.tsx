'use client'

import { useState, useEffect } from 'react'
import { Loader, Check, ExternalLink } from 'lucide-react'
import { Field, Area } from '@/components/portal/ContentFields'
import { SiteImageUploader } from '@/components/portal/SiteImageUploader'
import { ScrimControl } from '@/components/portal/ScrimControl'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/lib/products'
import type { ProductCategory } from '@/types'

// Mirrors lib/landing-content.ts ResolvedGuide (the editable shape).
interface Guide {
  slug: string
  eyebrow: string
  h1: string
  title: string
  metaDescription: string
  intro: string[]
  highlights: string[]
  tag: string
  productIds: string[]
  categories: ProductCategory[]
}

interface ProductLite { id: string; name: string; category: ProductCategory; image?: string | null; active?: boolean }


// One area to manage all four search-intent gift guides — background image,
// colour overlay, words, tag, and exactly which products show. The individual
// /gifts/<slug> SEO pages stay; this just makes them editable.
export function GiftGuidesEditor() {
  const [guides, setGuides] = useState<Guide[] | null>(null)
  const [products, setProducts] = useState<ProductLite[]>([])
  const [activeSlug, setActiveSlug] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/portal/landing-content').then(r => r.json()).then(d => {
      setGuides(d.guides ?? [])
      if (d.guides?.[0]) setActiveSlug(d.guides[0].slug)
    }).catch(() => setGuides([]))
    fetch('/api/portal/products').then(r => r.json())
      .then(d => setProducts((d.products ?? []).map((p: ProductLite) => ({ id: p.id, name: p.name, category: p.category, image: p.image, active: p.active }))))
      .catch(() => {})
  }, [])

  const guide = guides?.find(g => g.slug === activeSlug)

  function patch(p: Partial<Guide>) {
    setGuides(gs => gs?.map(g => g.slug === activeSlug ? { ...g, ...p } : g) ?? gs)
  }

  async function save() {
    if (!guide) return
    setSaving(true); setSaved(false)
    try {
      const override = {
        eyebrow: guide.eyebrow, h1: guide.h1, title: guide.title,
        metaDescription: guide.metaDescription, intro: guide.intro,
        highlights: guide.highlights, tag: guide.tag, productIds: guide.productIds,
      }
      const res = await fetch('/api/portal/landing-content', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: guide.slug, override }),
      })
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500) }
    } finally { setSaving(false) }
  }

  if (!guides) return <div className="flex items-center gap-2 text-bark-400 py-10 text-sm px-8"><Loader size={14} className="animate-spin" /> Loading guides…</div>
  if (!guides.length) return <p className="text-sm text-bark-400 py-10 px-8">No gift guides found.</p>

  const heroSlot = guide ? `gifts.${guide.slug}.hero` : ''
  // Products grouped by category for the picker; only categories with products.
  const byCat = CATEGORY_ORDER
    .map(cat => ({ cat, items: products.filter(p => p.category === cat) }))
    .filter(g => g.items.length > 0)
  const toggleProduct = (id: string) => {
    if (!guide) return
    const has = guide.productIds.includes(id)
    patch({ productIds: has ? guide.productIds.filter(x => x !== id) : [...guide.productIds, id] })
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-bark-600">Gift Guides</h1>
        <p className="font-sans text-sm text-bark-400 mt-1">Everything for the <span className="font-mono text-xs">/gift-guides</span> hub and the individual <span className="font-mono text-xs">/gifts</span> pages, in one place. Each guide has its own <strong>card image</strong> (its shortcut on the hub); the page <strong>background</strong> is one shared image used by all of them.</p>
      </div>

      {/* Shared background — one image behind every gift guide page */}
      <section className="bg-white border border-cream-200 rounded-lg p-4 mb-8">
        <p className="font-sans text-sm font-medium text-bark-600 mb-0.5">Shared page background</p>
        <p className="font-sans text-[11px] text-bark-400 mb-3 leading-relaxed">One image sits behind the heading on <strong>every</strong> gift guide page. Landscape · ~2000×1130.</p>
        <div className="max-w-xs">
          <SiteImageUploader slotKey="gifts.shared_bg" context="Shared background behind every gift guide page" ratio="16:9" hint="Soft, on-brand lifestyle · ~2000×1130" compact />
        </div>
        <ScrimControl scrimKey="gifts.shared_bg" defaultScrim={{ hex: '#FAF7F0', opacity: 0.8 }} label="Colour overlay (swatch)" note="cream wash over the photo so the heading stays readable — raise to soften, lower to show more photo" />
      </section>

      {/* Guide selector */}
      <div className="flex flex-wrap gap-2 mb-8">
        {guides.map(g => (
          <button
            key={g.slug}
            onClick={() => setActiveSlug(g.slug)}
            className={`font-sans text-[11px] tracking-[0.1em] px-4 py-2.5 rounded-lg border transition-colors ${
              g.slug === activeSlug ? 'bg-bark-600 text-cream-50 border-bark-600' : 'bg-white text-bark-500 border-cream-300 hover:border-bark-400'
            }`}
          >
            {g.h1.replace(/^The /, '')}
          </button>
        ))}
      </div>

      {guide && (
        <div className="space-y-8">
          {/* Live link */}
          <a href={`/gifts/${guide.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-sans text-[11px] text-bark-500 hover:text-bark-700 transition-colors">
            View live page <ExternalLink size={12} />
          </a>

          {/* Card image — the guide's shortcut on the hub */}
          <section className="bg-white border border-cream-200 rounded-lg p-4">
            <p className="font-sans text-sm font-medium text-bark-600 mb-0.5">Card image</p>
            <p className="font-sans text-[11px] text-bark-400 mb-3 leading-relaxed">The shortcut image for this guide on the Gifting Ideas hub. Portrait · ~1000×1250. (The page background is the shared one above.)</p>
            <div className="max-w-[200px]">
              <SiteImageUploader slotKey={heroSlot} context={`Card image for the ${guide.h1} gift guide`} ratio="4:5" hint="Portrait card · ~1000×1250" compact />
            </div>
          </section>

          {/* Words */}
          <section className="bg-white border border-cream-200 rounded-lg p-4 space-y-3">
            <p className="font-sans text-sm font-medium text-bark-600 mb-1">Words</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Tag (hub filter)" value={guide.tag} onChange={v => patch({ tag: v })} placeholder="e.g. Newborn" />
              <Field label="Eyebrow (small caps)" value={guide.eyebrow} onChange={v => patch({ eyebrow: v })} ai={{ kind: 'eyebrow', context: `the eyebrow above the ${guide.h1} heading` }} />
            </div>
            <Field label="Heading (H1)" value={guide.h1} onChange={v => patch({ h1: v })} ai={{ kind: 'title', context: `the main heading for a ${guide.tag} gift guide` }} />
            <Area
              label="Intro paragraphs — separate paragraphs with a blank line"
              value={guide.intro.join('\n\n')}
              onChange={v => patch({ intro: v.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean) })}
              rows={8}
              ai={{ kind: 'body', context: `the intro copy for the ${guide.h1} gift guide` }}
            />
            <Area
              label="Highlights — one per line (the small bullets under the heading)"
              value={guide.highlights.join('\n')}
              onChange={v => patch({ highlights: v.split('\n').map(s => s.trim()).filter(Boolean) })}
              rows={4}
            />
          </section>

          {/* SEO */}
          <section className="bg-white border border-cream-200 rounded-lg p-4 space-y-3">
            <p className="font-sans text-sm font-medium text-bark-600 mb-1">Search engine (SEO)</p>
            <Field label="Browser title" value={guide.title} onChange={v => patch({ title: v })} />
            <Area label="Meta description" value={guide.metaDescription} onChange={v => patch({ metaDescription: v })} rows={3} />
          </section>

          {/* Products */}
          <section className="bg-white border border-cream-200 rounded-lg p-4">
            <p className="font-sans text-sm font-medium text-bark-600 mb-0.5">Products to include</p>
            <p className="font-sans text-[11px] text-bark-400 mb-3 leading-relaxed">
              {guide.productIds.length
                ? `${guide.productIds.length} hand-picked — only these show, grouped by category.`
                : `None picked — the page shows every product in: ${guide.categories.map(c => CATEGORY_LABELS[c]).join(', ')}. Tick products to feature exactly those instead.`}
            </p>
            <div className="space-y-4">
              {byCat.map(({ cat, items }) => (
                <div key={cat}>
                  <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-2">{CATEGORY_LABELS[cat]}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {items.map(p => {
                      const on = guide.productIds.includes(p.id)
                      return (
                        <label key={p.id} className={`flex items-center gap-2 border rounded-lg p-2 cursor-pointer transition-colors ${on ? 'border-bark-400 bg-cream-50' : 'border-cream-200 hover:border-cream-300'} ${p.active === false ? 'opacity-50' : ''}`}>
                          <div className="w-9 h-9 shrink-0 bg-cream-200 rounded overflow-hidden">
                            {p.image && <img src={p.image} alt="" className="w-full h-full object-cover" />}
                          </div>
                          <span className="flex-1 min-w-0 font-sans text-[11px] text-bark-600 leading-tight line-clamp-2">{p.name}</span>
                          <input type="checkbox" checked={on} onChange={() => toggleProduct(p.id)} className="w-4 h-4 accent-bark-600 shrink-0" />
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
              {byCat.length > 0 && guide.productIds.length > 0 && (
                <button onClick={() => patch({ productIds: [] })} className="font-sans text-[10px] tracking-[0.15em] uppercase text-bark-400 hover:text-red-500 transition-colors">Clear all — fall back to categories</button>
              )}
            </div>
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
            <p className="font-sans text-xs text-bark-400">Photo &amp; colour wash save instantly. Words &amp; product picks go live within a few minutes after saving.</p>
          </div>
        </div>
      )}
    </div>
  )
}
