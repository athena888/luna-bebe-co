import { stripe } from './stripe.ts'
import { supabaseAdmin } from './supabase.ts'

// Payment reconciliation — the safety net for the failure mode that broke
// silently from 2026-06-04 to 2026-08-16: Stripe captures the money, the
// webhook never lands, and the site records nothing. The customer sees a
// success page; the shop sees no order. Nothing on the site can detect that,
// because the site is the part that failed — so this checks the money against
// the orders table, treating STRIPE as the source of truth.
//
// A gap here means a real customer paid and is waiting on a box nobody knows
// about. Silence means healthy: this only reports problems.

export type PaymentProblem = 'order_missing' | 'order_not_advanced' | 'no_order_id'

export interface PaymentGap {
  sessionId: string
  paidAt: string
  amountCents: number
  email: string | null
  orderId: string | null
  problem: PaymentProblem
}

const PROBLEM_TEXT: Record<PaymentProblem, string> = {
  order_missing: 'PAID but no order row exists — the webhook never recorded it',
  order_not_advanced: 'PAID but the order is still "pending" — the webhook never advanced it',
  no_order_id: 'PAID but the session carries no order_id — cannot be matched',
}

/**
 * Fully refunded? Then there is nothing to fulfil and it is NOT a gap.
 * Added 2026-08-17 after the guard cried wolf: a refunded test purchase whose
 * order row had since been deleted was reported as an unfulfilled payment
 * every single day. An alert that fires daily on a non-problem trains you to
 * ignore it, which would hide the real gap it exists to catch.
 * PARTIAL refunds still count as gaps — money was kept, so something is owed.
 */
async function fullyRefunded(paymentIntentId: string | null): Promise<boolean> {
  if (!paymentIntentId) return false
  try {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge'] })
    const charge = pi.latest_charge
    if (!charge || typeof charge === 'string') return false
    return charge.refunded === true || (charge.amount_refunded ?? 0) >= (charge.amount ?? 0)
  } catch {
    // Never let a Stripe hiccup silence a real gap — fail towards alerting.
    return false
  }
}

/**
 * Compare Stripe's paid checkout sessions against the orders table.
 * Gift-card sessions are excluded: they intentionally create no order row
 * (they mint a coupon + email instead), so they'd be false positives.
 * Fully refunded payments are skipped — see fullyRefunded() above.
 */
export async function reconcilePayments(days = 7): Promise<{ checked: number; giftCards: number; gaps: PaymentGap[]; refundedSkipped: number }> {
  const since = Math.floor(Date.now() / 1000) - days * 86_400
  const sessions = await stripe.checkout.sessions.list({ limit: 100, created: { gte: since } })

  const paid = sessions.data.filter(s => s.payment_status === 'paid')
  const giftCards = paid.filter(s => s.metadata?.type === 'gift_card').length
  const orders = paid.filter(s => s.metadata?.type !== 'gift_card')

  const gaps: PaymentGap[] = []
  let refundedSkipped = 0
  for (const s of orders) {
    // Refunded in full → the money went back; by definition nothing to fulfil.
    const pi = typeof s.payment_intent === 'string' ? s.payment_intent : s.payment_intent?.id ?? null
    if (await fullyRefunded(pi)) { refundedSkipped++; continue }

    const orderId = s.metadata?.order_id ?? null
    const base = {
      sessionId: s.id,
      paidAt: new Date(s.created * 1000).toISOString(),
      amountCents: s.amount_total ?? 0,
      email: s.customer_details?.email ?? s.customer_email ?? null,
      orderId,
    }

    if (!orderId) {
      gaps.push({ ...base, problem: 'no_order_id' })
      continue
    }

    const { data: order } = await supabaseAdmin
      .from('orders').select('id, status').eq('id', orderId).maybeSingle()

    if (!order) {
      gaps.push({ ...base, problem: 'order_missing' })
    } else if ((order as { status: string }).status === 'pending') {
      // The webhook flips pending → processing. Still pending on a PAID
      // session means the side effects (email, inventory) never ran.
      gaps.push({ ...base, problem: 'order_not_advanced' })
    }
  }

  return { checked: orders.length - refundedSkipped, giftCards, gaps, refundedSkipped }
}

/** Plain-text alert body. Written to be actionable at a glance. */
export function formatGapAlert(gaps: PaymentGap[]): string {
  const money = (c: number) => `$${(c / 100).toFixed(2)}`
  return [
    `${gaps.length} payment${gaps.length === 1 ? '' : 's'} reached Stripe but ${gaps.length === 1 ? 'is' : 'are'} missing from your orders.`,
    '',
    'These customers were CHARGED. Check each one and fulfill manually if needed.',
    '',
    ...gaps.map(g => [
      `• ${money(g.amountCents)} — ${g.email ?? 'no email'}`,
      `  paid:    ${g.paidAt.slice(0, 16).replace('T', ' ')} UTC`,
      `  problem: ${PROBLEM_TEXT[g.problem]}`,
      `  stripe:  https://dashboard.stripe.com/payments?query=${encodeURIComponent(g.sessionId)}`,
      g.orderId ? `  order:   ${g.orderId}` : '',
    ].filter(Boolean).join('\n')),
    '',
    'Most likely cause: the Stripe webhook is failing again. Check',
    'Stripe → Developers → Webhooks → event deliveries. The endpoint must be',
    'https://petitelavande.com/api/checkout/webhook (never the *.vercel.app host —',
    'it redirects, and Stripe treats redirects as delivery failures) and',
    'STRIPE_WEBHOOK_SECRET in Vercel must match that endpoint.',
  ].join('\n')
}
