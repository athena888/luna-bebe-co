'use client'

import { useEffect, useRef, useState } from 'react'

// The mobile sticky purchase bar.
//
// It appears only AFTER the real buy button has scrolled out of view, and hides
// again the moment that button is back on screen — two identical calls to
// action visible at once is a competing-button problem, not a helpful one.
//
// It does not duplicate the purchase logic. It scrolls to the real control and
// focuses it, so variant, size and colour choices are made in one place and the
// analytics fire from one place. `IntersectionObserver` means no scroll handler
// on the main thread.

export function MobileStickyPurchaseCTA({
  targetId,
  label,
  price,
  productName,
}: {
  /** id of the real buy control this bar stands in for. */
  targetId: string
  label: string
  price: string
  productName: string
}) {
  const [visible, setVisible] = useState(false)
  const seen = useRef(false)

  useEffect(() => {
    const target = document.getElementById(targetId)
    if (!target) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) seen.current = true
        // Only after the real CTA has been on screen once: on a fast scroll
        // from the very top the bar would otherwise flash in before the visitor
        // has seen the price it refers to.
        setVisible(seen.current && !entry.isIntersecting)
      },
      { rootMargin: '0px 0px -20% 0px' },
    )
    io.observe(target)
    return () => io.disconnect()
  }, [targetId])

  function jump() {
    const target = document.getElementById(targetId)
    if (!target) return
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const focusable = target.querySelector<HTMLElement>('button:not([disabled]), a[href]')
    // Focus after the smooth scroll settles, so the browser doesn't cancel it.
    window.setTimeout(() => focusable?.focus({ preventScroll: true }), 450)
  }

  return (
    <div
      className={`lg:hidden fixed inset-x-0 bottom-0 z-40 pl-sticky-pad transition-transform duration-300 ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
      // Hidden from assistive tech and from tab order while off screen: the
      // real button below is the canonical control.
      aria-hidden={!visible}
    >
      <div className="bg-[color:var(--color-cream-white)] border-t border-[color:var(--color-oat)] shadow-[0_-6px_20px_rgba(75,63,55,0.10)] px-4 py-3 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-sans text-[12px] text-[color:var(--color-ink-soft)] truncate">{productName}</p>
          <p className="font-sans text-[15px] text-[color:var(--color-ink)] leading-tight">{price}</p>
        </div>
        <button
          type="button"
          onClick={jump}
          tabIndex={visible ? 0 : -1}
          className="shrink-0 bg-[color:var(--color-ink)] text-[color:var(--color-parchment)] font-sans text-[12px] tracking-[0.14em] uppercase font-semibold px-6 py-3.5 hover:bg-[color:var(--color-burgundy)] transition-colors"
        >
          {label}
        </button>
      </div>
    </div>
  )
}
