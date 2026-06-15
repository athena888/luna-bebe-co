import { stripe } from './stripe'

// Owner-managed discount codes — create/list/deactivate Stripe promotion codes
// from the portal so the founder never has to open the Stripe dashboard. Each
// code is backed by its own coupon. Server-only.

export interface DiscountInput {
  code: string
  type: 'percent' | 'amount'
  value: number                 // percent (1-100) or dollars
  duration?: 'once' | 'forever'
  maxRedemptions?: number | null
  expiresAt?: number | null     // unix seconds
  minAmountDollars?: number | null
  firstTimeOnly?: boolean
}

export interface DiscountRow {
  id: string
  code: string
  active: boolean
  times_redeemed: number
  max_redemptions: number | null
  expires_at: number | null
  livemode: boolean
  percent_off: number | null
  amount_off: number | null     // cents
}

function cleanCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 40)
}

/** Create a coupon + a customer-facing promotion code. Returns the code string. */
export async function createDiscount(input: DiscountInput): Promise<{ code: string; id: string }> {
  const code = cleanCode(input.code)
  if (!code) throw new Error('Enter a code (letters, numbers, dashes)')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const couponParams: any = { duration: input.duration || 'once', name: code }
  if (input.type === 'percent') couponParams.percent_off = Math.min(100, Math.max(1, Math.round(input.value)))
  else { couponParams.amount_off = Math.round(input.value * 100); couponParams.currency = 'usd' }
  const coupon = await stripe.coupons.create(couponParams)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const promoParams: any = { promotion: { type: 'coupon', coupon: coupon.id }, code }
  if (input.maxRedemptions && input.maxRedemptions > 0) promoParams.max_redemptions = input.maxRedemptions
  if (input.expiresAt) promoParams.expires_at = input.expiresAt
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const restrictions: any = {}
  if (input.minAmountDollars && input.minAmountDollars > 0) {
    restrictions.minimum_amount = Math.round(input.minAmountDollars * 100)
    restrictions.minimum_amount_currency = 'usd'
  }
  if (input.firstTimeOnly) restrictions.first_time_transaction = true
  if (Object.keys(restrictions).length) promoParams.restrictions = restrictions

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const promo = await (stripe.promotionCodes.create as any)(promoParams)
  return { code: promo.code, id: promo.id }
}

/** List recent promotion codes (excludes the auto-generated outreach PL30… ones). */
export async function listDiscounts(): Promise<DiscountRow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const list = await (stripe.promotionCodes.list as any)({ limit: 100, expand: ['data.coupon'] })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (list.data ?? [])
    .filter((pc: any) => !/^PL30/.test(pc.code)) // hide the per-recipient outreach codes
    .map((pc: any) => ({
      id: pc.id,
      code: pc.code,
      active: pc.active,
      times_redeemed: pc.times_redeemed,
      max_redemptions: pc.max_redemptions ?? null,
      expires_at: pc.expires_at ?? null,
      livemode: pc.livemode,
      percent_off: pc.coupon?.percent_off ?? null,
      amount_off: pc.coupon?.amount_off ?? null,
    }))
}

export async function setDiscountActive(id: string, active: boolean): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (stripe.promotionCodes.update as any)(id, { active })
}
