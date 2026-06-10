'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type Review = { quote: string; name: string; context: string }

const ALL_REVIEWS: Review[] = [
  { quote: "I've never seen a gift box this beautiful. My best friend cried when she opened it. The personal card was the most special part.", name: 'Camille R.', context: 'Gifted to her sister' },
  { quote: 'Ordered rush shipping and it arrived the next day. Gorgeous box, everything so soft and organic. Worth every penny.', name: 'Maya T.', context: 'Baby shower gift' },
  { quote: 'Everyone at the shower was asking where the box was from. Building it myself meant I picked perfectly for someone I barely know.', name: 'Priya N.', context: 'Office baby shower' },
  { quote: 'The new mother literally cried when she opened it. Every single item was exquisite — nothing felt like an afterthought.', name: 'Sarah M.', context: 'Baby shower gift' },
  { quote: 'It became the most-talked-about gift at the baby shower. Worth every penny.', name: 'James & Clara', context: 'First-time parents' },
  { quote: 'The attention to detail is unreal. The wax seal, the tissue paper, the personalized card — it felt like unwrapping something from a Parisian boutique.', name: 'Margot T.', context: 'Gifted to a colleague' },
  { quote: "My sister still uses the bamboo swaddle two years later. That's how I know the quality is real.", name: 'Lily R.', context: 'Returning customer' },
]

function ReviewCard({ r, delay = 0 }: { r: Review; delay?: number }) {
  return (
    <div
      className="flex flex-col px-6 py-8 border border-cream-300 bg-white/80 text-center"
      style={{ animation: `plFade 0.45s ease ${delay}ms both` }}
    >
      <p className="font-sans text-[10px] tracking-[0.25em] text-gold-400 mb-4">★★★★★</p>
      <p
        className="flex-1 text-lg text-bark-500 leading-relaxed italic mb-6"
        style={{ fontFamily: 'var(--font-cormorant)' }}
      >
        &ldquo;{r.quote}&rdquo;
      </p>
      <div>
        <p className="font-sans text-xs font-medium text-bark-600">{r.name}</p>
        <p className="font-sans text-[10px] text-bark-400 mt-0.5">{r.context}</p>
      </div>
    </div>
  )
}

export function TestimonialsCarousel() {
  const n = ALL_REVIEWS.length
  const [idx, setIdx] = useState(0)
  const [animKey, setAnimKey] = useState(0)
  const touchStartX = useRef<number | null>(null)

  const go = useCallback((next: number) => {
    setIdx(((next % n) + n) % n)
    setAnimKey(k => k + 1)
  }, [n])

  const advance = useCallback(() => go(idx + 1), [go, idx])

  useEffect(() => {
    const t = setInterval(advance, 5000)
    return () => clearInterval(t)
  }, [advance])

  // 3 visible on desktop, 1 on mobile (handled in JSX)
  const visible = [0, 1, 2].map(i => ALL_REVIEWS[(idx + i) % n])

  return (
    <div
      onTouchStart={e => { touchStartX.current = e.touches[0].clientX }}
      onTouchEnd={e => {
        if (touchStartX.current === null) return
        const delta = touchStartX.current - e.changedTouches[0].clientX
        if (delta > 50) go(idx + 1)
        else if (delta < -50) go(idx - 1)
        touchStartX.current = null
      }}
    >
      {/* Cards — 1 on mobile, 3 on sm+ */}
      <div key={animKey} className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        {visible.map((r, i) => (
          <ReviewCard key={`${animKey}-${i}`} r={r} delay={i * 70} />
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => go(idx - 1)}
          className="w-8 h-8 flex items-center justify-center border border-cream-300 text-bark-400 hover:border-bark-400 hover:text-bark-600 transition-colors"
          aria-label="Previous"
        >
          <ChevronLeft size={14} />
        </button>

        <div className="flex gap-2">
          {ALL_REVIEWS.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              aria-label={`Review ${i + 1}`}
              className={`transition-all duration-300 ${i === idx ? 'w-4 h-1 bg-bark-400' : 'w-1 h-1 bg-bark-200 hover:bg-bark-300'}`}
            />
          ))}
        </div>

        <button
          onClick={() => go(idx + 1)}
          className="w-8 h-8 flex items-center justify-center border border-cream-300 text-bark-400 hover:border-bark-400 hover:text-bark-600 transition-colors"
          aria-label="Next"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
