'use client'

import { useEffect, useRef, useState } from 'react'

// Full-bleed editorial block: a large image flush to one screen edge with text
// on the other side. The image flies in from its edge as it scrolls into view
// (and back out when it leaves).
export function EditorialFeature({
  image, alt, side, children,
}: {
  image: string
  alt: string
  side: 'left' | 'right'
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setShown(e.isIntersecting), { threshold: 0.2 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const hidden = side === 'left' ? '-translate-x-24 opacity-0' : 'translate-x-24 opacity-0'

  return (
    <div ref={ref} className="grid grid-cols-1 md:grid-cols-2 items-stretch overflow-hidden">
      {/* Image — flush to its edge, sharp corners, large */}
      <div className={`relative aspect-[4/3] md:aspect-auto md:min-h-[80vh] bg-cream-200 ${side === 'right' ? 'md:order-2' : 'md:order-1'} transition-all duration-[800ms] ease-out ${shown ? 'translate-x-0 opacity-100' : hidden}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt={alt} className="absolute inset-0 w-full h-full object-cover" />
      </div>

      {/* Text */}
      <div className={`flex items-center px-6 sm:px-12 lg:px-20 py-14 ${side === 'right' ? 'md:order-1' : 'md:order-2'}`}>
        <div className="max-w-md">{children}</div>
      </div>
    </div>
  )
}
