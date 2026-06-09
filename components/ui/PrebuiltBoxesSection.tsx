'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { ResolvedBox } from '@/lib/prebuilt-boxes-db'
import { BOX_BASE_PRICE } from '@/lib/products'
import { Package, Leaf, X } from 'lucide-react'
import { useState, useEffect } from 'react'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
function fmt(cents: number) { return `$${(cents / 100).toFixed(0)}` }
function productImg(p: { id: string; image?: string | null }): string | null {
  return p.image ?? (SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/product-images/${p.id}.jpg` : null)
}

// Variant badge — girl / boy / neutral, color-coded.
function variantBadge(box: ResolvedBox): { label: string; cls: string } {
  const v = box.variant
  if (v === 'girl') return { label: 'Girl', cls: 'bg-rose-100/90 text-rose-500' }
  if (v === 'boy') return { label: 'Boy', cls: 'bg-sky-100/90 text-sky-600' }
  return { label: 'Neutral', cls: 'bg-cream-100/95 text-bark-500' }
}

function boxTotal(box: ResolvedBox): number {
  return box.customPrice ?? (BOX_BASE_PRICE + box.items.reduce((s, p) => s + (p?.price ?? 0), 0))
}

// ── Modal ────────────────────────────────────────────────────────────────────
function BoxModal({ box, onClose }: { box: ResolvedBox; onClose: () => void }) {
  const items = box.items
  const baby = items.filter(i => i.audience === 'baby')
  const mama = items.filter(i => i.audience === 'mama')
  const other = items.filter(i => !i.audience)
  const grouped = baby.length > 0 || mama.length > 0
  const groups = grouped
    ? [{ title: 'For Baby', list: baby }, { title: 'For Mama', list: mama }, { title: 'Also Included', list: other }].filter(g => g.list.length)
    : [{ title: '', list: items }]

  return (
    <div className="fixed inset-0 z-[60] bg-bark-900/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={onClose}>
      <div className="bg-cream-50 w-full sm:max-w-3xl max-h-[92vh] flex flex-col sm:flex-row overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Image */}
        <div className="relative sm:w-[45%] shrink-0 aspect-[4/5] sm:aspect-auto bg-cream-200">
          {box.image
            ? <Image src={box.image} alt={box.name} fill className="object-cover" unoptimized />
            : <div className="absolute inset-0 flex items-center justify-center text-bark-300"><Package size={32} /></div>}
          <span className={`absolute top-3 left-3 font-sans text-[9px] tracking-[0.2em] uppercase px-2.5 py-1 ${variantBadge(box).cls}`}>{variantBadge(box).label}</span>
        </div>

        {/* Details */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          <div className="flex items-start justify-between gap-3 mb-1">
            <p className="font-sans text-[9px] tracking-[0.35em] uppercase text-gold-400">{box.style}</p>
            <button onClick={onClose} className="text-bark-400 hover:text-bark-600 transition-colors -mt-1"><X size={18} /></button>
          </div>
          <h2 className="font-serif text-3xl text-bark-600 mb-1">{box.name}</h2>
          <p className="font-cormorant text-lg italic text-bark-400 mb-5 leading-snug">{box.tagline}</p>

          <div className="space-y-5 mb-6">
            {groups.map(group => (
              <div key={group.title || 'all'}>
                {group.title && <p className="font-sans text-[10px] tracking-[0.25em] uppercase text-gold-400 mb-2.5 pb-1.5 border-b border-cream-200">{group.title}</p>}
                <ul className="space-y-2.5">
                  {group.list.map(item => {
                    const src = productImg(item)
                    return (
                      <li key={item.id} className="flex items-center gap-3">
                        <div className="w-11 h-11 shrink-0 bg-cream-100 border border-cream-200 overflow-hidden flex items-center justify-center">
                          {src ? <img src={src} alt={item.name} className="w-full h-full object-cover" /> : <span className="text-base">{item.imageEmoji}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-sans text-xs text-bark-600 leading-snug truncate">{item.name}</p>
                          {item.organic && <span className="inline-flex items-center gap-1 text-sage-600"><Leaf size={9} /><span className="font-sans text-[8px] tracking-[0.1em] uppercase">Organic</span></span>}
                        </div>
                        <span className="font-sans text-[11px] text-bark-500 shrink-0">{fmt(item.price)}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-cream-200">
            <div>
              <span className="font-serif text-2xl text-bark-600">{fmt(boxTotal(box))}</span>
              <span className="font-sans text-[10px] text-bark-400 ml-2">all-in</span>
            </div>
            <Link href={`/boxes/${box.slug}`} className="bg-bark-600 text-cream-50 font-sans text-[10px] tracking-[0.2em] uppercase px-6 py-3 hover:bg-bark-700 transition-colors">
              View Full Box →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Section ──────────────────────────────────────────────────────────────────
export function PrebuiltBoxesSection() {
  const [boxes, setBoxes] = useState<ResolvedBox[]>([])
  const [modal, setModal] = useState<ResolvedBox | null>(null)

  useEffect(() => {
    fetch('/api/boxes?featured=true').then(r => r.json()).then(d => setBoxes(d.boxes ?? [])).catch(() => {})
  }, [])

  if (boxes.length === 0) return null

  return (
    <section className="border-t border-cream-300 py-16 sm:py-20">
      <div className="pl-6 sm:pl-9 pr-6 mb-8 flex items-end justify-between">
        <div>
          <p className="font-sans text-[9px] tracking-[0.5em] uppercase text-gold-400 mb-2">Ready-Made</p>
          <h2 className="font-serif text-[2.25rem] sm:text-[3rem] text-bark-600">Curated Gift Sets</h2>
          <p className="font-sans text-xs text-bark-400 mt-2 tracking-wide">Tap any set to peek inside.</p>
        </div>
        <Link href="/boxes" className="hidden sm:inline-block font-sans text-[9px] tracking-[0.2em] uppercase text-bark-400 hover:text-bark-700 transition-colors border-b border-bark-400 pb-0.5">
          View All →
        </Link>
      </div>

      {/* Carousel of cover photos — click to open the set */}
      <div className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory gap-5 pl-6 sm:pl-9 pb-2">
        {boxes.map(box => (
          <button key={box.slug} onClick={() => setModal(box)} className="group shrink-0 w-[78vw] sm:w-[340px] lg:w-[380px] snap-start text-left">
            <div className="relative aspect-[4/5] bg-cream-200 overflow-hidden">
              {box.image
                ? <Image src={box.image} alt={box.name} fill className="object-cover group-hover:scale-[1.03] transition-transform duration-700" unoptimized sizes="(max-width:640px) 78vw, 380px" />
                : <div className="absolute inset-0 flex items-center justify-center text-bark-300"><Package size={32} /></div>}
              {/* Variant label — girl / boy / neutral */}
              <span className={`absolute top-3 left-3 font-sans text-[9px] tracking-[0.2em] uppercase px-2.5 py-1 ${variantBadge(box).cls}`}>{variantBadge(box).label}</span>
              {/* Hover hint — make it obviously clickable */}
              <div className="absolute inset-0 bg-bark-900/0 group-hover:bg-bark-900/30 transition-colors flex items-end justify-center pb-5 opacity-0 group-hover:opacity-100">
                <span className="bg-cream-50 text-bark-700 font-sans text-[10px] tracking-[0.2em] uppercase px-5 py-2.5">View set →</span>
              </div>
            </div>
            <div className="pt-3 flex items-baseline justify-between gap-2">
              <div className="min-w-0">
                <p className="font-sans text-[9px] tracking-[0.3em] uppercase text-gold-400">{box.style}</p>
                <h3 className="font-serif text-xl text-bark-600 truncate">{box.name}</h3>
              </div>
              <span className="font-serif text-lg text-bark-600 shrink-0">{fmt(boxTotal(box))}</span>
            </div>
          </button>
        ))}
        <div className="shrink-0 w-6 sm:w-9" />
      </div>

      {modal && <BoxModal box={modal} onClose={() => setModal(null)} />}
    </section>
  )
}
