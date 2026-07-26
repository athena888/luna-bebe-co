import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'

// Personal welcome codes — one unique, single-use 10% code per newsletter
// signup, replacing the shared WELCOME10 (which the same customer could have
// reused on every order). Same minting pattern as the referral loop.
// Fail-soft: any error returns null and the welcome email simply omits the
// discount line.

const COUPON_ID = 'WELCOME-10PCT'
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'

function randomCode(): string {
  let s = ''
  for (let i = 0; i < 6; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  return `WELC-${s}`
}

async function ensureCoupon(): Promise<string> {
  try {
    const c = await stripe.coupons.retrieve(COUPON_ID)
    if (c && !c.deleted) return c.id
  } catch { /* create below */ }
  const c = await stripe.coupons.create(
    { id: COUPON_ID, percent_off: 10, duration: 'once', name: 'Welcome — 10% off your first order' },
    { idempotencyKey: `coupon-${COUPON_ID}` }
  )
  return c.id
}

/** Mint (or return the existing) personal welcome code for an email. */
export async function ensureWelcomeCode(email: string): Promise<string | null> {
  const norm = email.trim().toLowerCase()
  try {
    const { data: existing } = await supabaseAdmin
      .from('marketing_contacts').select('id, welcome_code').eq('email', norm).maybeSingle()
    if (existing?.welcome_code) return existing.welcome_code as string

    const couponId = await ensureCoupon()
    const code = randomCode()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (stripe.promotionCodes.create as any)(
      {
        promotion: { type: 'coupon', coupon: couponId },
        code: code.replace('-', ''),
        max_redemptions: 1,
        metadata: { kind: 'welcome', email: norm },
      },
      { idempotencyKey: `welcome-${norm}` }
    )

    if (existing) {
      await supabaseAdmin.from('marketing_contacts').update({ welcome_code: code }).eq('id', existing.id)
    } else {
      // Contact row may not exist yet (upsertContact runs separately) — create
      // minimally; upsertContact's fill-if-missing rules complete it later.
      await supabaseAdmin.from('marketing_contacts')
        .upsert({ email: norm, welcome_code: code, source: 'newsletter' }, { onConflict: 'email' })
    }
    return code
  } catch (e) {
    console.warn('welcome code mint skipped:', e instanceof Error ? e.message : e)
    return null
  }
}

/** Look up a stored code (welcome-3 at D+4). Null → email omits the line. */
export async function welcomeCodeOf(email: string): Promise<string | null> {
  try {
    const { data } = await supabaseAdmin
      .from('marketing_contacts').select('welcome_code').eq('email', email.trim().toLowerCase()).maybeSingle()
    return (data?.welcome_code as string) ?? null
  } catch {
    return null
  }
}
