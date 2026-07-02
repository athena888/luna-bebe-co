'use client'

import { useEffect, useRef, useState } from 'react'
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
      {/* Image — 70vh so it fits one screen; flies in from its edge */}
      <div className={`relative aspect-[4/3] md:aspect-auto md:h-[70vh] bg-cream-200 ${side === 'right' ? 'md:order-2' : 'md:order-1'} transition-all duration-[800ms] ease-out ${shown ? 'translate-x-0 opacity-100' : imgHidden}`}>
        <RotatingImage urls={images} alt="Create something unforgettable" />
      </div>

      {/* Copy + steps */}
      <div className={`flex items-center px-6 sm:px-12 lg:px-20 py-14 ${side === 'right' ? 'md:order-1' : 'md:order-2'}`}>
        <div className="max-w-md">
          <p className="font-sans text-[9px] tracking-[0.45em] uppercase text-gold-400 mb-4">Begin</p>
          <h2 className="font-serif text-[2rem] sm:text-[2.75rem] text-espresso leading-[1.05]">Create Something</h2>
          <p className="font-script text-3xl sm:text-4xl text-gold-400 mb-9">unforgettable.</p>

          <div className="space-y-7">
            {STEPS.map((s, i) => (
              <div
                key={s.title}
                className={`flex items-start gap-4 transition-all duration-500 ease-out ${(shown || reduce) ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}
                style={{ transitionDelay: reduce ? '0ms' : `${150 + i * 180}ms` }}
              >
                <span className="shrink-0 w-9 h-9 rounded-full pl-round-full border border-gold-300 flex items-center justify-center mt-0.5">
                  <s.Icon size={15} strokeWidth={1.5} className="text-gold-500" />
                </span>
                <div className="pt-0.5">
                  <h3 className="font-sans text-[11px] tracking-[0.18em] uppercase text-espresso mb-1.5">{s.title}</h3>
                  <p className="font-sans text-[13px] text-bark-400 leading-relaxed">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
