'use client'

import { useEffect, useRef, useState } from 'react'
import { RotatingImage } from './RotatingImage'

// Full-bleed editorial block: a large image flush to one screen edge with text
// on the other side. The image flies in from its edge as it scrolls into view
// (and back out when it leaves). Accepts one or more images, which cross-fade.
export function EditorialFeature({
  images, alt, side, children,
}: {
  images: string[]
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
      <div className={`relative aspect-[4/3] md:aspect-auto md:h-auto md:min-h-[70vh] md:self-stretch bg-cream-200 ${side === 'right' ? 'md:order-2' : 'md:order-1'} transition-all duration-[800ms] ease-out ${shown ? 'translate-x-0 opacity-100' : hidden}`}>
        <RotatingImage urls={images} alt={alt} />
      </div>

      {/* Text — vertically centred beside the image; column heights always match */}
      <div className={`flex items-center px-6 sm:px-12 lg:px-20 py-10 sm:py-12 ${side === 'right' ? 'md:order-1' : 'md:order-2'}`}>
        <div className="max-w-md">{children}</div>
      </div>
    </div>
  )
}
