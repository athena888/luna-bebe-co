import { createHmac } from 'crypto'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'

// Review thank-you (2026-07-27): a verified buyer who leaves a review gets ONE
// 20% code by email — for any review, any rating. Never conditioned on
// sentiment: the FTC rule (16 CFR 465) bans incentives tied to positive
// reviews, and Google bans incentivized reviews from Product Ratings feeds
// outright, which is why rewarded reviews are stamped `incentivized` and the
// feed skips them. One reward per email address ever (review_rewards unique).
// Everything is fail-soft: a missing table (§45 not run) means no reward, but
// the review itself still saves.

export const REVIEW_REWARD_ACTIVE = process.env.REVIEW_REWARD_ACTIVE === 'true'

const COUPON_ID = 'REVIEW20-THANKS'
const PERCENT_OFF = 20

// No 0/O/1/I — same read-aloud-safe alphabet as referral codes.
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
const SECRET = process.env.CRON_SECRET || 'pl-review-reward'

/** Deterministic per-email code (REV-XXXXXX) so retries can never mint twice. */
export function reviewRewardCode(email: string): string {
  const h = createHmac('sha256', SECRET).update(`review1-${email.trim().toLowerCase()}`).digest()
  let s = ''
  for (let i = 0; i < 6; i++) s += ALPHABET[h[i] % ALPHABET.length]
  return `REV-${s}`
}

async function ensureCoupon(): Promise<string> {
  try {
    const c = await stripe.coupons.retrieve(COUPON_ID)
    if (c && !c.deleted) return c.id
  } catch { /* fall through to create */ }
  const c = await stripe.coupons.create({
    id: COUPON_ID,
    percent_off: PERCENT_OFF,
    duration: 'once',
    name: 'Review thank-you — 20% off',
  })
  return c.id
}

/**
 * Is this reviewer a real buyer? Email is the primary check (case-insensitive
 * match against paid orders); a phone number is the fallback for people who
 * ordered under a different address. Pending/refunded orders don't count.
 */
export async function isVerifiedBuyer(email: string, phone?: string | null): Promise<boolean> {
  const PAID = ['processing', 'shipped', 'delivered']
  try {
    const { data } = await supabaseAdmin
      .from('orders').select('id').ilike('customer_email', email.trim()).in('status', PAID).limit(1)
    if (data?.length) return true

    const digits = (phone ?? '').replace(/\D/g, '')
    if (digits.length >= 10) {
      const { data: withPhone } = await supabaseAdmin
        .from('orders').select('customer_phone').in('status', PAID).not('customer_phone', 'is', null).limit(500)
      const wanted = digits.slice(-10)
      return (withPhone ?? []).some(o =>
        ((o.customer_phone as string) ?? '').replace(/\D/g, '').slice(-10) === wanted)
    }
  } catch (e) {
    console.warn('verified-buyer check failed:', e instanceof Error ? e.message : e)
  }
  return false
}

/**
 * Claim + mint + send the one-time 20% thank-you. Returns the code on a fresh
 * grant, null when this email was already rewarded (or anything fails).
 * Claim-first: the unique insert on review_rewards is the race guard.
 */
export async function grantReviewReward(input: {
  email: string
  reviewId: string | null
  locale?: 'en' | 'es'
}): Promise<string | null> {
  if (!REVIEW_REWARD_ACTIVE) return null
  const email = input.email.trim().toLowerCase()
  const code = reviewRewardCode(email)
  try {
    const { error } = await supabaseAdmin
      .from('review_rewards').insert({ email, review_id: input.reviewId, code })
    if (error) return null // 23505 = already rewarded; missing table = §45 not run

    await ensureCoupon()
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (stripe.promotionCodes.create as any)(
        // Newer Stripe API shape — plain `coupon:` is rejected as unknown
        {
          promotion: { type: 'coupon', coupon: COUPON_ID },
          code: code.replace('-', ''), // Stripe codes are alphanumeric; email shows REV-XXXXXX
          max_redemptions: 1,
        },
        { idempotencyKey: `review-reward-${code}` }
      )
    } catch (e) {
      // resource_already_exists on a retry is fine — the code works either way
      if (!(e instanceof Error && e.message.includes('already exists'))) throw e
    }

    const { sendReviewRewardEmail } = await import('./resend.ts')
    await sendReviewRewardEmail({ customerEmail: email, code, locale: input.locale ?? 'en' })
    return code
  } catch (e) {
    console.warn('review reward skipped:', e instanceof Error ? e.message : e)
    return null
  }
}
