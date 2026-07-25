import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'

// Build 6 — referral loop (give 15 / get 15).
// Every paid order mints ONE personal code (PL-XXXXXX): the friend gets $15
// off their first box ($90 minimum), and when it's redeemed the original
// buyer gets a $15 thank-you code by email. Everything here is gated behind
// REFERRALS_ACTIVE so nothing runs until the copy + UI are approved.

export const REFERRALS_ACTIVE = process.env.REFERRALS_ACTIVE === 'true'

const FRIEND_COUPON_ID = 'REFERRAL15-FRIEND'
const REWARD_COUPON_ID = 'REFERRAL15-REWARD'
const AMOUNT_OFF_CENTS = 1500
const MINIMUM_ORDER_CENTS = 9000

// No 0/O/1/I — these get read off a printed card.
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'

function randomCode(): string {
  let s = ''
  for (let i = 0; i < 6; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  return `PL-${s}`
}

// Reusable $15-off coupons, created once and shared by every promotion code.
async function ensureCoupon(id: string, name: string): Promise<string> {
  try {
    const c = await stripe.coupons.retrieve(id)
    if (c && !c.deleted) return c.id
  } catch { /* not found — create below */ }
  const c = await stripe.coupons.create(
    { id, amount_off: AMOUNT_OFF_CENTS, currency: 'usd', duration: 'once', name },
    { idempotencyKey: `coupon-${id}` }
  )
  return c.id
}

export interface ReferralRow {
  id: string
  order_id: string
  referrer_email: string
  code: string
  promo_id: string
  redeemed_by_order: string | null
  redeemed_at: string | null
  reward_promo_id: string | null
  reward_code: string | null
  reward_sent_at: string | null
}

/** Mint the order's personal referral code (idempotent per order). */
export async function ensureReferralForOrder(orderId: string, referrerEmail: string): Promise<ReferralRow | null> {
  const { data: existing } = await supabaseAdmin
    .from('referrals').select('*').eq('order_id', orderId).maybeSingle()
  if (existing) return existing as ReferralRow

  const couponId = await ensureCoupon(FRIEND_COUPON_ID, 'A gift from a friend — $15 off')
  const code = randomCode()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const promo = await (stripe.promotionCodes.create as any)(
    {
      coupon: couponId,
      code: code.replace('-', ''), // Stripe codes are alphanumeric; insert shows PL-XXXXXX
      max_redemptions: 1,
      restrictions: { minimum_amount: MINIMUM_ORDER_CENTS, minimum_amount_currency: 'usd' },
      metadata: { kind: 'referral_friend', order_id: orderId },
    },
    { idempotencyKey: `referral-promo-${orderId}` }
  ) as { id: string; code: string }

  const { data, error } = await supabaseAdmin
    .from('referrals')
    .insert({ order_id: orderId, referrer_email: referrerEmail.toLowerCase(), code, promo_id: promo.id })
    .select().single()
  if (error) {
    // Unique race (webhook replay): fall back to the winning row.
    const { data: again } = await supabaseAdmin
      .from('referrals').select('*').eq('order_id', orderId).maybeSingle()
    return (again as ReferralRow | null) ?? null
  }
  return data as ReferralRow
}

/** Look up a referral by its human code (redeem page + QR route). */
export async function referralByCode(code: string): Promise<ReferralRow | null> {
  const norm = code.trim().toUpperCase().replace(/^PL-?/, '')
  const { data } = await supabaseAdmin
    .from('referrals').select('*').eq('code', `PL-${norm}`).maybeSingle()
  return (data as ReferralRow | null) ?? null
}

/**
 * After a checkout completes: if the session paid with a referral code,
 * record the redemption and mint the referrer's $15 thank-you code.
 * Returns the reward info so the caller can email the referrer.
 */
export async function recordRedemptionIfAny(
  sessionId: string,
  redeemedByOrder: string,
  buyerEmail: string
): Promise<{ referrerEmail: string; rewardCode: string } | null> {
  // The webhook payload doesn't expand discounts — fetch them explicitly.
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['total_details.breakdown'],
  })
  const discounts = session.total_details?.breakdown?.discounts ?? []
  const promoIds = discounts
    .map(d => {
      // promotion_code is missing from this SDK version's Discount type
      const disc = d.discount as { promotion_code?: string | { id: string } | null } | null
      return typeof disc?.promotion_code === 'string' ? disc.promotion_code : disc?.promotion_code?.id
    })
    .filter((id): id is string => Boolean(id))
  if (!promoIds.length) return null

  const { data } = await supabaseAdmin
    .from('referrals').select('*').in('promo_id', promoIds).maybeSingle()
  const ref = data as ReferralRow | null
  if (!ref || ref.redeemed_at) return null

  // Self-referral: mark redeemed (the code is spent either way) but no reward.
  const selfReferral = ref.referrer_email === buyerEmail.toLowerCase()

  let rewardCode: string | null = null
  let rewardPromoId: string | null = null
  if (!selfReferral) {
    const couponId = await ensureCoupon(REWARD_COUPON_ID, 'Thank you for sharing — $15 off')
    const code = randomCode()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const promo = await (stripe.promotionCodes.create as any)(
      {
        coupon: couponId,
        code: code.replace('-', ''),
        max_redemptions: 1,
        restrictions: { minimum_amount: MINIMUM_ORDER_CENTS, minimum_amount_currency: 'usd' },
        metadata: { kind: 'referral_reward', referral_id: ref.id },
      },
      { idempotencyKey: `referral-reward-${ref.id}` }
    ) as { id: string; code: string }
    rewardCode = code
    rewardPromoId = promo.id
  }

  await supabaseAdmin.from('referrals').update({
    redeemed_by_order: redeemedByOrder,
    redeemed_at: new Date().toISOString(),
    reward_promo_id: rewardPromoId,
    reward_code: rewardCode,
  }).eq('id', ref.id)

  return rewardCode ? { referrerEmail: ref.referrer_email, rewardCode } : null
}

/** Mark the thank-you email as sent (kept separate so a send failure can retry). */
export async function markRewardSent(referrerEmail: string, rewardCode: string): Promise<void> {
  await supabaseAdmin.from('referrals')
    .update({ reward_sent_at: new Date().toISOString() })
    .eq('referrer_email', referrerEmail).eq('reward_code', rewardCode)
}
