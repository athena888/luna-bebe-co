'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Package, PenLine, Truck } from 'lucide-react'
import { RotatingImage } from './RotatingImage'

// The first "What makes it special" beat: an editorial image beside the
// "Create Something Unforgettable" three-step how-it-works, whose steps drop in
// one-by-one when the block scrolls into view.
const STEPS = [
  { Icon: Package, title: 'Build Your Box', body: 'Choose from curated organic items across thoughtful categories — or start from a ready-made set.' },
  { Icon: PenLine, title: 'Customize Your Card', body: 'Pick a card design and your message — we print it on premium card stock.' },
  { Icon: Truck, title: 'We Ship With Care', body: 'A beautiful natural sea grass box, kraft outside.' },
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

      {/* Solid sage panel — white copy, same height as the image. Content is
          vertically centred with breathing room and sized to always fit. */}
      <div className={`bg-sage-400 flex flex-col items-center justify-center px-8 sm:px-12 lg:px-16 py-14 md:py-10 ${side === 'right' ? 'md:order-1' : 'md:order-2'}`}>
        <div className="max-w-md w-full">
          <h2 className="font-serif text-[1.35rem] sm:text-[1.9rem] xl:text-[2.05rem] text-white leading-tight text-center whitespace-nowrap mb-10 md:mb-12">
            Create Something Unforgettable
          </h2>

          {/* Steps — inline rows: icon left, left-aligned text */}
          <div className="space-y-6 md:space-y-7">
            {STEPS.map((s, i) => (
              <div
                key={s.title}
                className={`flex items-start gap-4 text-left transition-all duration-500 ease-out ${(shown || reduce) ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}
                style={{ transitionDelay: reduce ? '0ms' : `${150 + i * 180}ms` }}
              >
                <span className="shrink-0 w-10 h-10 rounded-full pl-round-full border border-white/50 flex items-center justify-center mt-0.5">
                  <s.Icon size={15} strokeWidth={1.5} className="text-white" />
                </span>
                <div>
                  <h3 className="font-sans text-[11px] tracking-[0.22em] uppercase text-white mb-1">{s.title}</h3>
                  <p className="font-serif text-[15px] text-white/85 leading-relaxed">{s.body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 justify-center mt-10 md:mt-12">
            <Link href="/build" className="bg-white text-sage-500 font-sans text-[10px] tracking-[0.25em] uppercase px-8 py-3.5 hover:bg-cream-100 transition-colors">Build Your Own Box</Link>
            <Link href="/boxes" className="border border-white/60 text-white font-sans text-[10px] tracking-[0.25em] uppercase px-8 py-3.5 hover:bg-white/10 transition-colors">Shop Ready-Made</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
