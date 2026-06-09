'use client'

import { useState, useEffect } from 'react'
import { ParallaxLayer } from './ParallaxLayer'

type Img = { public_url: string; alt_text: string }

// Renders an owner-managed image as a soft background behind a section's
// content (page headers, footer). Fail-soft: when no image is set the section
// looks exactly as before. A translucent scrim keeps overlaid text readable.
//   fit="cover"   (default) — fill & crop to the section.
//   fit="contain" — show the whole image, letterboxed.
//   fit="natural" — show the whole image at full width/height; the section
//                   grows to the image and the text is centered over it.
//   parallax      — drift the image slower than the page on scroll (cover only,
//                   desktop only, reduced-motion-safe).
// If a `${slotKey}.mobile` crop is uploaded it's shown on phones (< sm) while
// the main image shows on larger screens — purely via responsive classes.
export function SlotBackground({
  slotKey,
  children,
  className = '',
  scrim = 'bg-cream-50/70',
  fit = 'cover',
  parallax = false,
}: {
  slotKey: string
  // children can be plain content, or a function that adapts to whether an
  // image is set (e.g. switch to light text only when a photo is present).
  children: React.ReactNode | ((hasImage: boolean) => React.ReactNode)
  className?: string
  scrim?: string  // pass '' to show the photo with no opaque overlay
  fit?: 'cover' | 'contain' | 'natural'
  parallax?: boolean
}) {
  const [web, setWeb] = useState<Img | null>(null)
  const [mobile, setMobile] = useState<Img | null>(null)

  useEffect(() => {
    let alive = true
    fetch(`/api/site-images?keys=${encodeURIComponent(slotKey)},${encodeURIComponent(slotKey + '.mobile')}`)
      .then(r => r.json())
      .then(d => { if (alive) { setWeb(d.images?.[slotKey] ?? null); setMobile(d.images?.[`${slotKey}.mobile`] ?? null) } })
      .catch(() => {})
    return () => { alive = false }
  }, [slotKey])

  const has = !!(web || mobile)
  const content = typeof children === 'function' ? children(has) : children

  // Natural: image(s) render in-flow at full height; text overlays centered.
  if (has && fit === 'natural') {
    return (
      <div className={`relative ${className}`}>
        {web && mobile ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mobile.public_url} alt={mobile.alt_text} className="block w-full h-auto sm:hidden" aria-hidden="true" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={web.public_url} alt={web.alt_text} className="hidden w-full h-auto sm:block" aria-hidden="true" />
          </>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={(web ?? mobile)!.public_url} alt={(web ?? mobile)!.alt_text} className="block w-full h-auto" aria-hidden="true" />
        )}
        {scrim && <div className={`absolute inset-0 ${scrim}`} aria-hidden="true" />}
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center">{content}</div>
      </div>
    )
  }

  const fitClass = fit === 'contain' ? 'object-contain' : 'object-cover'
  const layer = (() => {
    if (web && mobile) {
      return (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mobile.public_url} alt={mobile.alt_text} className={`absolute inset-0 w-full h-full ${fitClass} sm:hidden`} aria-hidden="true" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={web.public_url} alt={web.alt_text} className={`absolute inset-0 w-full h-full ${fitClass} hidden sm:block`} aria-hidden="true" />
        </>
      )
    }
    const one = web ?? mobile
    // eslint-disable-next-line @next/next/no-img-element
    return one ? <img src={one.public_url} alt={one.alt_text} className={`absolute inset-0 w-full h-full ${fitClass}`} aria-hidden="true" /> : null
  })()

  return (
    <div className={`relative ${className}`}>
      {has && (
        <>
          {parallax && fit === 'cover' ? <ParallaxLayer>{layer}</ParallaxLayer> : layer}
          {scrim && <div className={`absolute inset-0 ${scrim}`} aria-hidden="true" />}
        </>
      )}
      <div className="relative">{content}</div>
    </div>
  )
}
