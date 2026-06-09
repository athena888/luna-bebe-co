'use client'

import { useState, useEffect } from 'react'
import { ParallaxLayer } from './ParallaxLayer'

// Renders an owner-managed image as a soft background behind a section's
// content (page headers, footer). Fail-soft: when no image is set the section
// looks exactly as before. A translucent scrim keeps overlaid text readable.
//   fit="cover"   (default) — fill & crop to the section.
//   fit="contain" — show the whole image, letterboxed.
//   fit="natural" — show the whole image at full width/height; the section
//                   grows to the image and the text is centered over it.
//   parallax      — drift the image slower than the page on scroll (cover only,
//                   desktop only, reduced-motion-safe).
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
  const [img, setImg] = useState<{ public_url: string; alt_text: string } | null>(null)

  useEffect(() => {
    let alive = true
    fetch(`/api/site-images?keys=${encodeURIComponent(slotKey)}`)
      .then(r => r.json())
      .then(d => { if (alive) setImg(d.images?.[slotKey] ?? null) })
      .catch(() => {})
    return () => { alive = false }
  }, [slotKey])

  const content = typeof children === 'function' ? children(!!img) : children

  // Natural: image renders in-flow at full height; text overlays it centered.
  if (img && fit === 'natural') {
    return (
      <div className={`relative ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img.public_url} alt={img.alt_text} className="block w-full h-auto" aria-hidden="true" />
        {scrim && <div className={`absolute inset-0 ${scrim}`} aria-hidden="true" />}
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center">{content}</div>
      </div>
    )
  }

  const fitClass = fit === 'contain' ? 'object-contain' : 'object-cover'
  // eslint-disable-next-line @next/next/no-img-element
  const imgEl = img ? <img src={img.public_url} alt={img.alt_text} className={`absolute inset-0 w-full h-full ${fitClass}`} aria-hidden="true" /> : null

  return (
    <div className={`relative ${className}`}>
      {img && (
        <>
          {parallax && fit === 'cover' ? <ParallaxLayer>{imgEl}</ParallaxLayer> : imgEl}
          {scrim && <div className={`absolute inset-0 ${scrim}`} aria-hidden="true" />}
        </>
      )}
      <div className="relative">{content}</div>
    </div>
  )
}
