'use client'

import { useMemo, useState } from 'react'
import { Star } from 'lucide-react'
import { ReviewActions } from '@/app/portal/reviews/ReviewActions'

// Filterable review moderation list: status × product/box × star rating.

export interface ReviewItem {
  id: string
  productName: string
  customerName: string
  rating: number
  body: string
  approved: boolean
  createdAt: string
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} size={14} className={n <= rating ? 'text-gold-400 fill-gold-400' : 'text-cream-300'} />
      ))}
    </div>
  )
}

const chip = (on: boolean) =>
  `font-sans text-[10px] tracking-[0.15em] uppercase px-3 py-1.5 rounded-lg border transition-colors ${
    on ? 'bg-[#7A8E7C] border-[#7A8E7C] text-white' : 'border-cream-300 text-bark-500 hover:border-bark-400'
  }`

export function ReviewsBrowser({ reviews }: { reviews: ReviewItem[] }) {
  const [status, setStatus] = useState<'all' | 'pending' | 'published'>('all')
  const [product, setProduct] = useState('all')
  const [rating, setRating] = useState(0)

  const productNames = useMemo(() => [...new Set(reviews.map(r => r.productName))].sort(), [reviews])
  const shown = reviews.filter(r =>
    (status === 'all' || (status === 'pending' ? !r.approved : r.approved)) &&
    (product === 'all' || r.productName === product) &&
    (rating === 0 || r.rating === rating)
  )

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {(['all', 'pending', 'published'] as const).map(s => (
          <button key={s} onClick={() => setStatus(s)} className={chip(status === s)}>
            {s === 'all' ? 'All' : s === 'pending' ? 'Awaiting moderation' : 'Published'}
          </button>
        ))}
        <select value={product} onChange={e => setProduct(e.target.value)}
          className="ml-2 px-3 py-1.5 border border-cream-300 rounded-lg bg-white font-sans text-xs text-bark-600 focus:outline-none focus:border-bark-400">
          <option value="all">All products & boxes</option>
          {productNames.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <select value={rating} onChange={e => setRating(Number(e.target.value))}
          className="px-3 py-1.5 border border-cream-300 rounded-lg bg-white font-sans text-xs text-bark-600 focus:outline-none focus:border-bark-400">
          <option value={0}>All ratings</option>
          {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{'★'.repeat(n)}{'☆'.repeat(5 - n)}</option>)}
        </select>
        <span className="font-sans text-xs text-bark-400 ml-auto">{shown.length} of {reviews.length}</span>
      </div>

      {shown.length === 0 ? (
        <div className="bg-cream-50 rounded-2xl border border-cream-200 p-8 text-center">
          <p className="font-sans text-sm text-bark-400">No reviews match these filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {shown.map(r => (
            <div key={r.id} className="bg-cream-50 rounded-2xl border border-cream-200 p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <Stars rating={r.rating} />
                    <span className="font-sans text-xs font-semibold text-bark-600">{r.customerName}</span>
                    <span className="font-sans text-xs text-bark-400">{r.productName}</span>
                    <span className="font-sans text-xs text-bark-400">{new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    {!r.approved && <span className="font-sans text-[9px] tracking-[0.1em] uppercase bg-gold-400/20 text-gold-500 px-1.5 py-0.5 rounded">Pending</span>}
                  </div>
                  <p className="font-sans text-sm text-bark-500 leading-relaxed">{r.body}</p>
                </div>
                <ReviewActions reviewId={r.id} approved={r.approved} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
