'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { ResolvedBox } from '@/lib/prebuilt-boxes-db'
import { BOX_BASE_PRICE } from '@/lib/products'
import { Package } from 'lucide-react'
import { useState, useEffect } from 'react'

function fmt(cents: number) { return `$${(cents / 100).toFixed(0)}` }

function boxTotal(box: ResolvedBox): number {
  return box.customPrice ?? (BOX_BASE_PRICE + box.items.reduce((s, p) => s + (p?.price ?? 0), 0))
}

// ── Section ──────────────────────────────────────────────────────────────────
export function PrebuiltBoxesSection() {
  const [boxes, setBoxes] = useState<ResolvedBox[]>([])

  useEffect(() => {
    fetch('/api/boxes?featured=true').then(r => r.json()).then(d => setBoxes(d.boxes ?? [])).catch(() => {})
  }, [])

  if (boxes.length === 0) return null

  return (
    <section className="pt-10 pb-12 sm:pt-12">
      <div className="px-6 mb-8 text-center">
        <p className="font-sans text-[11px] tracking-[0.22em] uppercase font-semibold text-gold-500 mb-1.5">Ready-Made</p>
        <h2 className="font-serif text-[2.5rem] sm:text-[3.25rem] uppercase tracking-normal font-medium text-espresso leading-none">Best Sellers</h2>
      </div>

      {/* Carousel of cover photos — click to open the set */}
      <div className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory gap-5 pl-6 sm:pl-9 pr-6 scroll-pl-6 sm:scroll-pl-9 pb-2">
        {boxes.map(box => (
          <Link key={box.slug} href={`/boxes#box-${box.slug}`} className="group shrink-0 w-[78vw] sm:w-[340px] lg:w-[380px] snap-start text-center">
            <div className="relative aspect-[4/5] bg-white overflow-hidden">
              {box.image
                ? <Image src={box.image} alt={box.name} fill className="object-cover group-hover:scale-[1.03] transition-transform duration-700" unoptimized sizes="(max-width:640px) 78vw, 380px" />
                : <div className="absolute inset-0 flex items-center justify-center text-bark-300"><Package size={32} /></div>}
            </div>
            {/* Caption below the image — espresso, turns gold on hover */}
            <div className="pt-4 text-espresso transition-colors duration-300 group-hover:text-gold-500">
              <p className="font-sans text-[9px] tracking-[0.3em] uppercase font-semibold text-gold-400 mb-1.5 transition-colors duration-300 group-hover:text-gold-500">{box.style}</p>
              <h3 className="font-serif text-xl font-semibold leading-tight">{box.name}</h3>
              <p className="font-serif text-lg font-semibold mt-1">{fmt(boxTotal(box))}</p>
            </div>
          </Link>
        ))}
        <div className="shrink-0 w-6 sm:w-9" />
      </div>
    </section>
  )
}
