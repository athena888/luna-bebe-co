import { NextResponse } from 'next/server'
import { buildFeed, feedXml } from '@/lib/google-feed'

// Google Merchant Center feed — public, cached an hour so the daily fetch is
// cheap. Paste https://petitelavande.com/feeds/google.xml into Merchant
// Center → Products → Feeds (scheduled fetch). Invalid items are excluded
// (see /feeds/google/validate), never guessed at.
export const revalidate = 3600

export async function GET() {
  const { items } = await buildFeed()
  return new NextResponse(feedXml(items), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
