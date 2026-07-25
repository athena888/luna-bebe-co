import { NextRequest, NextResponse } from 'next/server'
import { referralByCode } from '@/lib/referrals'
import qrcodegen from '@/lib/vendor/qrcodegen'

export const dynamic = 'force-dynamic'

// QR SVG for a referral insert card — encodes the code's redeem URL. Only
// real codes render (404 otherwise), so the endpoint can't be used as a
// free QR generator. SVG scales losslessly for print.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params
  const ref = await referralByCode(code)
  if (!ref) return NextResponse.json({ error: 'Unknown code' }, { status: 404 })

  const base = (process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com').replace(/\/$/, '')
  const qr = qrcodegen.QrCode.encodeText(`${base}/r/${ref.code}`, qrcodegen.QrCode.Ecc.MEDIUM)

  const margin = 2
  const size = qr.size + margin * 2
  let path = ''
  for (let y = 0; y < qr.size; y++)
    for (let x = 0; x < qr.size; x++)
      if (qr.getModule(x, y)) path += `M${x + margin},${y + margin}h1v1h-1z`
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#ffffff"/><path d="${path}" fill="#3d2c1e"/></svg>`

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
      'Content-Disposition': `inline; filename="referral-${ref.code}.svg"`,
    },
  })
}
