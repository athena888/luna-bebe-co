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
    <section className="border-t border-cream-300 pt-10 pb-12 sm:pt-12">
      <div className="pl-6 sm:pl-9 pr-6 mb-6 flex items-end justify-between">
        <div>
          <p className="font-sans text-[9px] tracking-[0.5em] uppercase text-gold-400 mb-2">Ready-Made</p>
          <h2 className="font-serif text-[2.25rem] sm:text-[3rem] text-espresso">Curated Gift Sets</h2>
          <p className="font-sans text-xs text-bark-400 mt-2 tracking-wide">Tap any set to see the full box.</p>
        </div>
        <Link href="/boxes" className="hidden sm:inline-block font-sans text-[9px] tracking-[0.2em] uppercase text-bark-400 hover:text-bark-700 transition-colors border-b border-bark-400 pb-0.5">
          View All →
        </Link>
      </div>

      {/* Carousel of cover photos — click to open the set */}
      <div className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory gap-5 pl-6 sm:pl-9 pb-2">
        {boxes.map(box => (
          <Link key={box.slug} href={`/boxes#box-${box.slug}`} className="group shrink-0 w-[78vw] sm:w-[340px] lg:w-[380px] snap-start text-left">
            <div className="relative aspect-[4/5] bg-white overflow-hidden">
              {box.image
                ? <Image src={box.image} alt={box.name} fill className="object-cover group-hover:scale-[1.03] transition-transform duration-700" unoptimized sizes="(max-width:640px) 78vw, 380px" />
                : <div className="absolute inset-0 flex items-center justify-center text-bark-300"><Package size={32} /></div>}
              {/* Name + price baked onto the image */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />
              <div className="absolute bottom-0 inset-x-0 p-4">
                <p className="font-sans text-[9px] tracking-[0.3em] uppercase text-cream-100/80 mb-1">{box.style}</p>
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-serif text-xl text-white truncate drop-shadow">{box.name}</h3>
                  <span className="font-serif text-lg text-white shrink-0 drop-shadow">{fmt(boxTotal(box))}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
        <div className="shrink-0 w-6 sm:w-9" />
      </div>
    </section>
  )
}
