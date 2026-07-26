import { NextResponse } from 'next/server'
import { buildReviewFeed, reviewFeedXml } from '@/lib/google-review-feed'

// Google product review feed — register SEPARATELY from the product feed in
// Merchant Center (Growth → Manage programs → Product Ratings requires its
// own application; not automatic). Refresh at least monthly to stay eligible
// — schedule Google's fetch daily. Stars appear only after ~50 reviews
// catalog-wide, then ~2 weeks onboarding + 7–10 days per sync.
export const revalidate = 3600

export async function GET() {
  const { rows } = await buildReviewFeed()
  return new NextResponse(reviewFeedXml(rows), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
