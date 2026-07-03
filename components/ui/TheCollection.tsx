'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { ResolvedBox } from '@/lib/prebuilt-boxes-db'
import { BOX_BASE_PRICE } from '@/lib/products'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

function fmt(cents: number) { return `$${(cents / 100).toFixed(0)}` }
function boxTotal(box: ResolvedBox): number {
  return box.customPrice ?? (BOX_BASE_PRICE + box.items.reduce((s, p) => s + (p?.price ?? 0), 0))
}

// "The Collection" — one box at a time as a full-bleed showcase. The photo
// fills the stage; the description sits over the top of the image and the
// name + price are baked over the bottom in white. Texts fade in on swap.
// Arrows + swipe + dots on both desktop and mobile.
export function TheCollection() {
  const [boxes, setBoxes] = useState<ResolvedBox[]>([])
  const [idx, setIdx] = useState(0)
  const touchX = useRef<number | null>(null)

  useEffect(() => {
    fetch('/api/boxes').then(r => r.json()).then(d => setBoxes(d.boxes ?? [])).catch(() => {})
  }, [])

  if (boxes.length === 0) return null

  const box = boxes[idx % boxes.length]
  const prev = () => setIdx(i => (i - 1 + boxes.length) % boxes.length)
  const next = () => setIdx(i => (i + 1) % boxes.length)

  return (
    <section className="pt-4 pb-14 sm:pt-6">
      <div className="px-6 mb-8 text-center">
        <p className="font-sans text-[13px] tracking-[0.18em] uppercase font-medium text-gold-500 mb-2">Every box, every season</p>
        <h2 className="font-playfair text-[2rem] sm:text-[2.6rem] uppercase tracking-[0.01em] font-medium text-espresso leading-none">The Collection</h2>
      </div>

      <div className="max-w-6xl mx-auto sm:px-6">
        <div
          className="relative overflow-hidden bg-cream-100 aspect-[4/5] sm:aspect-[16/9]"
          onTouchStart={e => { touchX.current = e.touches[0].clientX }}
          onTouchEnd={e => {
            if (touchX.current == null) return
            const dx = e.changedTouches[0].clientX - touchX.current
            touchX.current = null
            if (dx > 40) prev()
            else if (dx < -40) next()
          }}
        >
          {/* Cross-fading photos — all mounted, active one visible */}
          {boxes.map((b, i) => (
            b.image && (
              <Image
                key={b.slug}
                src={b.image}
                alt={b.name}
                fill
                className={`object-cover transition-opacity duration-700 ${i === idx ? 'opacity-100' : 'opacity-0'}`}
                unoptimized
                sizes="(max-width:640px) 100vw, 1152px"
              />
            )
          ))}

          {/* Legibility gradients */}
          <div className="absolute inset-x-0 top-0 h-28 sm:h-32 bg-gradient-to-b from-black/45 to-transparent" aria-hidden="true" />
          <div className="absolute inset-x-0 bottom-0 h-32 sm:h-40 bg-gradient-to-t from-black/55 to-transparent" aria-hidden="true" />

          {/* Whole stage links to the box */}
          <Link href={`/boxes#box-${box.slug}`} className="absolute inset-0 z-10" aria-label={box.name} />

          {/* Description — over the top of the image, fades in on swap */}
          <div key={`desc-${idx}`} className="absolute top-0 inset-x-0 pt-5 sm:pt-7 px-8 sm:px-16 text-center pointer-events-none z-10" style={{ animation: 'fadeIn 0.9s ease-out both' }}>
            <p className="font-playfair italic text-white/95 text-[13px] sm:text-lg leading-snug drop-shadow-md">{box.tagline || box.description}</p>
          </div>

          {/* Name + price — baked over the bottom in white, rises in on swap */}
          <div key={`name-${idx}`} className="absolute bottom-0 inset-x-0 pb-6 sm:pb-8 px-6 text-center pointer-events-none z-10" style={{ animation: 'slideUp 0.7s ease-out both' }}>
            <p className="font-playfair text-white text-2xl sm:text-4xl drop-shadow-md">{box.name}</p>
            <p className="font-sans text-white/90 text-[11px] tracking-[0.25em] uppercase mt-1.5 drop-shadow-md">{fmt(boxTotal(box))}</p>
          </div>

          {/* Arrows — desktop & mobile */}
          {boxes.length > 1 && (
            <>
              <button
                type="button"
                onClick={prev}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full pl-round-full bg-white/90 shadow-md flex items-center justify-center text-bark-600 hover:bg-white hover:text-espresso transition-colors"
                aria-label="Previous box"
              >
                <ChevronLeft size={18} strokeWidth={1.5} />
              </button>
              <button
                type="button"
                onClick={next}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full pl-round-full bg-white/90 shadow-md flex items-center justify-center text-bark-600 hover:bg-white hover:text-espresso transition-colors"
                aria-label="Next box"
              >
                <ChevronRight size={18} strokeWidth={1.5} />
              </button>
            </>
          )}
        </div>

        {/* Dots */}
        {boxes.length > 1 && (
          <div className="flex justify-center gap-2 mt-5">
            {boxes.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                aria-label={`Go to box ${i + 1}`}
                className={`w-2 h-2 rounded-full pl-round-full transition-colors ${i === idx ? 'bg-gold-500' : 'bg-cream-300'}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Lavender divider — watercolor artwork */}
      <div className="pt-12 px-6 flex justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/decor/lavender-divider.png" alt="" aria-hidden="true" className="w-full max-w-xl h-auto" />
      </div>
    </section>
  )
}
