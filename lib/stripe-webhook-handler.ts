import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { sendOrderConfirmationEmail, sendGiftCardEmail, sendRefundEmail, sendDisputeAlertEmail } from '@/lib/resend'
import { sendPurchaseEvent, sendRefundEvent } from '@/lib/ga-measurement-protocol'
import { sendPurchaseCapi } from '@/lib/meta-capi'
import { isInternalEmail } from '@/lib/site-config'
import { orderAdvanceDecision, purchaseAnalyticsAllowed } from '@/lib/purchase-analytics'
import type { Order } from '@/types'

export async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed':
    // Async payment methods (Klarna etc.): `completed` arrives while still
    // unpaid and is ignored by the paid gate below; this later event is the
    // actual payment confirmation and runs the same idempotent path.
    case 'checkout.session.async_payment_succeeded':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
      return
    case 'checkout.session.async_payment_failed':
      console.log('Async payment failed for session:', (event.data.object as Stripe.Checkout.Session).id)
      return
    case 'payment_intent.payment_failed':
      console.log('Payment failed for intent:', (event.data.object as Stripe.PaymentIntent).id)
      return
    case 'charge.refunded':
      await handleChargeRefunded(event.data.object as Stripe.Charge)
      return
    case 'charge.dispute.created':
      await handleDisputeCreated(event.data.object as Stripe.Dispute)
      return
    default:
      console.log(`Unhandled event type: ${event.type}`)
  }
}

// Find the order for a charge/dispute via the payment intent we stored on the
// order at completion.
async function orderByPaymentIntent(paymentIntent: string | null): Promise<Order | null> {
  if (!paymentIntent) return null
  const { data } = await supabaseAdmin
    .from('orders').select('*').eq('stripe_payment_intent', paymentIntent).maybeSingle()
  return (data as Order | null) ?? null
}

// Restock every line on an order — mirror of the decrement done at purchase.
async function restockOrder(order: Order): Promise<void> {
  if (!order.selected_items?.length) return
  await Promise.allSettled(
    order.selected_items.map(item => {
      const v = item as typeof item & { selectedColor?: string; selectedSize?: string; selectedStyle?: string }
      if (v.selectedColor && v.selectedSize) {
        return supabaseAdmin.rpc('increment_variant', {
          p_product_id: item.id,
          p_color: v.selectedColor.toLowerCase().trim(),
          p_size: v.selectedSize,
          p_style: v.selectedStyle ?? '',
        })
      }
      return supabaseAdmin.rpc('increment_inventory', { p_product_id: item.id })
    })
  )
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const paymentIntent = typeof charge.payment_intent === 'string'
    ? charge.payment_intent
    : charge.payment_intent?.id ?? null
  const order = await orderByPaymentIntent(paymentIntent)
  if (!order) {
    console.log('charge.refunded: no matching order for intent', paymentIntent)
    return
  }
  // Idempotent: only run side effects on the first transition to refunded.
  if (order.status === 'refunded') return

  await restockOrder(order)
  await supabaseAdmin.from('orders').update({ status: 'refunded' }).eq('id', order.id)

  // Reverse the GA4 revenue with the ORIGINAL transaction_id — a refunded
  // order must not stay counted as won revenue. Live-mode events only, same
  // rule as the purchase event.
  if (purchaseAnalyticsAllowed(charge.livemode)) {
    await sendRefundEvent({
      orderId: order.id,
      valueCents: charge.amount_refunded ?? order.total_amount ?? 0,
      currency: (charge.currency ?? 'usd').toUpperCase(),
      internal: isInternalEmail(order.customer_email),
    })
  }

  await sendRefundEmail({
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    amount: charge.amount_refunded ?? order.total_amount ?? 0,
    orderId: order.id,
    locale: (order as { locale?: string }).locale === 'es' ? 'es' : 'en',
  }).catch(err => console.error('Refund email error:', err))
}

