import { NextResponse } from 'next/server'
import { buildReviewFeed, reviewFeedXml } from '@/lib/google-review-feed'

// Google product review feed — register SEPARATELY from the product feed in
// Merchant Center (Growth → Manage programs → Product Ratings requires its
// own application; not automatic). Refresh at least monthly to stay eligible
// — schedule Google's fetch daily. Stars appear only after ~50 reviews
// catalog-wide, then ~2 weeks onboarding + 7–10 days per sync.
// Rendered per-request, NOT at build time: with `revalidate`, this route was
// prerendered during `next build`, so a DB blip at build time could kill the
// deploy (same failure that hit /feeds/google.xml in the 2026-08-14 outage).
export const dynamic = 'force-dynamic'

export async function GET() {
  const { rows } = await buildReviewFeed()
  return new NextResponse(reviewFeedXml(rows), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
