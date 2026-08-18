'use client'

import Link from 'next/link'
import { useIsEs } from '@/lib/use-is-es'
import { useState, useEffect } from 'react'

// "The Collection" — full-bleed split: the "Create Something Unforgettable"
// olive panel on the left (copy from Portal → Homepage), a single still brand
// photo on the right (Emily 2026-08-15: no carousel). The photo comes from the
// home.collection image slot (+ optional home.collection.mobile for phones,
// both managed in Portal → Home Content) and is shown FULL — w-full h-auto,
// never object-cover — falling back to the committed /home-collection.jpg
// until a slot image is uploaded. Clicking the photo goes to the boxes page.

type Img = { public_url: string; alt_text?: string }

export function TheCollection({ title, body, items }: { title: string; body: string; items: string[] }) {
  const isEs = useIsEs()
  const [web, setWeb] = useState<Img | null>(null)
  const [mobile, setMobile] = useState<Img | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/site-images?keys=home.collection,home.collection.mobile')
      .then(r => r.json())
      .then(d => {
        if (!alive) return
        setWeb(d.images?.['home.collection'] ?? null)
        setMobile(d.images?.['home.collection.mobile'] ?? null)
      })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  const fallbackAlt = isEs
    ? 'Canastilla Petite Lavande con lazo, sobre boj'
    : 'Petite Lavande gift box tied with ribbon, resting on greenery'
  const webImg: Img = web ?? { public_url: '/home-collection.webp', alt_text: fallbackAlt }
  const mobileImg: Img = mobile ?? webImg

  return (
    <section className="pt-4 pb-14 sm:pt-6">
      <div className="px-6 mb-8 text-center">
        <p className="font-sans text-[13px] tracking-[0.18em] uppercase font-medium text-gold-500 mb-2">{isEs ? 'Cada canastilla, cada temporada' : 'Every box, every season'}</p>
        <h2 className="font-playfair text-[2rem] sm:text-[2.6rem] uppercase tracking-[0.01em] font-medium text-espresso leading-none">{isEs ? 'La Colección' : 'The Collection'}</h2>
      </div>

      <div className="relative">
        {/* Full-bleed split — olive panel left, photo right (stacked
            description-first with a little padding on phones). No card
            border. The row's height follows whichever side is taller. */}
        <div className="relative sm:flex sm:items-stretch p-3 sm:p-0">
          {/* Left — the "Create Something Unforgettable" panel (static copy,
              editable in Portal → Homepage), frame inset like the homepage one */}
          <div className="relative bg-[#8A9B63] px-10 sm:px-16 lg:px-20 py-16 sm:py-12 sm:w-1/2 sm:shrink-0 flex flex-col items-center justify-center text-center">
            {/* Double-line frame — heavier outer rule, thin inner rule */}
            <div className="pointer-events-none absolute inset-4 sm:inset-6 border-2 border-white">
              <div className="absolute inset-[6px] border border-white" />
            </div>
            <div className="relative max-w-md w-full">
              <h3 className="font-pinyon text-[clamp(1.5rem,6.2vw,2rem)] sm:text-[clamp(1.5rem,2.9vw,2.5rem)] text-white leading-tight whitespace-nowrap mb-7">
                {title}
              </h3>
              <p className="font-playfair text-[15px] sm:text-[16px] text-white/95 leading-relaxed mb-8">
                {body}
              </p>
              <div className="space-y-2.5 mb-9">
                {items.filter(it => it.trim()).map((item, i) => (
                  <p key={i} className="font-playfair text-[14px] sm:text-[15px] text-white leading-relaxed">- {item}</p>
                ))}
              </div>
              <Link
                href={isEs ? '/es/canastillas' : '/boxes'}
                className="inline-block font-sans text-[12px] tracking-[0.18em] uppercase text-white border-b border-white pb-1 hover:text-cream-100 hover:border-cream-100 transition-colors"
              >
                {isEs ? 'Comprar ahora' : 'Shop Now'}
              </Link>
            </div>
          </div>

          {/* Right — still photo shown FULL (never cropped); the whole image
              links to the boxes page. Phones use the mobile upload when one
              exists. Cream backing shows if the image is shorter than the
              panel on desktop. */}
          <div className="relative bg-cream-100 sm:flex-1 sm:flex sm:items-center sm:justify-center sm:overflow-hidden">
            <Link href={isEs ? '/es/canastillas' : '/boxes'} aria-label={isEs ? 'Ver canastillas' : 'Shop gift boxes'} className="block w-full">
              {/* One <picture> so a phone fetches the phone crop only — two
                  CSS-hidden <img>s download both. */}
              <picture>
                <source media="(max-width: 639px)" srcSet={mobileImg.public_url} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={webImg.public_url} alt={webImg.alt_text || fallbackAlt} className="w-full h-auto" loading="lazy" decoding="async" />
              </picture>
            </Link>
          </div>
        </div>
      </div>

    </section>
  )
}
