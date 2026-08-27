'use client'

import Link from 'next/link'
import { useIsEs } from '@/lib/use-is-es'
import Image from 'next/image'
import { Package, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useEffect, useRef, useCallback } from 'react'
import { formatDollars } from '@/lib/products'

type Box = { slug: string; name: string; image: string | null; low: number; high: number; href?: string }

// Autoplay cadence on phones, and how long a touch/arrow pauses it so the
// carousel never yanks a photo away from someone who is looking at it.
const AUTOPLAY_MS = 2000
const PAUSE_AFTER_INTERACTION_MS = 6000

function BoxCard({ box, sizes }: { box: Box; sizes: string }) {
  return (
    <Link href={box.href ?? `/boxes/${box.slug}`} className="group block w-full text-center">
      <div className="relative aspect-[3/4] bg-white overflow-hidden">
        {box.image
          ? <Image src={box.image} alt={box.name} fill className="object-cover group-hover:scale-[1.03] transition-transform duration-700" sizes={sizes} />
          : <div className="absolute inset-0 flex items-center justify-center text-bark-300"><Package size={32} /></div>}
      </div>
      {/* Caption below the image — espresso, turns gold on hover */}
      <div className="pt-4 text-espresso transition-colors duration-300 group-hover:text-gold-500">
        <h3 className="font-serif text-xl font-semibold leading-tight">{box.name}</h3>
        <p className="font-serif text-lg font-semibold mt-1">{box.low === box.high ? formatDollars(box.low) : `${formatDollars(box.low)} – ${formatDollars(box.high)}`}</p>
      </div>
    </Link>
  )
}

// ── Section ──────────────────────────────────────────────────────────────────
export function PrebuiltBoxesSection() {
  const [boxes, setBoxes] = useState<Box[]>([])
  const isEs = useIsEs()

  useEffect(() => {
    fetch('/api/catalog-nav?bestsellers=1').then(r => r.json()).then(d => setBoxes(d.products ?? [])).catch(() => {})
  }, [])

  // ── Phone carousel state (Emily 2026-08-27: swipe, arrows, auto-advance) ──
  const stripRef = useRef<HTMLDivElement>(null)
  const [idx, setIdx] = useState(0)
  const pausedUntil = useRef(0)
  const programmatic = useRef(false)

  const goTo = useCallback((i: number, byUser: boolean) => {
    const el = stripRef.current
    if (!el || boxes.length === 0) return
    const next = (i + boxes.length) % boxes.length
    if (byUser) pausedUntil.current = Date.now() + PAUSE_AFTER_INTERACTION_MS
    programmatic.current = true
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' })
    setIdx(next)
    setTimeout(() => { programmatic.current = false }, 500)
  }, [boxes.length])

  // Auto-advance every 2s on phones only (the strip is display:none from
  // `sm` up, so clientWidth is 0 there and the tick is a no-op). A visible
  // pause window after any touch or arrow press keeps it from fighting the
  // reader; the tab being hidden also stops it.
  useEffect(() => {
    if (boxes.length < 2) return
    const t = setInterval(() => {
      const el = stripRef.current
      if (!el || el.clientWidth === 0 || document.hidden) return
      if (Date.now() < pausedUntil.current) return
      goTo(Math.round(el.scrollLeft / el.clientWidth) + 1, false)
    }, AUTOPLAY_MS)
    return () => clearInterval(t)
  }, [boxes.length, goTo])

  if (boxes.length === 0) return null

  return (
    <section className="pt-10 pb-12 sm:pt-12">
      <div className="px-6 mb-8 text-center">
        <p className="font-sans text-[13px] tracking-[0.18em] uppercase font-medium text-gold-500 mb-2">{isEs ? 'Listas para regalar' : 'Ready-Made'}</p>
        <h2 className="font-playfair text-[2rem] sm:text-[2.6rem] uppercase tracking-[0.01em] font-medium text-espresso leading-none">{isEs ? 'Las más queridas' : 'Best Sellers'}</h2>
      </div>

      {/* Phones: one box per slide — swipe, arrows, dots, auto-advance. */}
      <div className="sm:hidden relative px-6">
        <div
          ref={stripRef}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
          onScroll={e => {
            if (programmatic.current) return
            const el = e.currentTarget
            setIdx(Math.round(el.scrollLeft / el.clientWidth) % boxes.length)
          }}
          onTouchStart={() => { pausedUntil.current = Date.now() + PAUSE_AFTER_INTERACTION_MS }}
        >
          {boxes.map(box => (
            <div key={box.slug} className="shrink-0 w-full snap-center px-1">
              <BoxCard box={box} sizes="90vw" />
            </div>
          ))}
        </div>
        {boxes.length > 1 && (
          <>
            <button type="button" onClick={() => goTo(idx - 1, true)} aria-label={isEs ? 'Anterior' : 'Previous'}
              className="absolute left-2 top-[38%] -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow flex items-center justify-center text-bark-600 active:bg-white">
              <ChevronLeft size={20} />
            </button>
            <button type="button" onClick={() => goTo(idx + 1, true)} aria-label={isEs ? 'Siguiente' : 'Next'}
              className="absolute right-2 top-[38%] -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow flex items-center justify-center text-bark-600 active:bg-white">
              <ChevronRight size={20} />
            </button>
            <div className="flex justify-center gap-1.5 mt-4">
              {boxes.map((b, i) => (
                <button key={b.slug} type="button" onClick={() => goTo(i, true)} aria-label={`${i + 1}`}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${i === idx ? 'bg-espresso' : 'bg-cream-300'}`} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Tablet/desktop: the contained 3-column grid, unchanged. */}
      <div className="hidden max-w-6xl mx-auto px-6 sm:grid sm:grid-cols-3 sm:gap-x-5 sm:gap-y-10">
        {boxes.map(box => <BoxCard key={box.slug} box={box} sizes="380px" />)}
      </div>
    </section>
  )
}
