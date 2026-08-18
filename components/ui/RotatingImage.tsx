'use client'

import { useEffect, useRef, useState } from 'react'

// Cross-fades through a set of images. On web it auto-rotates every few seconds;
// on touch it's swipeable (drag left/right to advance). Renders absolutely-
// positioned layers so it works as a section background. With one image it is
// static; respects prefers-reduced-motion (then it just shows the first).
const MOBILE_MEDIA = '(max-width: 639px)'

function RotatingImageCore({ urls, mobileUrls, alt = '', className = '', intervalMs = 5000 }: {
  urls: string[]
  mobileUrls?: string[]
  alt?: string
  className?: string
  intervalMs?: number
}) {
  const list = urls.filter(Boolean)
  const mobile = (mobileUrls ?? []).filter(Boolean)
  const [i, setI] = useState(0)
  const startX = useRef<number | null>(null)

  // Reschedule after every change so a manual swipe restarts the timer cleanly.
  useEffect(() => {
    if (list.length <= 1) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const t = setTimeout(() => setI(p => (p + 1) % list.length), intervalMs)
    return () => clearTimeout(t)
  }, [i, list.length, intervalMs])

  if (list.length === 0) return null

  const go = (n: number) => setI(p => (p + n + list.length) % list.length)
  const onTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current == null) return
    const dx = e.changedTouches[0].clientX - startX.current
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
    startX.current = null
  }

  const swipe = list.length > 1
  return (
    <div
      className={`absolute inset-0 ${className}`}
      onTouchStart={swipe ? onTouchStart : undefined}
      onTouchEnd={swipe ? onTouchEnd : undefined}
    >
      {list.map((u, idx) => (
        // <picture> so the browser downloads ONE crop, not both. Rendering a
        // desktop <img> and a phone <img> and hiding one with CSS still
        // downloads both — `display:none` doesn't cancel an image request —
        // which was costing every phone visitor a full desktop hero.
        <picture key={`${u}-${idx}`}>
          {mobile[idx] && <source media={MOBILE_MEDIA} srcSet={mobile[idx]} />}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={u}
            alt={idx === 0 ? alt : ''}
            aria-hidden={idx !== 0}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${idx === i % list.length ? 'opacity-100' : 'opacity-0'}`}
          />
        </picture>
      ))}
    </div>
  )
}

/** RotatingImage with an optional separate PHONE gallery. When `mobileUrls`
 *  has images, phones (< sm) get those portrait crops while desktop keeps the
 *  landscape set — no more bad crops of wide heroes on mobile. With no mobile
 *  set, all screens share `urls`.
 *
 *  Both crops are paired inside one <picture> per slide rather than rendered
 *  as two CSS-hidden galleries, so a phone downloads the phone crop only.
 *  The mobile list is matched by index; if it's shorter, later slides fall
 *  back to the desktop crop for those positions. */
export function RotatingImage({ urls, mobileUrls, alt = '', className = '', intervalMs = 5000 }: {
  urls: string[]
  mobileUrls?: string[]
  alt?: string
  className?: string
  intervalMs?: number
}) {
  const mobile = (mobileUrls ?? []).filter(Boolean)
  // A phone-only gallery (no desktop set) still needs something in <img>.
  const web = urls.filter(Boolean)
  if (web.length === 0 && mobile.length > 0) {
    return <RotatingImageCore urls={mobile} alt={alt} className={className} intervalMs={intervalMs} />
  }
  return <RotatingImageCore urls={web} mobileUrls={mobile} alt={alt} className={className} intervalMs={intervalMs} />
}
