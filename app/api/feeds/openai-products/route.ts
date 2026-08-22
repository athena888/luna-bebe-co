import { NextResponse } from 'next/server'
import { buildOpenAiFeed } from '@/lib/openai-feed'

// Hosted OpenAI Ads product feed — public and unauthenticated, because the
// fetcher has no way to log in.
//
// force-dynamic for the same reason every other feed route here is: a build
// time prerender against a sleeping database has failed deploys before
// (2026-08-14 outage). This route must never be evaluated at build time.
export const dynamic = 'force-dynamic'

const FILENAME = 'petite-lavande-openai-products.csv'

export async function GET() {
  try {
    const { csv, rows, rejected } = await buildOpenAiFeed()
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        // Stable filename if anyone saves it straight from the browser.
        'Content-Disposition': `inline; filename="${FILENAME}"`,
        // Prices and stock come from the live catalog; an hour of CDN cache
        // keeps the endpoint cheap while staying fresh enough for a daily pull.
        'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
        // Counts only — never the reasons, which name internal products.
        'X-Feed-Rows': String(rows.length),
        'X-Feed-Rejected': String(rejected.length),
      },
    })
  } catch (error) {
    // Nothing internal escapes: no stack, no query, no env. Details go to the
    // server log where only we can read them.
    console.error('OpenAI feed build failed:', error)
    return new NextResponse('Feed temporarily unavailable\n', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    })
  }
}
