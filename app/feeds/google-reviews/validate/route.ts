import { NextResponse } from 'next/server'
import { buildReviewFeed } from '@/lib/google-review-feed'
import { buildProductTsv } from '@/lib/google-feed-tsv'

// Review-feed health check. The silent-zero-stars failure mode is identifier
// mismatch — reviews pointing at products the product feed doesn't emit — so
// that check is front and center. Matching is validated the way Google does
// it: each review's skus against the TSV's ACTUAL offer ids (first column),
// which include per-variant ids and the box rows the XML feed doesn't carry.
export const dynamic = 'force-dynamic'

export async function GET() {
  const [{ rows, issues, total }, tsv] = await Promise.all([buildReviewFeed(), buildProductTsv()])
  const offerIds = new Set(
    tsv.split('\n').slice(1).map(l => l.split('\t')[0]).filter(Boolean)
  )
  const unmatched = rows
    .filter(r => !r.skus.some(s => offerIds.has(s)))
    .map(r => ({ reviewId: r.id, productId: r.productId, skusTried: r.skus }))
  return NextResponse.json({
    totalApprovedReviews: total,
    emitted: rows.length,
    clearsGoogle50Threshold: total >= 50,
    UNMATCHED_PRODUCT_IDS: unmatched.length ? unmatched : 'none — every review maps to a product-feed offer id',
    invalidReviews: issues,
  })
}
