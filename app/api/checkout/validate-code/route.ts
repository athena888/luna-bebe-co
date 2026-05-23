import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json()
    if (!code) return NextResponse.json({ error: 'Code is required' }, { status: 400 })

    const trimmed = code.trim()

    // Try exact code string first, then uppercase fallback — expand coupon so it's not just an ID
    let promos = await stripe.promotionCodes.list({ code: trimmed, limit: 1, expand: ['data.coupon'] })
    if (!promos.data[0]) {
      promos = await stripe.promotionCodes.list({ code: trimmed.toUpperCase(), limit: 1, expand: ['data.coupon'] })
    }
    const promo = promos.data[0]

    if (!promo) return NextResponse.json({ valid: false, error: 'Invalid or expired code' })
    if (!promo.active) return NextResponse.json({ valid: false, error: 'This code has expired' })

    const coupon = typeof promo.coupon === 'string' ? null : promo.coupon
    let discount = 'Discount applied'
    if (coupon?.percent_off) discount = `${coupon.percent_off}% off`
    else if (coupon?.amount_off) discount = `$${(coupon.amount_off / 100).toFixed(0)} off`

    return NextResponse.json({ valid: true, promoId: promo.id, discount, couponId: coupon.id })
  } catch (err) {
    console.error('Validate code error:', err)
    return NextResponse.json({ error: 'Failed to validate code' }, { status: 500 })
  }
}
