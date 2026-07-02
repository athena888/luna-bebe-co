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
          </Link>
        ))}
        <div className="shrink-0 w-6 sm:w-9" />
      </div>
    </section>
  )
}
