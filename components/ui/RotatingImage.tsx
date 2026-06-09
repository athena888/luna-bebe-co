'use client'

import { useEffect, useState } from 'react'

// Cross-fades through a set of images every few seconds. Renders absolutely-
// positioned layers so it works as a section background. With one image it is
// static; respects prefers-reduced-motion (then it just shows the first).
export function RotatingImage({ urls, alt = '', className = '', intervalMs = 5000 }: {
  urls: string[]
  alt?: string
  className?: string
  intervalMs?: number
}) {
  const list = urls.filter(Boolean)
  const [i, setI] = useState(0)

  useEffect(() => {
    if (list.length <= 1) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setI(p => (p + 1) % list.length), intervalMs)
    return () => clearInterval(t)
  }, [list.length, intervalMs])

  if (list.length === 0) return null

  return (
    <div className={`absolute inset-0 ${className}`}>
      {list.map((u, idx) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${u}-${idx}`}
          src={u}
          alt={idx === 0 ? alt : ''}
          aria-hidden={idx !== 0}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${idx === i % list.length ? 'opacity-100' : 'opacity-0'}`}
        />
      ))}
    </div>
  )
}
