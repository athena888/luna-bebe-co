'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { RotatingImage } from './RotatingImage'

// The first "What makes it special" beat: an editorial image beside a framed
// sage panel — script heading, intro line, and the box's contents listed,
// dropping in one-by-one when the block scrolls into view.
const ITEMS = [
  'Wellness care for mama',
  'Organic cotton, no pesticides',
  'Botanical lavender bouquet',
  'Customized card',
  'Wax seal & linen ribbon',
]

export function StepsFeature({ images, side = 'left' }: { images: string[]; side?: 'left' | 'right' }) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)
  const [reduce, setReduce] = useState(false)

  useEffect(() => {
    setReduce(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setShown(true) }, { threshold: 0.25 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const imgHidden = side === 'left' ? '-translate-x-24 opacity-0' : 'translate-x-24 opacity-0'

  return (
    <div ref={ref} className="grid grid-cols-1 md:grid-cols-2 items-stretch overflow-hidden">
      {/* Image — 85vh; flies in from its edge. Its height sets the row height,
          so the sage panel never extends past the photo. */}
      <div className={`relative aspect-[4/3] md:aspect-auto md:h-auto md:min-h-[85vh] md:self-stretch bg-cream-200 ${side === 'right' ? 'md:order-2' : 'md:order-1'} transition-all duration-[800ms] ease-out ${shown ? 'translate-x-0 opacity-100' : imgHidden}`}>
        <RotatingImage urls={images} alt="Create something unforgettable" />
      </div>

      {/* Solid sage panel — white copy inside a double-rule frame, same height
          as the image. Content is vertically centred with breathing room. */}
      <div className={`relative bg-sage-400 flex flex-col items-center justify-center px-10 sm:px-16 lg:px-20 py-16 md:py-12 ${side === 'right' ? 'md:order-1' : 'md:order-2'}`}>
        {/* Double-line frame */}
        <div className="pointer-events-none absolute inset-4 sm:inset-6 border border-white/90">
          <div className="absolute inset-[5px] border border-white/60" />
        </div>

        <div className="relative max-w-md w-full text-center">
          <h2 className="font-script text-[2rem] sm:text-[2.6rem] xl:text-[2.9rem] text-white leading-tight whitespace-nowrap mb-7 md:mb-8">
            Create Something Unforgettable
          </h2>

          <p className="font-serif text-[16px] sm:text-[17px] text-white/90 leading-relaxed mb-8 md:mb-9">
            A botanical lavender bouquet and wellness rituals to soften the long days,
            each chosen the way a daughter would choose for her own mother.
          </p>

          {/* Contents — centred lines, dropping in one-by-one */}
          <div className="space-y-2.5">
            {ITEMS.map((item, i) => (
              <p
                key={item}
                className={`font-serif text-[15px] sm:text-[16px] text-white leading-relaxed transition-all duration-500 ease-out ${(shown || reduce) ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}
                style={{ transitionDelay: reduce ? '0ms' : `${150 + i * 140}ms` }}
              >
                {item}
              </p>
            ))}
          </div>

          <div className="mt-9 md:mt-10">
            <Link
              href="/boxes"
              className="inline-block font-sans text-[12px] tracking-[0.3em] uppercase text-white border-b border-white pb-1 hover:text-cream-100 hover:border-cream-100 transition-colors"
            >
              Shop Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
