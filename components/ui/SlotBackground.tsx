'use client'

import { useState, useEffect } from 'react'

// Renders an owner-managed image as a soft background behind a section's
// content (page headers, footer). Fail-soft: when no image is set the section
// looks exactly as before. A translucent scrim keeps overlaid text readable.
export function SlotBackground({
  slotKey,
  children,
  className = '',
  scrim = 'bg-cream-50/70',
}: {
  slotKey: string
  // children can be plain content, or a function that adapts to whether an
  // image is set (e.g. switch to light text only when a photo is present).
  children: React.ReactNode | ((hasImage: boolean) => React.ReactNode)
  className?: string
  scrim?: string  // pass '' to show the photo with no opaque overlay
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

  return (
    <div className={`relative ${className}`}>
      {img && (
        <>
          <img src={img.public_url} alt={img.alt_text} className="absolute inset-0 w-full h-full object-cover" aria-hidden="true" />
          {scrim && <div className={`absolute inset-0 ${scrim}`} aria-hidden="true" />}
        </>
      )}
      <div className="relative">{content}</div>
    </div>
  )
}
