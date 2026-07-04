'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { ResolvedBox } from '@/lib/prebuilt-boxes-db'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { QuickAddBox } from '@/components/ui/QuickAddBox'

// "The Collection" — full-bleed split: the "Create Something Unforgettable"
// olive panel on the left (copy from Portal → Homepage), the box carousel on
// the right with the name baked over the photo. Arrows + swipe + dots.
export function TheCollection({ title, body, items }: { title: string; body: string; items: string[] }) {
  const [boxes, setBoxes] = useState<ResolvedBox[]>([])
  const [idx, setIdx] = useState(0)
  const touchX = useRef<number | null>(null)

  useEffect(() => {
    fetch('/api/boxes').then(r => r.json()).then(d => setBoxes(d.boxes ?? [])).catch(() => {})
  }, [])

  // Auto-advance every 2s. Keying on idx restarts the timer after any manual
  // change (arrows, swipe), so it only fires when the user leaves it alone.
  useEffect(() => {
    if (boxes.length < 2) return
    const t = setTimeout(() => setIdx(i => (i + 1) % boxes.length), 2000)
    return () => clearTimeout(t)
  }, [idx, boxes.length])

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

      <div className="relative">
        {/* Full-bleed split — olive panel left, carousel right (stacked
            description-first with a little padding on phones), ~85vh like the
            Unforgettable section. No card border. */}
        <div className="relative sm:flex sm:items-stretch p-3 sm:p-0">
          {/* Left — the "Create Something Unforgettable" panel (static copy,
              editable in Portal → Homepage), frame inset like the homepage one */}
          <div className="relative bg-[#8A9B63] px-10 sm:px-16 lg:px-20 py-16 sm:py-12 sm:w-1/2 sm:shrink-0 flex flex-col items-center justify-center text-center">
            {/* Double-line frame — heavier outer rule, thin inner rule */}
            <div className="pointer-events-none absolute inset-4 sm:inset-6 border-2 border-white">
              <div className="absolute inset-[6px] border border-white" />
            </div>
            <div className="relative max-w-md w-full">
              <h3 className="font-pinyon text-[clamp(1.5rem,6.2vw,2rem)] sm:text-[clamp(1.5rem,2.9vw,2.5rem)] text-white leading-tight whitespace-nowrap mb-7">
                {title}
              </h3>
              <p className="font-playfair text-[15px] sm:text-[16px] text-white/95 leading-relaxed mb-8">
                {body}
              </p>
              <div className="space-y-2.5 mb-9">
                {items.filter(it => it.trim()).map((item, i) => (
                  <p key={i} className="font-playfair text-[14px] sm:text-[15px] text-white leading-relaxed">- {item}</p>
                ))}
              </div>
              <Link
                href="/boxes"
                className="inline-block font-sans text-[12px] tracking-[0.3em] uppercase text-white border-b border-white pb-1 hover:text-cream-100 hover:border-cream-100 transition-colors"
              >
                Shop Now
              </Link>
            </div>
          </div>

          <div
            className="relative overflow-hidden bg-cream-100 h-[52vh] sm:h-auto sm:min-h-[85vh] sm:flex-1"
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

            {/* Quick add — drops the current box into the bag */}
            <QuickAddBox box={box} className="absolute bottom-4 right-3 sm:bottom-6 sm:right-5 z-20" />

            {/* Arrows — just inside the photo's edges on every screen size */}
            {boxes.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prev}
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center text-white/90 drop-shadow-md hover:text-white transition-colors"
                  aria-label="Previous box"
                >
                  <ChevronLeft size={28} strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={next}
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center text-white/90 drop-shadow-md hover:text-white transition-colors"
                  aria-label="Next box"
                >
                  <ChevronRight size={28} strokeWidth={1.5} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Lavender divider — watercolor artwork, brand line beneath */}
      <div className="pt-12 px-6 flex flex-col items-center text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/decor/lavender-divider.png" alt="" aria-hidden="true" className="w-full max-w-xl h-auto" />
        <p className="font-serif italic text-espresso-light text-lg sm:text-xl mt-4">Fait avec amour, pour vous.</p>
      </div>
    </section>
  )
}
