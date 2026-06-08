'use client'

import { useState } from 'react'

// Photo gallery for a pre-built box: large active image + thumbnail strip.
export function BoxGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0)
  if (!images.length) {
    return (
      <div className="relative aspect-square bg-cream-200 overflow-hidden flex flex-col items-center justify-center gap-3 text-bark-300">
        <div className="w-10 h-px bg-gold-400" />
        <span className="font-script text-3xl text-bark-400">Petite Lavande</span>
        <div className="w-10 h-px bg-gold-400" />
      </div>
    )
  }
  const current = images[Math.min(active, images.length - 1)]
  return (
    <div className="flex gap-3">
      {/* Thumbnail rail — left */}
      {images.length > 1 && (
        <div className="flex flex-col gap-2 w-16 sm:w-20 shrink-0 max-h-[640px] overflow-y-auto scrollbar-hide">
          {images.map((url, i) => (
            <button
              key={url}
              type="button"
              onMouseEnter={() => setActive(i)}
              onClick={() => setActive(i)}
              className={`relative aspect-square overflow-hidden border transition-all ${i === active ? 'border-bark-600 ring-1 ring-bark-600' : 'border-cream-300 hover:border-bark-400'}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`${name} photo ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
      {/* Main image */}
      <div className="relative flex-1 aspect-square bg-cream-200 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current} alt={name} className="absolute inset-0 w-full h-full object-cover" />
      </div>
    </div>
  )
}
