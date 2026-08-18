import { stripe } from './stripe.ts'
import { randomUUID } from 'node:crypto'

// Unique, single-use 30%-off codes for cold outreach. One reusable Stripe coupon
// (30% off, once) backs many promotion codes — each minted per recipient with
// max_redemptions = 1, so every prospect gets a code that's theirs alone.

const COUPON_ID = 'outreach30'

async function ensureCoupon() {
  try {
    return await stripe.coupons.retrieve(COUPON_ID)
  } catch {
    return await stripe.coupons.create({
      id: COUPON_ID, percent_off: 30, duration: 'once', name: 'Outreach — 30% off first order',
    })
  }
}

/** Mint a unique single-use 30% code (e.g. "PL30A1B2C3"). Throws on Stripe error. */
export async function mintOutreachCode(): Promise<string> {
  await ensureCoupon()
  const code = `PL30${randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()}`
  // This Stripe API version nests the coupon under `promotion` (top-level
  // `coupon` is rejected as an unknown parameter).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const promo = await (stripe.promotionCodes.create as any)({
    promotion: { type: 'coupon', coupon: COUPON_ID },
    code,
    max_redemptions: 1,
  })
  return (promo as { code: string }).code
}
