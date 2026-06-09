'use client'

import { useEffect, useRef } from 'react'

// Wraps a background image and drifts it slower than the page on scroll, so the
// title text (in normal flow) slides over it. Desktop only and respects
// prefers-reduced-motion. The inner layer is oversized (inset -10%) so the
// drift never reveals an edge. Children should fill it (absolute inset-0).
export function ParallaxLayer({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const outer = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 768px)')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (!desktop.matches || reduce.matches) return

    let raf = 0
    const update = () => {
      const el = outer.current, im = inner.current
      if (!el || !im) return
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight || 1
      // -1 when just below the viewport, +1 when just above.
      const p = (rect.top + rect.height / 2 - vh / 2) / (vh / 2 + rect.height / 2)
      const clamped = Math.max(-1, Math.min(1, p))
      const shift = -clamped * rect.height * 0.08 // up to 8% of its height (< the 10% inset)
      im.style.transform = `translate3d(0, ${shift.toFixed(1)}px, 0)`
    }
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update) }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <div ref={outer} className={`absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <div ref={inner} className="absolute inset-[-10%] will-change-transform">{children}</div>
    </div>
  )
}
