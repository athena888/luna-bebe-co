import { supabaseAdmin } from '@/lib/supabase'
import { ReviewsBrowser, type ReviewItem } from '@/components/portal/ReviewsBrowser'

export const dynamic = 'force-dynamic'

export default async function ReviewsPage() {
  // Product names mapped in code (no FK join — §47 dropped the constraint so
  // box reviews can pool under box-<slug> ids). Box names resolve from the
  // catalog; unknown ids fall back to the raw id.
  let [{ data, error }, { data: products }, { data: boxes }] = await Promise.all([
    supabaseAdmin
      .from('reviews')
      .select('id, product_id, customer_name, rating, body, approved, created_at, image_url')
      .order('created_at', { ascending: false }),
    supabaseAdmin.from('products').select('id, name'),
    supabaseAdmin.from('catalog_products').select('slug, name'),
  ])
  // image_url only exists after §54 — fall back so the list still loads.
  if (error) {
    const legacy = await supabaseAdmin
      .from('reviews')
      .select('id, product_id, customer_name, rating, body, approved, created_at')
      .order('created_at', { ascending: false })
    data = legacy.data as typeof data
    error = legacy.error
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="font-serif text-3xl text-bark-600 mb-4">Reviews</h1>
        <div className="bg-cream-50 rounded-2xl border border-cream-200 p-8">
          <p className="font-sans text-sm text-bark-500">Reviews couldn&apos;t load: {error.message}</p>
        </div>
      </div>
    )
  }

  const nameById = new Map((products ?? []).map(p => [p.id as string, p.name as string]))
  for (const b of boxes ?? []) nameById.set(`box-${b.slug}`, `${b.name} (box)`)
  const productOptions = [...nameById.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const reviews: ReviewItem[] = (data ?? []).map(r => ({
    id: r.id as string,
    productName: nameById.get(r.product_id as string) ?? (r.product_id as string),
    customerName: r.customer_name as string,
    rating: r.rating as number,
    body: r.body as string,
    approved: !!r.approved,
    createdAt: r.created_at as string,
    imageUrl: (r as { image_url?: string | null }).image_url ?? null,
  }))
  const pending = reviews.filter(r => !r.approved).length

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-bark-600">Reviews</h1>
        <p className="font-sans text-sm text-bark-400 mt-1">
          {pending} awaiting moderation · {reviews.length - pending} published. Approved reviews appear on their product or box page.
        </p>
      </div>
      <ReviewsBrowser reviews={reviews} productOptions={productOptions} />
    </div>
  )
}
