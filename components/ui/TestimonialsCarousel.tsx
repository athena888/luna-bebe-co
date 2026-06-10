'use client'

import { useState, useEffect, useCallback } from 'react'

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

export function TestimonialsCarousel({ extraReviews }: { extraReviews?: Review[] }) {
  const reviews = extraReviews ? [...ALL_REVIEWS, ...extraReviews] : ALL_REVIEWS
  const n = reviews.length
  const [idx, setIdx] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [dir, setDir] = useState<'left' | 'right'>('left')

  const advance = useCallback((direction: 'left' | 'right') => {
    if (animating) return
    setDir(direction)
    setAnimating(true)
    setTimeout(() => {
      setIdx(i => direction === 'left' ? (i + 1) % n : (i - 1 + n) % n)
      setAnimating(false)
    }, 350)
  }, [animating, n])

  useEffect(() => {
    const t = setInterval(() => advance('left'), 5000)
    return () => clearInterval(t)
  }, [advance])

  const r = reviews[idx]

  return (
    <div className="relative overflow-hidden">
      {/* Review */}
      <div
        key={idx}
        className="text-center"
        style={{
          animation: animating
            ? `${dir === 'left' ? 'slideOutLeft' : 'slideOutRight'} 350ms ease forwards`
            : `${dir === 'left' ? 'slideInRight' : 'slideInLeft'} 350ms ease forwards`,
        }}
      >
        <p className="font-sans text-[10px] tracking-[0.25em] text-gold-400 mb-6">★★★★★</p>
        <p
          className="text-xl sm:text-2xl text-bark-500 leading-relaxed italic mb-8 max-w-2xl mx-auto"
          style={{ fontFamily: 'var(--font-cormorant)' }}
        >
          &ldquo;{r.quote}&rdquo;
        </p>
        <p className="font-sans text-xs font-medium text-bark-600">{r.name}</p>
        <p className="font-sans text-xs text-bark-400 mt-0.5">{r.context}</p>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-2 mt-10">
        {reviews.map((_, i) => (
          <button
            key={i}
            onClick={() => { setDir(i > idx ? 'left' : 'right'); setIdx(i) }}
            className={`transition-all duration-300 ${i === idx ? 'w-4 h-1 bg-bark-400' : 'w-1 h-1 bg-bark-200 hover:bg-bark-300'}`}
          />
        ))}
      </div>

      <style>{`
        @keyframes slideInRight { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }
        @keyframes slideInLeft  { from { opacity:0; transform:translateX(-40px); } to { opacity:1; transform:translateX(0); } }
        @keyframes slideOutLeft { from { opacity:1; transform:translateX(0); } to { opacity:0; transform:translateX(-40px); } }
        @keyframes slideOutRight{ from { opacity:1; transform:translateX(0); } to { opacity:0; transform:translateX(40px); } }
      `}</style>
    </div>
  )
}
