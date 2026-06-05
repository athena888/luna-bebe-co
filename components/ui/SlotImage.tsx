'use client'

import { useState, useEffect } from 'react'

// Renders an owner-managed image slot client-side (Build, Guide, etc.).
// Fetches from the public read endpoint; renders nothing until/unless set,
// so the page's default layout is unchanged when no image is uploaded.
export function SlotImage({ slotKey, className = '', imgClassName = 'w-full h-full object-cover' }: {
  slotKey: string
  className?: string
  imgClassName?: string
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

  if (!img) return null
  return (
    <div className={className}>
      <img src={img.public_url} alt={img.alt_text} className={imgClassName} />
    </div>
  )
}
