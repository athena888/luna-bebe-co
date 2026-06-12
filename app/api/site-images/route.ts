import { NextRequest, NextResponse } from 'next/server'
import { getSiteImages } from '@/lib/site-images'
import { getScrims } from '@/lib/scrims'

// Public, read-only: lets client pages (Build, Guide) render managed slot
// images. Pass ?keys=a,b,c. Returns { images: { key: {public_url, alt_text} } }.
// Pass &scrims=1 to also include the admin-tuned scrim map { scrims: {[key]: {hex, opacity}} }.
export async function GET(req: NextRequest) {
  const keys = (req.nextUrl.searchParams.get('keys') || '').split(',').map(s => s.trim()).filter(Boolean)
  const wantScrims = req.nextUrl.searchParams.get('scrims') === '1'

  const [images, scrims] = await Promise.all([
    keys.length ? getSiteImages(keys) : Promise.resolve({}),
    wantScrims ? getScrims() : Promise.resolve(null),
  ])

  const out: Record<string, unknown> = { images }
  if (wantScrims) out.scrims = scrims ?? {}
  return NextResponse.json(out, { headers: { 'Cache-Control': 'public, max-age=30, s-maxage=30' } })
}
