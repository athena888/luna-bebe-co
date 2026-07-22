import { supabaseAdmin } from '@/lib/supabase'
import { Star } from 'lucide-react'
import { ReviewActions } from './ReviewActions'

export const dynamic = 'force-dynamic'

type ReviewRow = {
  id: string
  product_id: string
  customer_name: string
  rating: number
  body: string
  approved: boolean
  created_at: string
  products: { name: string } | null
}

function formatDate(iso: string) { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} size={14} className={n <= rating ? 'text-gold-400 fill-gold-400' : 'text-cream-300'} />
      ))}
    </div>
  )
}

function ReviewCard({ review }: { review: ReviewRow }) {
  return (
    <div className="bg-cream-50 rounded-2xl border border-cream-200 p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <Stars rating={review.rating} />
            <span className="font-sans text-xs font-semibold text-bark-600">{review.customer_name}</span>
            <span className="font-sans text-xs text-bark-400">{review.products?.name ?? review.product_id}</span>
            <span className="font-sans text-xs text-bark-400">{formatDate(review.created_at)}</span>
          </div>
          <p className="font-sans text-sm text-bark-500 leading-relaxed">{review.body}</p>
        </div>
        <ReviewActions reviewId={review.id} approved={review.approved} />
      </div>
    </div>
  )
}

export default async function ReviewsPage() {
  // No FK join — the live reviews table may predate §30's foreign key, so we
  // map product names in code instead of relying on a PostgREST relationship.
  const [{ data, error }, { data: products }] = await Promise.all([
    supabaseAdmin
      .from('reviews')
      .select('id, product_id, customer_name, rating, body, approved, created_at')
      .order('created_at', { ascending: false }),
    supabaseAdmin.from('products').select('id, name'),
  ])
  const nameById = new Map((products ?? []).map(p => [p.id as string, p.name as string]))

  if (error) {
    return (
      <div className="p-8">
        <h1 className="font-serif text-3xl text-bark-600 mb-4">Reviews</h1>
        <div className="bg-cream-50 rounded-2xl border border-cream-200 p-8">
          <p className="font-sans text-sm text-bark-500">
            The <span className="font-mono">reviews</span> table doesn&apos;t exist yet. Run section 30 of{' '}
            <span className="font-mono">supabase/migrations/_RUN_ALL_PENDING.sql</span> in Supabase → SQL Editor.
          </p>
          <p className="font-sans text-xs text-bark-400 mt-2">({error.message})</p>
        </div>
      </div>
    )
  }

  const reviews = ((data ?? []) as unknown as Omit<ReviewRow, 'products'>[]).map(r => ({
    ...r,
    products: nameById.has(r.product_id) ? { name: nameById.get(r.product_id)! } : null,
  })) as ReviewRow[]
  const pending = reviews.filter(r => !r.approved)
  const approved = reviews.filter(r => r.approved)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-bark-600">Reviews</h1>
        <p className="font-sans text-sm text-bark-400 mt-1">
          {pending.length} awaiting moderation · {approved.length} published. Approved reviews appear on the product page.
        </p>
      </div>

      <section className="mb-10">
        <h2 className="font-sans text-[11px] tracking-[0.2em] uppercase text-bark-400 mb-3">Awaiting moderation</h2>
        {pending.length === 0 ? (
          <div className="bg-cream-50 rounded-2xl border border-cream-200 p-8 text-center">
            <p className="font-sans text-sm text-bark-400">Nothing waiting — new submissions land here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map(r => <ReviewCard key={r.id} review={r} />)}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-sans text-[11px] tracking-[0.2em] uppercase text-bark-400 mb-3">Published</h2>
        {approved.length === 0 ? (
          <div className="bg-cream-50 rounded-2xl border border-cream-200 p-8 text-center">
            <p className="font-sans text-sm text-bark-400">No published reviews yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {approved.map(r => <ReviewCard key={r.id} review={r} />)}
          </div>
        )}
      </section>
    </div>
  )
}
