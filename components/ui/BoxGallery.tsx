'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useIsEs } from '@/lib/use-is-es'

// Box-page gallery. ALL variants' photos appended into one strip (tagged with
// their variant), starting at the selected variant's first photo — swiping
// flows from one variant's set into the next without a page change. As the
// visible photo changes, a `pl:box-gallery-variant` event tells the variant
// pills (BoxVariantPills) which variant to highlight. Tapping/clicking any
// photo opens a fullscreen lightbox with swipe, arrows and keyboard nav.
//
// Mobile: swipe carousel (scroll-snap) with dots + "1/6" counter.
// Desktop: main image (click = fullscreen, drag = prev/next) + thumb rail.

export interface GalleryImage {
  src: string
  variantKey: string
  variantLabel: string
}

export const GALLERY_VARIANT_EVENT = 'pl:box-gallery-variant'

export function BoxGallery({ images, alt, startKey }: { images: GalleryImage[]; alt: string; startKey?: string }) {
  const isEs = useIsEs()
  const startIdx = Math.max(0, images.findIndex(i => i.variantKey === startKey))
  const [idx, setIdx] = useState(startIdx)
  const [open, setOpen] = useState(false)
  const stripRef = useRef<HTMLDivElement>(null)
  // Set while WE scroll the mobile strip programmatically, so its onScroll
  // doesn't echo a stale index back and fight the navigation.
  const programmatic = useRef(false)

  const clamp = useCallback((i: number) => Math.min(Math.max(i, 0), images.length - 1), [images.length])

  const goTo = useCallback((i: number) => {
    const next = clamp(i)
    setIdx(next)
    const el = stripRef.current
    if (el && el.clientWidth > 0 && Math.round(el.scrollLeft / el.clientWidth) !== next) {
      programmatic.current = true
      el.scrollTo({ left: next * el.clientWidth, behavior: 'auto' })
      setTimeout(() => { programmatic.current = false }, 150)
    }
  }, [clamp])

  // Tell the variant pills which variant's photo is on screen.
  useEffect(() => {
    const key = images[idx]?.variantKey
    if (key) window.dispatchEvent(new CustomEvent(GALLERY_VARIANT_EVENT, { detail: { key } }))
  }, [idx, images])

  // Start the mobile strip on the selected variant's first photo.
  useEffect(() => {
    const el = stripRef.current
    if (el && startIdx > 0) {
      programmatic.current = true
      el.scrollTo({ left: startIdx * el.clientWidth })
      setTimeout(() => { programmatic.current = false }, 150)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // A pill click navigates to ?variant=… and the page re-renders with a new
  // startKey while this component stays mounted — idx state would otherwise
  // stay put and the photos never change (the bug Emily saw). Jump to that
  // variant's first photo. No-op when the visible photo already belongs to
  // it, which is exactly the case after a swipe-driven replace(), so swipe
  // and click can never chase each other.
  useEffect(() => {
    if (!startKey || images[idx]?.variantKey === startKey) return
    const first = images.findIndex(i => i.variantKey === startKey)
    if (first >= 0) goTo(first)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startKey])

  // Lightbox: keyboard nav + body scroll lock.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
      if (e.key === 'ArrowRight') goTo(idx + 1)
      if (e.key === 'ArrowLeft') goTo(idx - 1)
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, idx, goTo])

  // Pointer swipe (desktop main image + lightbox): a horizontal drag past the
  // threshold moves one photo; a short tap falls through to onClick.
  const drag = useRef<{ x: number; y: number } | null>(null)
  const swipeHandlers = {
    onPointerDown: (e: React.PointerEvent) => { drag.current = { x: e.clientX, y: e.clientY } },
    onPointerUp: (e: React.PointerEvent) => {
      const start = drag.current
      drag.current = null
      if (!start) return
      const dx = e.clientX - start.x
      const dy = e.clientY - start.y
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        e.preventDefault()
        e.stopPropagation()
        goTo(idx + (dx < 0 ? 1 : -1))
      }
    },
  }
  // A pointerup that just swiped suppresses the click that follows it.
  const suppressClick = useRef(false)
  const swipeOrClick = {
    onPointerDown: swipeHandlers.onPointerDown,
    onPointerUp: (e: React.PointerEvent) => {
      const start = drag.current
      swipeHandlers.onPointerUp(e)
      if (start && Math.abs(e.clientX - start.x) > 40) suppressClick.current = true
    },
    onClick: () => {
      if (suppressClick.current) { suppressClick.current = false; return }
      setOpen(true)
    },
  }

  if (images.length === 0) {
    return (
      <div className="relative aspect-[3/4] bg-cream-200 border border-cream-300">
        <div className="absolute inset-0 flex items-center justify-center font-sans text-xs tracking-[0.14em] uppercase text-bark-300">{isEs ? 'Fotografía muy pronto' : 'Photography coming soon'}</div>
      </div>
    )
  }

  const current = images[clamp(idx)]
  const imgAlt = (i: number) => `${alt} — ${images[i].variantLabel} ${i + 1}`

  return (
    <div>
      {/* Mobile: swipe strip */}
      <div className="lg:hidden">
        <div
          ref={stripRef}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
          onScroll={e => {
            if (programmatic.current) return
            const el = e.currentTarget
            setIdx(clamp(Math.round(el.scrollLeft / el.clientWidth)))
          }}
        >
          {images.map((img, i) => (
            <button key={i} type="button" onClick={() => { setIdx(i); setOpen(true) }} aria-label={isEs ? 'Ver en pantalla completa' : 'View fullscreen'} className="relative shrink-0 w-full aspect-[3/4] snap-center bg-cream-200">
              <Image quality={88} src={img.src} alt={imgAlt(i)} fill className="object-cover" />
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between mt-2 px-1">
          <div className="flex gap-1.5">
            {images.map((_, i) => (
              <span key={i} className={`w-1.5 h-1.5 ${i === idx ? 'bg-espresso' : 'bg-cream-300'}`} />
            ))}
          </div>
          <span className="font-sans text-[11px] text-bark-400">{idx + 1}/{images.length}</span>
        </div>
      </div>

      {/* Desktop: main + thumb rail */}
      <div className="hidden lg:flex gap-3">
        <div className="flex flex-col gap-2 w-16 max-h-[80vh] overflow-y-auto scrollbar-hide">
          {images.map((img, i) => (
            <button key={i} type="button" onClick={() => goTo(i)} className={`relative aspect-square shrink-0 border transition-colors ${i === idx ? 'border-espresso' : 'border-cream-300 hover:border-espresso-light'}`}>
              <Image quality={88} src={img.src} alt={imgAlt(i)} fill className="object-cover" />
            </button>
          ))}
        </div>
        <div
          className="relative flex-1 aspect-[3/4] bg-cream-200 overflow-hidden group cursor-zoom-in select-none touch-pan-y"
          {...swipeOrClick}
          role="button"
          aria-label={isEs ? 'Ver en pantalla completa' : 'View fullscreen'}
        >
          <Image quality={88} src={current.src} alt={imgAlt(clamp(idx))} fill className="object-cover transition-transform duration-300 group-hover:scale-105" draggable={false} />
        </div>
      </div>

      {/* Fullscreen lightbox — swipe, arrows, keyboard, counter */}
      {open && (
        <div className="fixed inset-0 z-[70] bg-bark-800/95 flex flex-col" onClick={() => setOpen(false)}>
          <div className="flex items-center justify-between px-4 py-3 shrink-0">
            <span className="font-sans text-[11px] tracking-[0.14em] uppercase text-cream-200/80">{current.variantLabel}</span>
            <button type="button" onClick={() => setOpen(false)} aria-label={isEs ? 'Cerrar' : 'Close'} className="text-cream-100 hover:text-white transition-colors p-2 -m-2">
              <X size={22} />
            </button>
          </div>
          <div
            className="relative flex-1 min-h-0 touch-pan-y select-none"
            onClick={e => e.stopPropagation()}
            {...swipeHandlers}
          >
            <Image quality={88} src={current.src} alt={imgAlt(clamp(idx))} fill className="object-contain" sizes="100vw" draggable={false} priority />
            {idx > 0 && (
              <button type="button" onClick={() => goTo(idx - 1)} aria-label={isEs ? 'Anterior' : 'Previous'} className="absolute left-2 top-1/2 -translate-y-1/2 text-cream-100/90 hover:text-white bg-bark-800/40 hover:bg-bark-800/70 p-2 transition-colors">
                <ChevronLeft size={26} />
              </button>
            )}
            {idx < images.length - 1 && (
              <button type="button" onClick={() => goTo(idx + 1)} aria-label={isEs ? 'Siguiente' : 'Next'} className="absolute right-2 top-1/2 -translate-y-1/2 text-cream-100/90 hover:text-white bg-bark-800/40 hover:bg-bark-800/70 p-2 transition-colors">
                <ChevronRight size={26} />
              </button>
            )}
          </div>
          <div className="text-center py-3 shrink-0">
            <span className="font-sans text-[12px] text-cream-200/80">{idx + 1} / {images.length}</span>
          </div>
        </div>
      )}
    </div>
  )
}
