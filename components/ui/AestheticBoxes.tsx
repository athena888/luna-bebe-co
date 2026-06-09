'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Leaf, X } from 'lucide-react'
import type { ResolvedBox, BoxItem } from '@/lib/prebuilt-boxes-db'
import { BOX_BASE_PRICE } from '@/lib/products'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
function fmt(c: number) { return `$${(c / 100).toFixed(0)}` }
function productImg(p: { id: string; image?: string | null }): string | null {
  return p.image ?? (SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/product-images/${p.id}.jpg` : null)
}
function variantBadge(v: ResolvedBox['variant']) {
  return v === 'girl' ? 'bg-rose-100/85 text-rose-500'
    : v === 'boy' ? 'bg-sky-100/85 text-sky-600'
    : 'bg-cream-100/90 text-bark-500'
}

// Buy straight from the listing — no detour through a detail page.
function BuyBox({ items }: { items: BoxItem[] }) {
  const router = useRouter()
  function buy() {
    sessionStorage.setItem('pl_box_selection', JSON.stringify(items))
    sessionStorage.removeItem('pl_letter')
    router.push('/checkout')
  }
  return (
    <button onClick={buy} className="w-full bg-bark-600 text-cream-50 font-sans text-[10px] tracking-[0.25em] uppercase py-4 hover:bg-bark-700 transition-colors">
      Buy This Box
    </button>
  )
}

// One product line — the whole row links to the product page (the "shortcut").
function ItemEntry({ item }: { item: BoxItem }) {
  const src = productImg(item)
  return (
    <Link href={`/products/${item.id}`} className="group flex items-center gap-3">
      <div className="relative w-14 h-16 shrink-0 overflow-hidden bg-cream-100 border border-cream-200">
        {src
          ? <img src={src} alt={item.name} className="w-full h-full object-cover" />
          : <span className="absolute inset-0 flex items-center justify-center text-lg">{item.imageEmoji}</span>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-sans text-xs text-bark-600 leading-snug group-hover:text-bark-800 line-clamp-2">{item.name}</p>
          <span className="font-sans text-[11px] text-bark-500 shrink-0">{fmt(item.price)}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap mt-0.5">
          <span className="font-sans text-[9px] tracking-[0.15em] uppercase text-gold-400">{item.category}</span>
          {item.organic && <span className="inline-flex items-center gap-0.5 text-sage-600"><Leaf size={9} /><span className="font-sans text-[8px] tracking-[0.1em] uppercase">Organic</span></span>}
        </div>
      </div>
    </Link>
  )
}

// Contents split into clear "For Baby" / "For Mama" parts (two columns on wider
// space, stacked on phones). Uses the item's audience when the box editor set
// it; otherwise infers Mama from the product category (mom / postpartum / etc.).
function ItemColumns({ box }: { box: ResolvedBox }) {
  const isMama = (i: BoxItem) =>
    i.audience === 'mama' ||
    (!i.audience && /\b(mom|mama|mother|matern|postpartum|self.?care)\b/i.test(i.category ?? ''))
  const baby = box.items.filter(i => !isMama(i))
  const mama = box.items.filter(isMama)

  // Audience sections stack vertically (For Baby, then For Mama); within each
  // section the items flow in two columns. Keeps each section compact even when
  // one audience has far more items than the other.
  return (
    <div className="space-y-6">
      {baby.length > 0 && (
        <div>
          <p className="font-sans text-[10px] tracking-[0.25em] uppercase text-gold-400 pb-1.5 mb-3 border-b border-cream-200">For Baby</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
            {baby.map((item, i) => <ItemEntry key={`${item.id}-${i}`} item={item} />)}
          </div>
        </div>
      )}
      {mama.length > 0 && (
        <div>
          <p className="font-sans text-[10px] tracking-[0.25em] uppercase text-gold-400 pb-1.5 mb-3 border-b border-cream-200">For Mama</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
            {mama.map((item, i) => <ItemEntry key={`${item.id}-${i}`} item={item} />)}
          </div>
        </div>
      )}
    </div>
  )
}

function prices(box: ResolvedBox) {
  const contents = box.items.reduce((s, p) => s + (p?.price ?? 0), 0)
  const regular = BOX_BASE_PRICE + contents      // value if pieces were bought separately
  const price = box.customPrice ?? regular        // what we actually charge
  const saving = box.customPrice != null && regular > box.customPrice
  return { regular, price, saving }
}

function PriceBlock({ box }: { box: ResolvedBox }) {
  const { regular, price, saving } = prices(box)
  return (
    <div>
      <div className="flex items-baseline gap-3 flex-wrap">
        {saving && <span className="font-serif text-xl text-bark-400 line-through">{fmt(regular)}</span>}
        <span className="font-serif text-3xl text-bark-600">{fmt(price)}</span>
        {saving && <span className="font-sans text-[10px] tracking-[0.15em] uppercase text-sage-600">Save {fmt(regular - price)}</span>}
      </div>
      <p className="font-sans text-[11px] text-bark-400 mt-1">Includes box, packaging &amp; wax seal · letter added at checkout</p>
    </div>
  )
}

// Mobile: the contents live in a modal, opened by tapping the box.
function ItemsModal({ box, onClose }: { box: ResolvedBox; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] bg-bark-900/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={onClose}>
      <div className="bg-cream-50 w-full sm:max-w-lg max-h-[88vh] flex flex-col overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-4 border-b border-cream-200 shrink-0">
          <div>
            <p className="font-sans text-[9px] tracking-[0.35em] uppercase text-gold-400">{box.style}</p>
            <h3 className="font-serif text-2xl text-bark-600">{box.name}</h3>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-bark-400 hover:text-bark-600 transition-colors -mt-1"><X size={18} /></button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
          <ItemColumns box={box} />
        </div>
        <div className="shrink-0 px-6 py-4 border-t border-cream-200 space-y-3">
          <PriceBlock box={box} />
          <BuyBox items={box.items} />
        </div>
      </div>
    </div>
  )
}

function BoxCard({ box, style, onOpenItems }: { box: ResolvedBox; style: string; onOpenItems: (b: ResolvedBox) => void }) {
  const src = box.image
  return (
    <div className="bg-cream-50 border border-cream-200 overflow-hidden">

      {/* ── Desktop: name+description · image · contents ── */}
      <div className="hidden lg:grid lg:grid-cols-[0.85fr_1.2fr_1.25fr] h-[82vh] max-h-[760px]">
        {/* Left — name + description */}
        <div className="flex flex-col justify-center overflow-y-auto scrollbar-hide p-8 xl:p-10">
          <p className="font-sans text-[9px] tracking-[0.4em] uppercase text-gold-400 mb-2">{style}</p>
          <h2 className="font-serif text-4xl text-bark-600 mb-3 leading-tight">{box.name}</h2>
          <p className="font-cormorant text-xl italic text-bark-400 mb-5 leading-snug">{box.tagline}</p>
          {box.description && <p className="font-sans text-sm text-bark-600 leading-relaxed">{box.description}</p>}
          {box.aesthetic && <p className="font-sans text-[11px] text-bark-300 mt-4 tracking-wide">{box.aesthetic}</p>}
        </div>

        {/* Middle — image (fixed height, object-cover → uniform regardless of upload) */}
        <div className="relative h-full bg-cream-200">
          {src
            ? <img src={src} alt={box.name} className="absolute inset-0 w-full h-full object-cover" />
            : <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-bark-300"><div className="w-8 h-px bg-gold-400" /><span className="font-script text-2xl text-bark-400">Petite Lavande</span><div className="w-8 h-px bg-gold-400" /></div>}
          <span className={`absolute top-3 right-3 font-sans text-[9px] tracking-[0.15em] uppercase px-2.5 py-1 rounded-full capitalize ${variantBadge(box.variant)}`}>{box.variant}</span>
        </div>

        {/* Right — contents (scroll, capped to image height) + price + buy */}
        <div className="flex flex-col h-full p-8 xl:p-10">
          <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark-400 mb-4 shrink-0">What&apos;s Inside</p>
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide -mr-2 pr-2">
            <ItemColumns box={box} />
          </div>
          <div className="shrink-0 pt-5 mt-5 border-t border-cream-200 space-y-4">
            <PriceBlock box={box} />
            <BuyBox items={box.items} />
          </div>
        </div>
      </div>

      {/* ── Mobile: image first → name/description/price → modal for contents ── */}
      <div className="lg:hidden">
        <button onClick={() => onOpenItems(box)} className="relative block w-full aspect-[4/5] bg-cream-200">
          {src
            ? <img src={src} alt={box.name} className="absolute inset-0 w-full h-full object-cover" />
            : <div className="absolute inset-0 flex items-center justify-center text-bark-300"><span className="font-script text-2xl text-bark-400">Petite Lavande</span></div>}
          <span className={`absolute top-3 right-3 font-sans text-[9px] tracking-[0.15em] uppercase px-2.5 py-1 rounded-full capitalize ${variantBadge(box.variant)}`}>{box.variant}</span>
          <span className="absolute bottom-3 right-3 bg-cream-50/90 text-bark-700 font-sans text-[9px] tracking-[0.2em] uppercase px-3 py-1.5">See what&apos;s inside →</span>
        </button>
        <div className="p-6">
          <p className="font-sans text-[9px] tracking-[0.4em] uppercase text-gold-400 mb-2">{style}</p>
          <h2 className="font-serif text-3xl text-bark-600 mb-2 leading-tight">{box.name}</h2>
          <p className="font-cormorant text-lg italic text-bark-400 mb-4 leading-snug">{box.tagline}</p>
          {box.description && <p className="font-sans text-sm text-bark-600 leading-relaxed mb-5">{box.description}</p>}
          <div className="mb-5"><PriceBlock box={box} /></div>
          <BuyBox items={box.items} />
          <button onClick={() => onOpenItems(box)} className="mt-3 w-full border border-bark-600 text-bark-600 font-sans text-[10px] tracking-[0.25em] uppercase py-3.5 hover:bg-bark-600 hover:text-cream-50 transition-colors">
            See What&apos;s Inside
          </button>
        </div>
      </div>
    </div>
  )
}

export function AestheticBoxes({ byStyle }: { byStyle: Array<{ style: string; boxes: ResolvedBox[] }> }) {
  const [openBox, setOpenBox] = useState<ResolvedBox | null>(null)
  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-14 space-y-12">
      {byStyle.map(({ style, boxes }) => (
        <div key={style}>
          <div className="mb-6 pb-4 border-b border-cream-300 flex items-baseline gap-4">
            <p className="font-sans text-[9px] tracking-[0.4em] uppercase text-gold-400">{style}</p>
            <p className="font-sans text-[10px] text-bark-300">{boxes[0]?.aesthetic}</p>
          </div>
          <div className="space-y-10">
            {boxes.map(box => <BoxCard key={box.slug} box={box} style={style} onOpenItems={setOpenBox} />)}
          </div>
        </div>
      ))}
      {openBox && <ItemsModal box={openBox} onClose={() => setOpenBox(null)} />}
    </div>
  )
}
