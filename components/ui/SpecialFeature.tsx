'use client'

import Link from 'next/link'
import { SlotBackground } from './SlotBackground'

interface Perk { label: string; sub: string }

// "What makes it special" — full-bleed editorial photo (owner-managed
// home.special_bg slot) with the heading overlaid on the lower third,
// High-Summer-Edit style: italic first word + big didone caps, subline and a
// SHOP NOW link. Beneath it the promise perks drift right-to-left on a loop.
export function SpecialFeature({ title, intro, perks }: { title: string; intro: string; perks: Perk[] }) {
  const [first, ...rest] = title.split(' ')

  return (
    <section>
      <SlotBackground
        slotKey="home.special_bg"
        scrim="bg-gradient-to-t from-black/55 via-black/10 to-transparent"
        className="bg-cream-100"
      >
        {(hasImage: boolean) => (
          <div className={`min-h-[62vh] md:min-h-[78vh] flex flex-col items-center justify-end text-center px-6 pb-10 sm:pb-14 ${hasImage ? 'text-white' : 'text-espresso'}`}>
            <h2 className="leading-none mb-4">
              <span className="font-serif italic normal-case text-[2rem] sm:text-[3rem] mr-2 sm:mr-3">{first}</span>
              <span className="font-playfair uppercase tracking-[0.01em] font-medium text-[2.4rem] sm:text-[3.6rem]">{rest.join(' ')}</span>
            </h2>
            <p className={`font-playfair text-[15px] sm:text-[17px] leading-relaxed max-w-2xl mb-6 ${hasImage ? 'text-white/95' : 'text-espresso-light'}`}>
              {intro}
            </p>
            <div className="flex items-center justify-center gap-8 flex-wrap">
              {/* Primary → curated gift boxes; custom build is the ghost secondary */}
              <Link
                href="/boxes"
                className={`inline-block font-sans text-[12px] tracking-[0.3em] uppercase border-b pb-1 transition-colors ${hasImage ? 'text-white border-white hover:text-cream-100 hover:border-cream-100' : 'text-espresso border-espresso hover:text-gold-500 hover:border-gold-500'}`}
              >
                Shop Now
              </Link>
              <Link
                href="/build"
                className={`inline-block font-sans text-[11px] tracking-[0.25em] uppercase pb-1 border-b border-transparent transition-colors ${hasImage ? 'text-white/70 hover:text-white hover:border-white/60' : 'text-espresso-light hover:text-espresso hover:border-espresso/50'}`}
              >
                Build Your Own
              </Link>
            </div>
          </div>
        )}
      </SlotBackground>

      {/* The promise perks — one continuous line, looping right-to-left */}
      <div className="bg-cream-white border-y border-cream-300 py-4 overflow-hidden" aria-label="Our promises">
        <div className="flex w-max animate-[pl-marquee_32s_linear_infinite]">
          {[0, 1].map(copy => (
            <div key={copy} className="flex shrink-0 items-baseline" aria-hidden={copy === 1}>
              {perks.map(({ label, sub }) => (
                <span key={`${copy}-${label}`} className="flex items-baseline whitespace-nowrap px-8 sm:px-12">
                  <span className="font-sans text-[11px] tracking-[0.25em] uppercase font-semibold text-espresso">{label}</span>
                  <span className="font-cormorant text-[15px] text-espresso-light ml-3">{sub}</span>
                  <span className="w-1 h-1 rounded-full pl-round-full bg-gold-400 ml-8 sm:ml-12 self-center" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
