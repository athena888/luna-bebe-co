import { NextResponse } from 'next/server'
import { buildFeed, feedXml } from '@/lib/google-feed'

// Google Merchant Center feed — public. Paste
// https://petitelavande.com/feeds/google.xml into Merchant Center → Products
// → Feeds (scheduled fetch). Invalid items are excluded (see
// /feeds/google/validate), never guessed at.
// Rendered per-request, NOT at build time: with `revalidate`, this route was
// prerendered during `next build`, so a DB blip at build time killed entire
// production deploys (2026-08-14 outage). Google fetches once a day — a
// request-time render costs nothing and always reflects the live catalog.
export const dynamic = 'force-dynamic'

export async function GET() {
  const { items } = await buildFeed()
  return new NextResponse(feedXml(items), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
