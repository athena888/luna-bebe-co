'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Star } from 'lucide-react'
import { ReviewActions } from '@/app/portal/reviews/ReviewActions'

// Filterable review moderation list: status × product/box × star rating.
// Plus a manual-entry form for genuine customer feedback received off-site
// (email, DMs, notes) — entered verbatim under the real customer's name.

export interface ReviewItem {
  id: string
  productName: string
  customerName: string
  rating: number
  body: string
  approved: boolean
  createdAt: string
}

export interface ReviewProductOption { id: string; name: string }

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} size={14} className={n <= rating ? 'text-gold-400 fill-gold-400' : 'text-cream-300'} />
      ))}
    </div>
  )
}

// Click the date to change it (manual entries default to "today"; the date
// flows to JSON-LD + the Google review feed, so it should reflect when the
// feedback really arrived). Never a future date.
function EditableDate({ reviewId, createdAt }: { reviewId: string; createdAt: string }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)

  async function save(date: string) {
    if (!date) { setEditing(false); return }
    setBusy(true)
    try {
      const res = await fetch('/api/portal/reviews', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reviewId, date }),
      })
      if (res.ok) router.refresh()
    } finally { setBusy(false); setEditing(false) }
  }

  if (editing) {
    return (
      <input
        type="date" autoFocus disabled={busy}
        defaultValue={createdAt.slice(0, 10)}
        max={new Date().toISOString().slice(0, 10)}
        onChange={e => save(e.target.value)}
        onBlur={() => setEditing(false)}
        className="px-1.5 py-0.5 border border-cream-300 rounded font-sans text-xs text-bark-600 focus:outline-none focus:border-bark-400"
      />
    )
  }
  return (
    <button onClick={() => setEditing(true)} title="Click to edit the review date"
      className="font-sans text-xs text-bark-400 underline decoration-dotted underline-offset-2 hover:text-bark-600">
      {new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
    </button>
  )
}

const chip = (on: boolean) =>
  `font-sans text-[10px] tracking-[0.15em] uppercase px-3 py-1.5 rounded-lg border transition-colors ${
    on ? 'bg-[#7A8E7C] border-[#7A8E7C] text-white' : 'border-cream-300 text-bark-500 hover:border-bark-400'
  }`

function AddReviewForm({ products }: { products: ReviewProductOption[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [productId, setProductId] = useState('')
  const [name, setName] = useState('')
  const [rating, setRating] = useState(5)
  const [body, setBody] = useState('')
  const [date, setDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setError('')
    if (!productId || !name.trim() || !body.trim()) { setError('Product, name and text are required.'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/portal/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, customer_name: name, rating, body, date: date || undefined }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Failed to save'); return }
      setProductId(''); setName(''); setRating(5); setBody(''); setDate(''); setOpen(false)
      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setBusy(false)
    }
  }

  const field = 'px-3 py-2 border border-cream-300 rounded-lg bg-white font-sans text-sm text-bark-600 focus:outline-none focus:border-bark-400'

  return (
    <div className="mb-6">
      {!open ? (
        <button onClick={() => setOpen(true)} className={chip(false)}>+ Add a review</button>
      ) : (
        <div className="bg-cream-50 rounded-2xl border border-cream-200 p-5">
          <p className="font-sans text-xs text-bark-500 mb-4 leading-relaxed">
            For <span className="font-semibold">genuine customer feedback you received off-site</span> (email, Instagram,
            thank-you notes) — enter the customer&apos;s real name and their words as written. Published reviews feed the
            product page, Google structured data and the Google review feed; invented reviews violate FTC rules and
            Google policy and can suspend the Merchant Center account.
          </p>
          <div className="flex flex-wrap gap-3 mb-3">
            <select value={productId} onChange={e => setProductId(e.target.value)} className={field}>
              <option value="">Product or box…</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Customer name" className={field} />
            <select value={rating} onChange={e => setRating(Number(e.target.value))} className={field}>
              {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{'★'.repeat(n)}{'☆'.repeat(5 - n)}</option>)}
            </select>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} max={new Date().toISOString().slice(0, 10)}
              title="When the feedback was received (optional)" className={field} />
          </div>
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={3}
            placeholder="The customer's words, as written…" className={`${field} w-full mb-3`} />
          {error && <p className="font-sans text-xs text-red-600 mb-3">{error}</p>}
          <div className="flex gap-2">
            <button onClick={submit} disabled={busy} className={`${chip(true)} disabled:opacity-50`}>
              {busy ? 'Saving…' : 'Publish review'}
            </button>
            <button onClick={() => { setOpen(false); setError('') }} className={chip(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

export function ReviewsBrowser({ reviews, productOptions = [] }: { reviews: ReviewItem[]; productOptions?: ReviewProductOption[] }) {
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
      {productOptions.length > 0 && <AddReviewForm products={productOptions} />}
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
                    <EditableDate reviewId={r.id} createdAt={r.createdAt} />
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
