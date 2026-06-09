'use client'

import { useState, useEffect } from 'react'
import { LavenderSprig } from '@/components/ui/LavenderSprig'

// The brand mark. Prefers the owner-uploaded seal (Site Images → "Global — Logo"),
// falls back to whatever is in the global OG image slot, and finally to the
// hand-drawn sprig so the header/footer always render something on-brand.
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
    fetch('/api/site-images?keys=global.logo,global.og_image')
      .then(r => r.json())
      .then(d => {
        if (!alive) return
        const url = d.images?.['global.logo']?.public_url || d.images?.['global.og_image']?.public_url
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
