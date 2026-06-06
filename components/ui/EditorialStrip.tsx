'use client'

import { useState } from 'react'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

export function EditorialStrip() {
  const [videoError, setVideoError] = useState(false)
  const [imgError, setImgError] = useState(false)
  const imgSrc = `${SUPABASE_URL}/storage/v1/object/public/home-images/kraft.jpg`
  const videoSrc = `${SUPABASE_URL}/storage/v1/object/public/home-videos/kraft.mp4`

  return (
    <section className="relative overflow-hidden bg-cream-100">
      {/* The image displays in full (its natural aspect) — never cropped.
          The section height follows the image. */}
      {!imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imgSrc}
          alt="Petite Lavande — handcrafted with care"
          className="w-full h-auto block"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-full aspect-[21/9]" />
      )}

      {/* Video layer — shows when present, fills the image box */}
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
          <p className="font-sans text-[9px] tracking-[0.5em] uppercase text-cream-200/90 mb-4" style={{ textShadow: '0 1px 10px rgba(0,0,0,0.4)' }}>Handcrafted With Love</p>
          <h2 className="font-serif text-4xl sm:text-5xl text-cream-50 leading-tight" style={{ textShadow: '0 1px 14px rgba(0,0,0,0.4)' }}>Every detail, intentional.</h2>
        </div>
      </div>
    </section>
  )
}
