import { buildEsProductTsv } from '@/lib/google-feed-es'

// Spanish (es-US) Merchant Center feed for merchant 5829406914.
// Register in Merchant Center as a PRIMARY feed with language Spanish and
// country United States, fetching this URL. It is deliberately a different
// endpoint from /product-feed.tsv so that nothing here can alter the English
// feed's output and re-trigger its review.
//
// force-dynamic: a prerendered feed route fails the build whenever Supabase is
// unreachable and then serves stale prices (see the Supabase outage playbook).
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { tsv, rows, skipped } = await buildEsProductTsv()
    return new Response(tsv, {
      headers: {
        'Content-Type': 'text/tab-separated-values; charset=utf-8',
        // Merchant Center refetches on its own schedule; an hour keeps price
        // and stock fresh without rebuilding on every probe.
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
        // Diagnostics without leaking anything: how many offers went out, and
        // how many boxes were held back for want of approved Spanish copy.
        'X-Feed-Rows': String(rows),
        'X-Feed-Skipped': String(skipped.length),
        'X-Feed-Skipped-Ids': skipped.map(s => s.slug).join(',') || 'none',
      },
    })
  } catch (err) {
    // Never surface stack traces or credentials to an unauthenticated fetcher.
    console.error('ES merchant feed failed:', err instanceof Error ? err.message : err)
    return new Response('', { status: 503 })
  }
}
