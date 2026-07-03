'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { ResolvedBox } from '@/lib/prebuilt-boxes-db'
import { BOX_BASE_PRICE } from '@/lib/products'
import { Package } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

function fmt(cents: number) { return `$${(cents / 100).toFixed(0)}` }
function boxTotal(box: ResolvedBox): number {
  return box.customPrice ?? (BOX_BASE_PRICE + box.items.reduce((s, p) => s + (p?.price ?? 0), 0))
}

function BoxCard({ box }: { box: ResolvedBox }) {
  return (
    <Link href={`/boxes#box-${box.slug}`} className="group block text-center">
      <div className="relative aspect-[4/5] bg-white overflow-hidden">
        {box.image
          ? <Image src={box.image} alt={box.name} fill className="object-cover group-hover:scale-[1.03] transition-transform duration-700" unoptimized sizes="(max-width:640px) 78vw, 400px" />
          : <div className="absolute inset-0 flex items-center justify-center text-bark-300"><Package size={32} /></div>}
      </div>
      <div className="pt-4 text-espresso transition-colors duration-300 group-hover:text-gold-500">
        <h3 className="font-serif text-xl font-semibold leading-tight">{box.name}</h3>
        <p className="font-serif text-lg font-semibold mt-1">{fmt(boxTotal(box))}</p>
      </div>
    </Link>
  )
}

// "The Collection" — every active box, right below Best Sellers.
// Desktop: 3-up grid. Mobile: snap carousel with a peek of the next card + dots.
export function TheCollection() {
  const [boxes, setBoxes] = useState<ResolvedBox[]>([])
  const [active, setActive] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/boxes').then(r => r.json()).then(d => setBoxes(d.boxes ?? [])).catch(() => {})
  }, [])

  if (boxes.length === 0) return null

  function onScroll() {
    const el = trackRef.current
    if (!el) return
    const cardW = el.scrollWidth / boxes.length
    setActive(Math.min(boxes.length - 1, Math.round(el.scrollLeft / cardW)))
  }

  function scrollToIdx(i: number) {
    const el = trackRef.current
    if (!el) return
    el.scrollTo({ left: (el.scrollWidth / boxes.length) * i, behavior: 'smooth' })
  }

  return (
    <section className="pt-4 pb-14 sm:pt-6">
      <div className="px-6 mb-8 text-center">
        <p className="font-sans text-[13px] tracking-[0.18em] uppercase font-medium text-gold-500 mb-2">Every box, every season</p>
        <h2 className="font-playfair text-[2rem] sm:text-[2.6rem] uppercase tracking-[0.01em] font-medium text-espresso leading-none">The Collection</h2>
      </div>

      {/* Desktop — grid */}
      <div className="hidden sm:grid max-w-6xl mx-auto px-6 grid-cols-3 gap-x-5 gap-y-10">
        {boxes.map(box => <BoxCard key={box.slug} box={box} />)}
      </div>

      {/* Mobile — snap carousel with peek + dots */}
      <div className="sm:hidden">
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory gap-4 pl-6 pr-6 scroll-pl-6 pb-2"
        >
          {boxes.map(box => (
            <div key={box.slug} className="shrink-0 w-[78vw] snap-start">
              <BoxCard box={box} />
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-2 mt-4">
          {boxes.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollToIdx(i)}
              aria-label={`Go to box ${i + 1}`}
              className={`w-2 h-2 rounded-full pl-round-full transition-colors ${i === active ? 'bg-gold-500' : 'bg-cream-300'}`}
            />
          ))}
        </div>
      </div>

      {/* Lavender divider */}
      <div className="pt-12 px-6 flex justify-center">
        <div className="flex items-center gap-5 w-full max-w-xs sm:max-w-sm justify-center">
          <span className="flex-1 h-px bg-gold-400/60" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/sprig-color.png" alt="" aria-hidden="true" className="h-8 w-auto object-contain" />
          <span className="flex-1 h-px bg-gold-400/60" />
        </div>
      </div>
    </section>
  )
}
