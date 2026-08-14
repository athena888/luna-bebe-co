import { NextRequest, NextResponse } from 'next/server'
import { submitToIndexNow } from '@/lib/indexnow'

export const dynamic = 'force-dynamic'

// Manual IndexNow submission (portal-authed via middleware). Product/catalog
// saves ping automatically; this covers everything else — publish-style
// changes with no save hook (copy edits, new pages after a deploy).
// POST { urls?: string[] } → submits those URLs; with no body/urls it submits
// the CURRENT sitemap's URLs. On-demand only — never runs automatically, so
// the historical sitemap is only ever submitted when Emily explicitly asks.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as { urls?: string[] }))
    let urls = Array.isArray(body.urls) ? body.urls.filter((u: unknown): u is string => typeof u === 'string') : []
    if (!urls.length) {
      const base = (process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com').replace(/\/$/, '')
      const xml = await fetch(`${base}/sitemap.xml`).then(r => r.text())
      urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])
    }
    if (!urls.length) return NextResponse.json({ error: 'No URLs to submit' }, { status: 400 })
    const status = await submitToIndexNow(urls)
    if (status === null) return NextResponse.json({ error: 'INDEXNOW_KEY not set or submit failed' }, { status: 500 })
    return NextResponse.json({ ok: status < 400, status, submitted: urls.length })
  } catch (e) {
    console.error('indexnow-ping error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Ping failed' }, { status: 500 })
  }
}