async function handleDisputeCreated(dispute: Stripe.Dispute) {
  const paymentIntent = typeof dispute.payment_intent === 'string'
    ? dispute.payment_intent
    : dispute.payment_intent?.id ?? null
  const order = await orderByPaymentIntent(paymentIntent)
  // Don't overwrite order status (a dispute can be won) — just alert the team so
  // they can submit evidence before the deadline.
  await sendDisputeAlertEmail({
    orderId: order?.id ?? null,
    amount: dispute.amount ?? 0,
    reason: dispute.reason ?? null,
    customerEmail: order?.customer_email ?? null,
  }).catch(err => console.error('Dispute alert email error:', err))
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // Payment truth gate: Stripe fires `completed` for async payment methods
  // while payment_status is still 'unpaid'. Reaching the success URL proves
  // nothing — NOTHING here (gift cards included) may run until Stripe says
  // the money actually moved. `async_payment_succeeded` re-enters with 'paid'.
  if (session.payment_status !== 'paid') {
    console.log('checkout session completed but not paid — waiting for async payment:', session.id)
    return
  }

  // Gift card — Stripe-side idempotency keys keep retries from creating duplicate coupons
  if (session.metadata?.type === 'gift_card') {
    const { recipient_email, recipient_name, sender_name, message, amount } = session.metadata
    const amountCents = parseInt(amount)

    const coupon = await stripe.coupons.create(
      {
        amount_off: amountCents,
        currency: 'usd',
        duration: 'once',
        name: `Gift Card — $${(amountCents / 100).toFixed(0)} from ${sender_name}`,
      },
      { idempotencyKey: `giftcard-coupon-${session.id}` }
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const promoCode = await (stripe.promotionCodes.create as any)(
      // Newer Stripe API shape — plain `coupon:` is rejected as unknown
      { promotion: { type: 'coupon', coupon: coupon.id }, max_redemptions: 1 },
      { idempotencyKey: `giftcard-promo-${session.id}` }
    ) as { code: string }

    await sendGiftCardEmail({
      recipientName: recipient_name,
      recipientEmail: recipient_email,
      senderName: sender_name,
      message: message || undefined,
      amount: amountCents,
      code: promoCode.code,
      locale: session.metadata?.locale === 'es' ? 'es' : 'en',
    }).catch(err => console.error('Gift card email error:', err))
    return
  }

  const orderId = session.metadata?.order_id
  if (!orderId) return

  // Only fire side effects on the pending->processing transition, not on replays
  const { data: existing } = await supabaseAdmin
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .maybeSingle()

  const decision = orderAdvanceDecision(session, (existing as { status?: string } | null)?.status ?? null)
  if (!decision.advance) {
    // Safe identifiers only — never the session object (it carries PII).
    console.log(`checkout session not advanced (${decision.reason}): order ${orderId}, session ${session.id}`)
    return
  }

  const { data: orderData } = await supabaseAdmin
    .from('orders')
    .update({
      status: 'processing',
      stripe_payment_intent: session.payment_intent as string,
    })
    .eq('id', orderId)
    .select()
    .single()

  const order = orderData as Order | null
  if (!order) return

  // Side effects only on first transition (the decision above already refused replays)
  if (order.selected_items?.length) {
    await Promise.allSettled(
      order.selected_items.map(item => {
        const v = item as typeof item & { selectedColor?: string; selectedSize?: string; selectedStyle?: string }
        // Variant items decrement the specific color/size/style; others use the flat counter
        if (v.selectedColor && v.selectedSize) {
          return supabaseAdmin.rpc('decrement_variant', {
            p_product_id: item.id,
            p_color: v.selectedColor.toLowerCase().trim(),
            p_size: v.selectedSize,
            p_style: v.selectedStyle ?? '',
          })
        }
        return supabaseAdmin.rpc('decrement_inventory', { p_product_id: item.id })
      })
    )
  }

  // Referral loop (Build 6): mint this order's personal code FIRST so the
  // confirmation email can carry it. Everything is gated + fail-soft.
  let referralCode: string | null = null
  try {
    const { REFERRALS_ACTIVE, ensureReferralForOrder } = await import('@/lib/referrals')
    if (REFERRALS_ACTIVE) {
      const ref = await ensureReferralForOrder(order.id, order.customer_email)
      referralCode = ref?.code ?? null
    }
  } catch (e) {
    console.warn('referral mint skipped:', e)
  }

  const { resolveOrderItemImages } = await import('@/lib/order-item-images')
  await sendOrderConfirmationEmail({
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    orderId: order.id,
    recipientName: order.recipient_name,
    total: order.total_amount,
    trackingNumber: order.tracking_number,
    referralCode,
    locale: (order as { locale?: string }).locale === 'es' ? 'es' : 'en',
    // Estimated-arrival line: the buyer's own ZIP + chosen service, anchored
    // to when the order was placed.
    shippingZip: order.shipping_address?.zip ?? null,
    shippingType: order.shipping_type ?? null,
    orderedAt: (order as { created_at?: string }).created_at ?? null,
    items: await resolveOrderItemImages((order.selected_items ?? []).map(i => ({
      id: i.id, name: i.name, price: i.price, qty: (i as { qty?: number }).qty ?? 1,
      image: (i as { image?: string | null }).image ?? null,
    }))),
  }).catch(async err => {
    // Don't lose the confirmation: queue a retry the daily flows cron picks up.
    console.error('Confirmation email error (queuing retry):', err)
    try {
      const { enqueueOrderConfirmationRetry } = await import('@/lib/email-flows')
      await enqueueOrderConfirmationRetry(order.id, order.customer_email)
    } catch (e) {
      console.error('Failed to queue confirmation retry:', e)
    }
  })

  // Contact capture (source of truth, §37): buyers get transactional mail only
  // until they opt in — marketing_opt_in stays false here. Fail-soft.
  try {
    const { upsertContact } = await import('@/lib/contacts')
    await upsertContact({ email: order.customer_email, name: order.customer_name, source: 'checkout' })
  } catch (e) {
    console.warn('checkout contact capture skipped:', e)
  }

  // Referral redemption: if THIS order paid with someone's code, record it
  // and thank the referrer with their $15 code. Fail-soft.
  try {
    const { REFERRALS_ACTIVE, recordRedemptionIfAny, markRewardSent } = await import('@/lib/referrals')
    if (REFERRALS_ACTIVE) {
      const reward = await recordRedemptionIfAny(session.id, order.id, order.customer_email)
      if (reward) {
        const { sendReferralRewardEmail } = await import('@/lib/resend')
        const { localeOf } = await import('@/lib/contacts')
        await sendReferralRewardEmail({ customerEmail: reward.referrerEmail, code: reward.rewardCode, locale: await localeOf(reward.referrerEmail) })
        await markRewardSent(reward.referrerEmail, reward.rewardCode)
      }
    }
  } catch (e) {
    console.warn('referral redemption skipped:', e)
  }

  const currency = (session.currency ?? 'usd').toUpperCase()
  const items = (order.selected_items ?? []).map(i => ({
    id: i.id, name: i.name, price: i.price, qty: (i as { qty?: number }).qty ?? 1, category: i.category,
  }))

  // Production analytics only for LIVE-mode events: test-mode sessions
  // forwarded by `stripe listen` during development were landing in
  // production GA4 as real revenue. Orders/emails still flow for test mode
  // (that's what dev testing exercises) — only the analytics are withheld.
  if (!purchaseAnalyticsAllowed(session.livemode)) {
    console.log('test-mode session — GA4/CAPI purchase not sent: order', order.id)
    return
  }

  // Server-side GA4 purchase — behind the same first-transition guard above,
  // so replays never double-report; transaction_id dedupes besides.
  await sendPurchaseEvent({
    orderId: order.id,
    valueCents: order.total_amount ?? 0,
    currency,
    clientId: session.metadata?.ga_cid ?? null,
    sessionId: session.metadata?.ga_sid ?? null,
    // Our own test orders must not land in GA4 as revenue.
    internal: isInternalEmail(order.customer_email),
    items,
  })

  // Server-side Meta CAPI purchase — event_id = order id dedupes it against the
  // browser Pixel Purchase fired on the confirmation page.
  await sendPurchaseCapi({
    orderId: order.id,
    valueCents: order.total_amount ?? 0,
    currency,
    email: order.customer_email,
    items,
  })
}
