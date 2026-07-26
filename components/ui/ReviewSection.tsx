'use client'

import { useState, useEffect } from 'react'
import { Star } from 'lucide-react'

type Review = {
  id: string
  customer_name: string
  rating: number
  body: string
  created_at: string
}

function StarRating({ value, onChange }: { value: number; onChange?: (n: number) => void }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          onMouseEnter={() => onChange && setHovered(n)}
          onMouseLeave={() => onChange && setHovered(0)}
          className={onChange ? 'cursor-pointer' : 'cursor-default pointer-events-none'}
        >
          <Star
            size={16}
            className={`transition-colors ${n <= (hovered || value) ? 'text-gold-400 fill-gold-400' : 'text-cream-300'}`}
          />
        </button>
      ))}
    </div>
  )
}

export function ReviewSection({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [rating, setRating] = useState(5)
  const [name, setName] = useState('')
  const [body, setBody] = useState('')
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle')
  // Build 9 — optional photo + explicit rights consent (verbatim text stored server-side)
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoEmail, setPhotoEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [consentText, setConsentText] = useState('')

  useEffect(() => {
    fetch('/api/ugc').then(r => r.json()).then(d => setConsentText(d.consentText || '')).catch(() => {})
  }, [])

  useEffect(() => {
    fetch(`/api/reviews?product_id=${productId}`)
      .then(r => r.json())
      .then(d => setReviews(d.reviews || []))
      .finally(() => setLoading(false))
  }, [productId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitState('submitting')
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, customer_name: name, rating, body }),
      })
      const data = await res.json()
      if (data.success) {
        // Photo is best-effort: the review stands even if the upload fails.
        if (photo && photoEmail) {
          try {
            const sign = await fetch('/api/ugc', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ mode: 'sign', filename: photo.name }),
            }).then(r => r.json())
            if (sign.path && sign.token) {
              const supa = process.env.NEXT_PUBLIC_SUPABASE_URL
              await fetch(`${supa}/storage/v1/object/upload/sign/ugc/${sign.path}?token=${sign.token}`, {
                method: 'PUT', headers: { 'Content-Type': photo.type }, body: photo,
              })
              await fetch('/api/ugc', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  mode: 'record', email: photoEmail, storagePath: sign.path,
                  mediaType: photo.type.startsWith('video') ? 'video' : 'image',
                  consentMarketing: consent,
                }),
              })
            }
          } catch { /* review already saved */ }
        }
        setSubmitState('done')
        setShowForm(false)
      } else {
        setSubmitState('error')
      }
    } catch {
      setSubmitState('error')
    }
  }

  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0
  const inputClass = "w-full px-4 py-3 border border-cream-300 bg-cream-50 font-sans text-sm text-bark-600 placeholder:text-bark-400/40 focus:outline-none focus:border-bark-400 transition-colors"

  return (
    <div className="mt-12 pt-10 border-t border-cream-200">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="font-serif text-2xl text-espresso mb-1">Customer Reviews</h3>
          {reviews.length > 0 && (
            <div className="flex items-center gap-2">
              <StarRating value={Math.round(avgRating)} />
              <span className="font-sans text-xs text-bark-400">{avgRating.toFixed(1)} · {reviews.length} review{reviews.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="font-sans text-[11px] tracking-[0.2em] uppercase text-bark-400 hover:text-bark-600 border border-cream-300 px-4 py-2 transition-colors"
          >
            Write a Review
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-cream-100 border border-cream-300 p-6 mb-8 space-y-4">
          <p className="font-serif text-lg text-bark-600 mb-4">Share Your Experience</p>
          <div>
            <p className="font-sans text-[11px] tracking-[0.2em] uppercase text-bark-400 mb-2">Your Rating</p>
            <StarRating value={rating} onChange={setRating} />
          </div>
          <div>
            <label className="block font-sans text-[11px] tracking-[0.2em] uppercase text-bark-400 mb-2">Your Name</label>
            <input required type="text" value={name} onChange={e => setName(e.target.value)} placeholder="First name or initials" className={inputClass} />
          </div>
          <div>
            <label className="block font-sans text-[11px] tracking-[0.2em] uppercase text-bark-400 mb-2">Your Review</label>
            <textarea required rows={4} value={body} onChange={e => setBody(e.target.value)} placeholder="Tell others what you loved about this product..." className={`${inputClass} resize-none`} />
          </div>
          <div>
            <label className="block font-sans text-[11px] tracking-[0.2em] uppercase text-bark-400 mb-2">Add a Photo (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={e => {
                const f = e.target.files?.[0] ?? null
                if (f && f.size > 8 * 1024 * 1024) { alert('Please choose a photo under 8MB.'); e.target.value = ''; return }
                setPhoto(f)
              }}
              className="font-sans text-xs text-bark-500"
            />
            {photo && (
              <div className="mt-3 space-y-2.5">
                <input
                  required
                  type="email"
                  value={photoEmail}
                  onChange={e => setPhotoEmail(e.target.value)}
                  placeholder="Your email (so we can reach you about the photo)"
                  className={inputClass}
                />
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="accent-sage-500 w-4 h-4 mt-0.5" />
                  <span className="font-sans text-xs text-bark-500 leading-relaxed">{consentText || 'I give Petite Lavande permission to use this photo.'}</span>
                </label>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitState === 'submitting'}
              className="bg-bark-600 text-cream-50 font-sans text-[11px] tracking-[0.2em] uppercase px-6 py-3 hover:bg-bark-700 transition-colors disabled:opacity-40"
            >
              {submitState === 'submitting' ? 'Submitting...' : 'Submit Review'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="font-sans text-xs text-bark-400 hover:text-bark-600 px-4 py-3">Cancel</button>
          </div>
          {submitState === 'error' && <p className="font-sans text-xs text-red-500">Something went wrong. Please try again.</p>}
        </form>
      )}

      {submitState === 'done' && (
        <div className="bg-sage-50 border border-sage-200 px-5 py-4 mb-8">
          <p className="font-sans text-sm text-sage-700">Thank you! Your review has been submitted and will appear after approval.</p>
        </div>
      )}

      {loading ? (
        <p className="font-sans text-sm text-bark-400">Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <p className="font-sans text-sm text-bark-400">No reviews yet — be the first!</p>
      ) : (
        <div className="space-y-6">
          {reviews.map(r => (
            <div key={r.id} className="border-b border-cream-200 pb-6 last:border-0">
              <div className="flex items-center gap-3 mb-2">
                <StarRating value={r.rating} />
                <span className="font-sans text-xs font-medium text-bark-600">{r.customer_name}</span>
                <span className="font-sans text-[11px] text-bark-400">{new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
              </div>
              <p className="font-sans text-sm text-bark-500 leading-relaxed">{r.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
