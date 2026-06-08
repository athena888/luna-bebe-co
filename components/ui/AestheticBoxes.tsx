'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Leaf, X, Plus, Check } from 'lucide-react'
import type { ResolvedBox, BoxItem } from '@/lib/prebuilt-boxes-db'
import { BOX_BASE_PRICE } from '@/lib/products'
import { addToCart } from '@/lib/cart'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
function fmt(c: number) { return `$${(c / 100).toFixed(0)}` }
function productImg(p: { id: string; image?: string | null }): string | null {
  return p.image ?? (SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/product-images/${p.id}.jpg` : null)
}
function clean(s?: string | null): string {
  return (s ?? '').replace(/GOTS[-‑\s]*certified\s*/gi, '').replace(/\bGOTS\b[-\s]*/gi, '').replace(/\s{2,}/g, ' ').trim()
}

// Product peek — shows details in a modal without leaving the page.
function ProductPeek({ item, onClose }: { item: BoxItem; onClose: () => void }) {
  const [added, setAdded] = useState(false)
  const src = productImg(item)
  return (
    <div className="fixed inset-0 z-[60] bg-bark-900/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md max-h-[92vh] overflow-y-auto relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center bg-white/90 rounded-full text-bark-400 hover:text-bark-600 shadow-sm"><X size={16} /></button>
        <div className="relative w-full aspect-[4/3] bg-cream-100">
          <span className="absolute inset-0 flex items-center justify-center text-5xl">{item.imageEmoji}</span>
          {src && <img src={src} alt={item.name} className="relative w-full h-full object-cover" onError={e => { e.currentTarget.style.display = 'none' }} />}
        </div>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-gold-400">{item.category}</p>
            {item.organic && <span className="inline-flex items-center gap-1 text-sage-600"><Leaf size={10} /><span className="font-sans text-[9px] tracking-[0.1em] uppercase">Organic</span></span>}
          </div>
          <h3 className="font-serif text-2xl text-bark-600 mb-1">{item.name}</h3>
          <p className="font-sans text-lg text-bark-500 mb-4">${(item.price / 100).toFixed(0)}</p>
          {item.description && <p className="font-sans text-sm text-bark-600 leading-relaxed mb-3">{clean(item.description)}</p>}
          {item.ingredients && <p className="font-sans text-xs text-bark-400 mb-5"><span className="font-medium">Materials:</span> {clean(item.ingredients)}</p>}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={() => { addToCart(item); setAdded(true); setTimeout(() => setAdded(false), 1600) }}
              className={`flex-1 inline-flex items-center justify-center gap-2 font-sans text-[10px] tracking-[0.2em] uppercase px-6 py-3 transition-colors ${added ? 'bg-sage-500 text-white' : 'bg-bark-600 text-cream-50 hover:bg-bark-700'}`}
            >
              {added ? <><Check size={13} /> Added</> : <><Plus size={13} /> Add to Box</>}
            </button>
            <Link href={`/products/${item.id}`} className="inline-flex items-center justify-center border border-bark-600 text-bark-600 font-sans text-[10px] tracking-[0.2em] uppercase px-6 py-3 hover:bg-bark-600 hover:text-cream-50 transition-colors">
              View Full Details
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function BoxRow({ box, style, onPeek }: { box: ResolvedBox; style: string; onPeek: (i: BoxItem) => void }) {
  const items = box.items
  const total = box.customPrice ?? (BOX_BASE_PRICE + items.reduce((s, p) => s + (p?.price ?? 0), 0))
  return (
    <div className="bg-cream-50 border border-cream-200 overflow-hidden grid grid-cols-1 md:grid-cols-[minmax(0,46%)_1fr]">
      {/* Image — links to the box; sets the card height */}
      <Link href={`/boxes/${box.slug}`} className="relative aspect-[4/3] md:aspect-auto md:h-[85vh] min-h-[460px] bg-cream-200 block">
        {box.image
          ? <img src={box.image} alt={box.name} className="absolute inset-0 w-full h-full object-cover" />
          : <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-bark-300"><div className="w-8 h-px bg-gold-400" /><span className="font-script text-2xl text-bark-400">Petite Lavande</span><div className="w-8 h-px bg-gold-400" /></div>}
        <span className={`absolute top-3 right-3 font-sans text-[9px] tracking-[0.15em] uppercase px-2.5 py-1 rounded-full capitalize ${box.variant === 'girl' ? 'bg-rose-100/80 text-rose-500' : box.variant === 'boy' ? 'bg-sky-100/80 text-sky-600' : 'bg-cream-100/90 text-bark-500'}`}>{box.variant}</span>
      </Link>

      {/* Details — capped to the image height, items scroll if they overflow */}
      <div className="p-6 sm:p-10 flex flex-col md:h-[85vh]">
        <p className="font-sans text-[9px] tracking-[0.4em] uppercase text-gold-400 mb-1">{style}</p>
        <h2 className="font-serif text-2xl text-bark-600 mb-1">{box.name}</h2>
        <p className="font-cormorant text-base italic text-bark-400 mb-4 leading-snug">{box.tagline}</p>

        <div className="flex-1 overflow-y-auto -mr-2 pr-2 scrollbar-hide">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {items.map((item, idx) => {
              const src = productImg(item)
              return (
                <button key={`${item.id}-${idx}`} onClick={() => onPeek(item)} className="group flex items-center gap-3 text-left">
                  <div className="relative w-16 h-20 shrink-0 overflow-hidden bg-cream-100 border border-cream-200">
                    {src
                      ? <img src={src} alt={item.name} className="w-full h-full object-cover" />
                      : <span className="absolute inset-0 flex items-center justify-center text-xl">{item.imageEmoji}</span>}
                  </div>
                  <div className="min-w-0">
                    <p className="font-sans text-xs text-bark-600 leading-snug group-hover:text-bark-800 line-clamp-2">{item.name}</p>
                    {item.organic && <span className="inline-flex items-center gap-0.5 text-sage-600 mt-0.5"><Leaf size={9} /><span className="font-sans text-[8px] tracking-[0.1em] uppercase">Organic</span></span>}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 mt-4 border-t border-cream-200">
          <div>
            <span className="font-serif text-xl text-bark-600">{fmt(total)}</span>
            <span className="font-sans text-[10px] text-bark-400 ml-2">all-in</span>
          </div>
          <Link href={`/boxes/${box.slug}`} className="font-sans text-[9px] tracking-[0.2em] uppercase text-bark-400 hover:text-bark-600 transition-colors">Shop This Style →</Link>
        </div>
      </div>
    </div>
  )
}

export function AestheticBoxes({ byStyle }: { byStyle: Array<{ style: string; boxes: ResolvedBox[] }> }) {
  const [peek, setPeek] = useState<BoxItem | null>(null)
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 space-y-16">
      {byStyle.map(({ style, boxes }) => (
        <div key={style}>
          <div className="mb-6 pb-4 border-b border-cream-300 flex items-baseline gap-4">
            <p className="font-sans text-[9px] tracking-[0.4em] uppercase text-gold-400">{style}</p>
            <p className="font-sans text-[10px] text-bark-300">{boxes[0]?.aesthetic}</p>
          </div>
          <div className="grid grid-cols-1 gap-6">
            {boxes.map(box => <BoxRow key={box.slug} box={box} style={style} onPeek={setPeek} />)}
          </div>
        </div>
      ))}
      {peek && <ProductPeek item={peek} onClose={() => setPeek(null)} />}
    </div>
  )
}
