'use client'

import { useState } from 'react'
import Image from 'next/image'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

export function EditorialStrip() {
  const [videoError, setVideoError] = useState(false)
  const imgSrc = `${SUPABASE_URL}/storage/v1/object/public/home-images/kraft.jpg`
  const videoSrc = `${SUPABASE_URL}/storage/v1/object/public/home-videos/kraft.mp4`

  return (
    <section className="relative h-[55vh] overflow-hidden">
      {/* Always-visible image fallback behind video */}
      <Image
        src={imgSrc}
        alt="Petite Lavande — handcrafted with care"
        fill
        className="object-cover object-center"
        unoptimized
      />

      {/* Video layer — shows when loaded, hides on error */}
      {!videoError && (
        <video
          autoPlay
          muted
          loop
          playsInline
          onError={() => setVideoError(true)}
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      )}

      <div className="absolute inset-0 bg-bark-800/40 flex items-center justify-center">
        <div className="text-center px-6">
          <p className="font-sans text-[9px] tracking-[0.5em] uppercase text-cream-200/80 mb-4">Handcrafted With Love</p>
          <h2 className="font-serif text-4xl sm:text-5xl text-cream-50 leading-tight">Every detail, intentional.</h2>
        </div>
      </div>
    </section>
  )
}
