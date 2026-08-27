'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

// Cross-fades through a set of images. On web it auto-rotates every few seconds;
// on touch it's swipeable (drag left/right to advance). Renders absolutely-
// positioned layers so it works as a section background. With one image it is
// static; respects prefers-reduced-motion (then it just shows the first).
//
// Breakpoint-aware slide lists (2026-08-27): phones rotate through the MOBILE
// list when it exists, desktop through the web list — independently sized.
// The previous <picture> pairing keyed every slide to the DESKTOP list, so a
// second mobile-only photo never rendered and the hero looked dead on phones
// (Emily's exact report: two mobile uploads, one web photo, no rotation).
const MOBILE_MEDIA = '(max-width: 639px)'

export function RotatingImage({ urls, mobileUrls, alt = '', className = '', intervalMs = 5000, navEvent }: {
  urls: string[]
  mobileUrls?: string[]
  alt?: string
  className?: string
  intervalMs?: number
  /** CustomEvent name to listen for manual prev/next (detail: -1 | 1). Lets
   *  arrow buttons live OUTSIDE this layer — the hero stacks scrim + content
   *  above the image, so buttons rendered here would be unclickable. */
  navEvent?: string
}) {
  const web = urls.filter(Boolean)
  const mobile = (mobileUrls ?? []).filter(Boolean)
  // SSR renders the web list; phones switch to their own list on hydration.
  // (Brief first-paint web crop on phones — same as the old fallback path.)
  const [isMobile, setIsMobile] = useState(false)
  const [i, setI] = useState(0)
  const startX = useRef<number | null>(null)

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MEDIA)
    const apply = () => { setIsMobile(mq.matches); setI(0) }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  const list = isMobile && mobile.length > 0 ? mobile : web.length > 0 ? web : mobile

  // Reschedule after every change so a manual swipe restarts the timer cleanly.
  useEffect(() => {
    if (list.length <= 1) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const t = setTimeout(() => setI(p => (p + 1) % list.length), intervalMs)
    return () => clearTimeout(t)
  }, [i, list.length, intervalMs])

  useEffect(() => {
    if (!navEvent || list.length <= 1) return
    const h = (e: Event) => setI(p => (p + ((e as CustomEvent<number>).detail === -1 ? -1 : 1) + list.length) % list.length)
    window.addEventListener(navEvent, h)
    return () => window.removeEventListener(navEvent, h)
  }, [navEvent, list.length])

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
        // One slide per entry from the ACTIVE list only — the inactive
        // breakpoint's photos are never in the DOM, so they don't download.
        // Served through the image optimizer, not as the raw upload: the raw
        // 4000px hero made phones shrink it 4x in the browser, which turned
        // the fine knit texture into a visible moiré grid (Emily 2026-08-27)
        // and cost a 4MB download. Pre-resized with a proper filter, no grid.
        <Image
          key={`${u}-${idx}`}
          src={u}
          alt={idx === 0 ? alt : ''}
          aria-hidden={idx !== 0}
          fill
          sizes="100vw"
          quality={88}
          priority={idx === 0}
          className={`object-cover transition-opacity duration-1000 ${idx === i % list.length ? 'opacity-100' : 'opacity-0'}`}
        />
      ))}
    </div>
  )
}
