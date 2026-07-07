import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { sendOrderConfirmationEmail, sendGiftCardEmail } from '@/lib/resend'
import { sendPurchaseEvent } from '@/lib/ga-measurement-protocol'
import type { Order } from '@/types'

export async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
      return
    case 'payment_intent.payment_failed':
      console.log('Payment failed for intent:', (event.data.object as Stripe.PaymentIntent).id)
      return
    default:
      console.log(`Unhandled event type: ${event.type}`)
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
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
      { coupon: coupon.id, max_redemptions: 1 },
      { idempotencyKey: `giftcard-promo-${session.id}` }
    ) as { code: string }

    await sendGiftCardEmail({
      recipientName: recipient_name,
      recipientEmail: recipient_email,
      senderName: sender_name,
      message: message || undefined,
      amount: amountCents,
      code: promoCode.code,
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

  const alreadyAdvanced = existing && existing.status !== 'pending'

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
  if (!order || alreadyAdvanced) return

  // Side effects only on first transition (line 76 already returns when alreadyAdvanced)
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

  await sendOrderConfirmationEmail({
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    orderId: order.id,
    recipientName: order.recipient_name,
    total: order.total_amount,
    trackingNumber: order.tracking_number,
  }).catch(err => console.error('Confirmation email error:', err))

  // Server-side GA4 purchase — behind the same first-transition guard above,
  // so replays never double-report; transaction_id dedupes besides.
  await sendPurchaseEvent({
    orderId: order.id,
    valueCents: order.total_amount ?? 0,
    currency: (session.currency ?? 'usd').toUpperCase(),
    items: (order.selected_items ?? []).map(i => ({
      id: i.id, name: i.name, price: i.price, qty: (i as { qty?: number }).qty ?? 1, category: i.category,
    })),
  })
}
