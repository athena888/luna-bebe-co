import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { rateLimitByIp } from '@/lib/rate-limit'
import { FOUNDING_CODE } from '@/lib/promo'
import { foundingPromoState } from '@/lib/promo-state'

export async function POST(req: NextRequest) {
  try {
    if (!await rateLimitByIp(req, 'validate_code', 20, 3600)) {
      return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 })
    }

    const { code } = await req.json()
    if (!code) return NextResponse.json({ error: 'Code is required' }, { status: 400 })

    const trimmed = code.trim()

    // FOUNDING30 is an ATTRIBUTION code, not a discount. Sale pricing is
    // already applied to every box on the site, so a code that also took
    // money off would double-discount the same promotion. Stripe cannot
    // express a zero-value coupon (percent_off and amount_off must both be
    // positive), so it is handled here instead of being a real coupon:
    // accepted, logged against the order, worth nothing extra.
    if (trimmed.toUpperCase() === FOUNDING_CODE) {
      const promo = await foundingPromoState()
      return promo.active
        ? NextResponse.json({ valid: true, promoId: null, attributionCode: FOUNDING_CODE, discount: 'Founding Families pricing already applied' })
        : NextResponse.json({ valid: false, error: 'This code has expired' })
    }

    // Try exact code string first, then uppercase fallback — expand coupon so it's not just an ID
    let promos = await stripe.promotionCodes.list({ code: trimmed, limit: 1, expand: ['data.promotion.coupon'] })
    if (!promos.data[0]) {
      promos = await stripe.promotionCodes.list({ code: trimmed.toUpperCase(), limit: 1, expand: ['data.promotion.coupon'] })
    }
    // Referral codes print as PL-XXXXXX but live in Stripe without the dash
    const stripped = trimmed.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (!promos.data[0] && stripped && stripped !== trimmed.toUpperCase()) {
      promos = await stripe.promotionCodes.list({ code: stripped, limit: 1, expand: ['data.promotion.coupon'] })
    }
    const promo = promos.data[0]

    if (!promo) return NextResponse.json({ valid: false, error: 'Invalid or expired code' })
    if (!promo.active) return NextResponse.json({ valid: false, error: 'This code has expired' })

    const coupon = typeof promo.promotion.coupon === 'string' ? null : promo.promotion.coupon
    let discount = 'Discount applied'
    if (coupon?.percent_off) discount = `${coupon.percent_off}% off`
    else if (coupon?.amount_off) discount = `$${(coupon.amount_off / 100).toFixed(0)} off`

    return NextResponse.json({ valid: true, promoId: promo.id, discount, couponId: coupon?.id ?? null })
  } catch (err) {
    console.error('Validate code error:', err)
    return NextResponse.json({ error: 'Failed to validate code' }, { status: 500 })
  }
}
