'use client'

import { useState } from 'react'

// Photo gallery for a pre-built box: large active image + thumbnail strip.
export function BoxGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0)
  if (!images.length) {
    return (
      <div className="relative aspect-square bg-cream-200 rounded-xl overflow-hidden flex flex-col items-center justify-center gap-3 text-bark-300">
        <div className="w-10 h-px bg-gold-400" />
        <span className="font-script text-3xl text-bark-400">Petite Lavande</span>
        <div className="w-10 h-px bg-gold-400" />
      </div>
    )
  }
  const current = images[Math.min(active, images.length - 1)]
  return (
    <div>
      <div className="relative aspect-square bg-cream-200 rounded-xl overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current} alt={name} className="absolute inset-0 w-full h-full object-cover" />
      </div>
      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {images.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setActive(i)}
              className={`relative aspect-square rounded-lg overflow-hidden border transition-all ${i === active ? 'border-bark-600 ring-1 ring-bark-600' : 'border-cream-300 hover:border-bark-400'}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`${name} photo ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
