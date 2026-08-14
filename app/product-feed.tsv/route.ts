import { buildProductTsv } from '@/lib/google-feed-tsv'

// Google Merchant Center TSV feed. Revalidates hourly so price and stock
// changes flow through without hammering the DB on every crawl.
export const revalidate = 3600

export async function GET() {
  const tsv = await buildProductTsv()
  return new Response(tsv, {
    headers: {
      'Content-Type': 'text/tab-separated-values; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
    },
  })
}
