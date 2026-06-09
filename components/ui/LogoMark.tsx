'use client'

import { useState, useEffect } from 'react'
import { LavenderSprig } from '@/components/ui/LavenderSprig'

// The brand mark. Uses ONLY the owner-uploaded seal (Site Images → "Global — Logo / Seal"),
// and otherwise falls back to the hand-drawn sprig. (We deliberately do NOT fall back to
// the OG / social-share image — that's a dark card and would show as a dark box.)
// className controls sizing (e.g. "h-9 w-auto"); style.color tints the sprig fallback.
export function LogoMark({
  className = '',
  style,
  alt = 'Petite Lavande',
}: {
  className?: string
  style?: React.CSSProperties
  alt?: string
}) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/site-images?keys=global.logo')
      .then(r => r.json())
      .then(d => {
        if (!alive) return
        const url = d.images?.['global.logo']?.public_url
        if (url) setSrc(url)
      })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  if (src) {
    return <img src={src} alt={alt} className={`${className} object-contain`} style={style} />
  }
  return <LavenderSprig className={className} style={style} title={alt} />
}
