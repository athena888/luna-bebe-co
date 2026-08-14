import { buildProductTsv } from '@/lib/google-feed-tsv'

// Google Merchant Center TSV feed. Rendered per-request, NOT at build time:
// `revalidate` made it a build-time prerender, so content froze between
// deploys and a DB blip during `next build` could kill whole production
// deploys (2026-08-14 outage — same failure as /feeds/google.xml). Google
// fetches this once a day; request-time rendering costs nothing.
export const dynamic = 'force-dynamic'

export async function GET() {
  const tsv = await buildProductTsv()
  return new Response(tsv, {
    headers: {
      'Content-Type': 'text/tab-separated-values; charset=utf-8',
    },
  })
}
