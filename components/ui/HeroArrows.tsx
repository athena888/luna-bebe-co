'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

// Small round prev/next buttons for the homepage hero (Little & Fern-style).
// They only dispatch a CustomEvent — RotatingImage (which owns the slide
// state, timer, and swipe) listens via its `navEvent` prop. Kept as separate
// buttons so they can sit ABOVE the hero's scrim/content stack and stay
// clickable; RotatingImage's own layer is underneath and can't take clicks.
export function HeroArrows({ event = 'pl:hero-nav' }: { event?: string }) {
  const fire = (dir: -1 | 1) => window.dispatchEvent(new CustomEvent(event, { detail: dir }))
  const cls = 'w-9 h-9 rounded-full bg-cream-50/90 text-espresso flex items-center justify-center shadow-sm hover:bg-cream-50 transition-colors'
  return (
    <div className="absolute bottom-4 right-4 z-20 flex gap-2">
      <button type="button" aria-label="Previous photo" onClick={() => fire(-1)} className={cls}><ChevronLeft size={18} /></button>
      <button type="button" aria-label="Next photo" onClick={() => fire(1)} className={cls}><ChevronRight size={18} /></button>
    </div>
  )
}
