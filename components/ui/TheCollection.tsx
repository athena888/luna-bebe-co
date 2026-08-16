'use client'

import Link from 'next/link'
import { useIsEs } from '@/lib/use-is-es'
import Image from 'next/image'

// "The Collection" — full-bleed split: the "Create Something Unforgettable"
// olive panel on the left (copy from Portal → Homepage), a single still brand
// photo on the right (Emily 2026-08-15: no carousel — the closed ribboned box
// on greenery, clicking through to /boxes).

export function TheCollection({ title, body, items }: { title: string; body: string; items: string[] }) {
  const isEs = useIsEs()

  return (
    <section className="pt-4 pb-14 sm:pt-6">
      <div className="px-6 mb-8 text-center">
        <p className="font-sans text-[13px] tracking-[0.18em] uppercase font-medium text-gold-500 mb-2">{isEs ? 'Cada canastilla, cada temporada' : 'Every box, every season'}</p>
        <h2 className="font-playfair text-[2rem] sm:text-[2.6rem] uppercase tracking-[0.01em] font-medium text-espresso leading-none">{isEs ? 'La Colección' : 'The Collection'}</h2>
      </div>

      <div className="relative">
        {/* Full-bleed split — olive panel left, photo right (stacked
            description-first with a little padding on phones), ~85vh like the
            Unforgettable section. No card border. */}
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
                className="inline-block font-sans text-[12px] tracking-[0.3em] uppercase text-white border-b border-white pb-1 hover:text-cream-100 hover:border-cream-100 transition-colors"
              >
                {isEs ? 'Comprar ahora' : 'Shop Now'}
              </Link>
            </div>
          </div>

          {/* Right — still brand photo, whole image links to the boxes page */}
          <div className="relative overflow-hidden bg-cream-100 h-[52vh] sm:h-auto sm:min-h-[85vh] sm:flex-1">
            <Image
              src="/home-collection.jpg"
              alt={isEs ? 'Canastilla Petite Lavande con lazo, sobre boj' : 'Petite Lavande gift box tied with ribbon, resting on greenery'}
              fill
              className="object-cover"
              sizes="(max-width:640px) 100vw, 1024px"
            />
            <Link href={isEs ? '/es/canastillas' : '/boxes'} className="absolute inset-0 z-10" aria-label={isEs ? 'Ver canastillas' : 'Shop gift boxes'} />
          </div>
        </div>
      </div>

    </section>
  )
}
