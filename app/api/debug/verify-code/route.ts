import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

// TEMPORARY — confirms a minted outreach code is real, active, single-use, and 30%.
const KEY = 'dbg-9f3a2c7e1b8d4a6f0e5'

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get('key') !== KEY) return NextResponse.json({ error: 'nope' }, { status: 401 })
  const code = (req.nextUrl.searchParams.get('code') || 'PL30CC061F').trim()
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const list = await (stripe.promotionCodes.list as any)({ code, limit: 1 })
    const pc = list.data?.[0]
    if (!pc) return NextResponse.json({ found: false, code })
    // Coupon that backs all outreach codes.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const coupon: any = await stripe.coupons.retrieve('outreach30').catch((e) => ({ retrieve_error: String(e?.message ?? e) }))
    return NextResponse.json({
      found: true,
      code: pc.code,
      active: pc.active,
      max_redemptions: pc.max_redemptions,
      times_redeemed: pc.times_redeemed,
      livemode: pc.livemode,
      outreach30_coupon: { percent_off: coupon?.percent_off, duration: coupon?.duration, valid: coupon?.valid, id: coupon?.id, error: coupon?.retrieve_error },
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) })
  }
}
