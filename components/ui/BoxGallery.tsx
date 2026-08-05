'use client'

import { useState } from 'react'
import Image from 'next/image'

// Phase 3 gallery — mobile: swipe carousel (scroll-snap) with dots + "1/6"
// counter; desktop: main image + vertical thumbnail rail. Receives the
// SELECTED variant's image set only (never all variants appended). Shows a
// quiet placeholder until photography exists.
export function BoxGallery({ images, alt }: { images: string[]; alt: string }) {
  const [idx, setIdx] = useState(0)

  if (images.length === 0) {
    return (
      <div className="relative h-[90vh] bg-cream-200 border border-cream-300">
        <div className="absolute inset-0 flex items-center justify-center font-sans text-xs tracking-[0.2em] uppercase text-bark-300">Photography coming soon</div>
      </div>
    )
  }

  return (
    <div>
      {/* Mobile: swipe */}
      <div className="lg:hidden">
        <div
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
          onScroll={e => {
            const el = e.currentTarget
            setIdx(Math.round(el.scrollLeft / el.clientWidth))
          }}
        >
          {images.map((src, i) => (
            <div key={i} className="relative shrink-0 w-full h-[90vh] snap-center bg-cream-200">
              <Image src={src} alt={`${alt} — ${i + 1}`} fill className="object-cover" unoptimized />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-2 px-1">
          <div className="flex gap-1.5">
            {images.map((_, i) => (
              <span key={i} className={`w-1.5 h-1.5 ${i === idx ? 'bg-espresso' : 'bg-cream-300'}`} />
            ))}
          </div>
          <span className="font-sans text-[11px] text-bark-400">{idx + 1}/{images.length}</span>
        </div>
      </div>

      {/* Desktop: main + thumb rail */}
      <div className="hidden lg:flex gap-3">
        <div className="flex flex-col gap-2 w-16">
          {images.map((src, i) => (
            <button key={i} type="button" onClick={() => setIdx(i)} className={`relative aspect-square border transition-colors ${i === idx ? 'border-espresso' : 'border-cream-300 hover:border-espresso-light'}`}>
              <Image src={src} alt="" fill className="object-cover" unoptimized />
            </button>
          ))}
        </div>
        <div className="relative flex-1 h-[90vh] bg-cream-200 overflow-hidden group">
          <Image src={images[Math.min(idx, images.length - 1)]} alt={alt} fill className="object-cover transition-transform duration-300 group-hover:scale-105" unoptimized />
        </div>
      </div>
    </div>
  )
}
