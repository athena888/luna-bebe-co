import { NextRequest, NextResponse } from 'next/server'
import { getSiteImages } from '@/lib/site-images'

// Public, read-only: lets client pages (Build, Guide) render managed slot
// images. Pass ?keys=a,b,c. Returns { images: { key: {public_url, alt_text} } }.
export async function GET(req: NextRequest) {
  const keys = (req.nextUrl.searchParams.get('keys') || '').split(',').map(s => s.trim()).filter(Boolean)
  if (!keys.length) return NextResponse.json({ images: {} })
  const images = await getSiteImages(keys)
  return NextResponse.json({ images }, { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' } })
}
