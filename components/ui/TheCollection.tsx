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

      <div className="relative max-w-5xl mx-auto px-4 sm:px-16">
        {/* Card — description panel on the left, carousel on the right (stacked
            description-first with a little padding on phones). ≈ 80–90vh. */}
        <div className="relative bg-white border border-cream-200 shadow-sm sm:overflow-hidden sm:flex sm:items-stretch p-3 sm:p-0">
          {/* Web only: lavender artwork straddling the panel/photo seam, top layer */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/decor/lavender-divider.png"
            alt=""
            aria-hidden="true"
            className="hidden sm:block absolute top-1/2 left-[32%] -translate-x-1/2 -translate-y-1/2 w-[340px] lg:w-[400px] h-auto z-20 pointer-events-none drop-shadow-sm"
          />
          {/* Description — olive framed panel (Unforgettable style), left of the
              photo; fades in on swap */}
          <div key={`desc-${idx}`} className="relative bg-[#8A9B63] px-8 py-12 sm:py-10 sm:w-[32%] sm:shrink-0 flex flex-col justify-center text-center" style={{ animation: 'fadeIn 0.8s ease-out both' }}>
            {/* Double-line frame */}
            <div className="pointer-events-none absolute inset-3 border-2 border-white">
              <div className="absolute inset-[5px] border border-white" />
            </div>
            <div className="relative px-2 overflow-y-auto scrollbar-hide">
              {/* Name — same script as "Create Something Unforgettable" */}
              <p className="font-pinyon text-white text-[1.8rem] sm:text-[2rem] leading-tight mb-3">{box.name}</p>
              {(box.tagline || box.description) && (
                <p className="font-playfair italic text-white/90 text-[13px] sm:text-[14px] leading-relaxed mb-5">{box.tagline || box.description}</p>
              )}
              {/* Everything inside */}
              <div className="space-y-1.5 mb-5">
                {box.items.filter(Boolean).map((it, i) => (
                  <p key={i} className="font-playfair text-white text-[13px] sm:text-[14px] leading-snug">{it!.name}</p>
                ))}
              </div>
              {/* Price */}
              <p className="font-playfair text-white text-xl sm:text-2xl mb-4">{fmt(boxTotal(box))}</p>
              {/* Default inclusions */}
              <p className="font-playfair text-white/80 text-[10px] sm:text-[11px] leading-relaxed">
                * Every box comes with a lavender sachet, dried bouquet, sea grass basket &amp; personal card
              </p>
            </div>
          </div>

          <div
            className="relative overflow-hidden bg-cream-100 h-[52vh] sm:h-[72vh] sm:flex-1"
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
                  sizes="(max-width:640px) 100vw, 1024px"
                />
              )
            ))}

            {/* Legibility gradient */}
            <div className="absolute inset-x-0 bottom-0 h-28 sm:h-36 bg-gradient-to-t from-black/55 to-transparent" aria-hidden="true" />

            {/* Whole photo links to the box */}
            <Link href={`/boxes#box-${box.slug}`} className="absolute inset-0 z-10" aria-label={box.name} />

            {/* Name only — baked over the bottom of the image, rises in on swap */}
            <div key={`name-${idx}`} className="absolute bottom-0 inset-x-0 pb-5 sm:pb-7 px-6 text-center pointer-events-none z-10" style={{ animation: 'slideUp 0.7s ease-out both' }}>
              <p className="font-playfair text-white text-2xl sm:text-4xl drop-shadow-md">{box.name}</p>
            </div>

            {/* Arrows on the photo — mobile only; web arrows sit outside the card */}
            {boxes.length > 1 && (
              <div className="sm:hidden">
                <button
                  type="button"
                  onClick={prev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full pl-round-full bg-white/90 shadow-md flex items-center justify-center text-bark-600 hover:bg-white hover:text-espresso transition-colors"
                  aria-label="Previous box"
                >
                  <ChevronLeft size={18} strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={next}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full pl-round-full bg-white/90 shadow-md flex items-center justify-center text-bark-600 hover:bg-white hover:text-espresso transition-colors"
                  aria-label="Next box"
                >
                  <ChevronRight size={18} strokeWidth={1.5} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Web arrows — outside the card, in the side gutters */}
        {boxes.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              className="hidden sm:flex absolute left-1 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full pl-round-full bg-white border border-bark-600 shadow-sm items-center justify-center text-bark-600 hover:bg-cream-100 transition-colors"
              aria-label="Previous box"
            >
              <ChevronLeft size={18} strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={next}
              className="hidden sm:flex absolute right-1 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full pl-round-full bg-white border border-bark-600 shadow-sm items-center justify-center text-bark-600 hover:bg-cream-100 transition-colors"
              aria-label="Next box"
            >
              <ChevronRight size={18} strokeWidth={1.5} />
            </button>
          </>
        )}

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
