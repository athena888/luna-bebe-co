'use client'

import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { useIsEs } from '@/lib/use-is-es'

// The compact rating line that sits directly under a product title, so the
// social proof reaches a phone visitor in the first screenful instead of eight
// scrolls down. It reads the SAME endpoint ReviewSection renders from, so the
// average and the count can never disagree with the full section it links to;
// nothing is hardcoded, and a product with no approved reviews renders nothing.
export function ReviewSummary({ productId, className = '' }: { productId: string; className?: string }) {
  const isEs = useIsEs()
  const [summary, setSummary] = useState<{ count: number; avg: number } | null>(null)

  useEffect(() => {
    let live = true
    fetch(`/api/reviews?product_id=${encodeURIComponent(productId)}`)
      .then(r => r.json())
      .then((d: { reviews?: Array<{ rating: number }> }) => {
        if (!live) return
        const rs = (d.reviews ?? []).filter(r => typeof r.rating === 'number')
        setSummary(rs.length ? { count: rs.length, avg: rs.reduce((s, r) => s + r.rating, 0) / rs.length } : null)
      })
      .catch(() => { /* the rating line is never worth an error */ })
    return () => { live = false }
  }, [productId])

  if (!summary) return null
  const rounded = Math.round(summary.avg)
  const reviews = isEs
    ? `${summary.count} ${summary.count === 1 ? 'opinión' : 'opiniones'}`
    : `${summary.count} review${summary.count === 1 ? '' : 's'}`

  return (
    <a
      href="#reviews"
      className={`inline-flex items-center gap-2 group ${className}`}
      aria-label={isEs ? `${summary.avg.toFixed(1)} de 5 — leer ${reviews}` : `${summary.avg.toFixed(1)} out of 5 — read ${reviews}`}
    >
      {/* shrink-0 on the stars: at 360px the row shares its line with the
          count, and a flex parent would otherwise squeeze the icons oval. */}
      <span className="flex gap-0.5 shrink-0" aria-hidden="true">
        {[1, 2, 3, 4, 5].map(n => (
          <Star key={n} size={14} className={n <= rounded ? 'text-gold-400 fill-gold-400' : 'text-cream-300'} />
        ))}
      </span>
      <span className="font-sans text-[13px] text-bark-500 group-hover:text-bark-600 underline-offset-4 group-hover:underline transition-colors">
        {summary.avg.toFixed(1)} · {reviews}
      </span>
    </a>
  )
}
