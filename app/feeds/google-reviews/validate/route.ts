import { NextResponse } from 'next/server'
import { buildReviewFeed } from '@/lib/google-review-feed'
import { buildFeed } from '@/lib/google-feed'

// Review-feed health check. The silent-zero-stars failure mode is identifier
// mismatch — reviews pointing at products the product feed doesn't emit — so
// that check is front and center.
export const dynamic = 'force-dynamic'

export async function GET() {
  const [{ rows, issues, total }, { items: products }] = await Promise.all([buildReviewFeed(), buildFeed()])
  const productIds = new Set(products.map(p => p.id))
  const unmatched = rows.filter(r => !productIds.has(r.productId)).map(r => ({ reviewId: r.id, productId: r.productId }))
  return NextResponse.json({
    totalApprovedReviews: total,
    emitted: rows.length,
    clearsGoogle50Threshold: total >= 50,
    UNMATCHED_PRODUCT_IDS: unmatched.length ? unmatched : 'none — every review maps to a product-feed item',
    invalidReviews: issues,
  })
}
