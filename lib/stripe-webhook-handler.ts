import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { sendOrderConfirmationEmail, sendGiftCardEmail } from '@/lib/resend'
import type { Order } from '@/types'
import { FIRST_YEAR_PRODUCT, FIRST_YEAR_SHIPMENTS, shipByDate } from '@/lib/first-year'

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
  // The First Year set — create the order + 3 scheduled shipments (additive).
  if (session.metadata?.first_year === '1') {
    await handleFirstYearPurchase(session)
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
}

// The First Year: create one order + the 3 future-dated scheduled shipments.
// Idempotent on the payment intent so webhook replays don't duplicate.
async function handleFirstYearPurchase(session: Stripe.Checkout.Session) {
  const paymentIntent = session.payment_intent as string
  const { data: existing } = await supabaseAdmin
    .from('orders').select('id').eq('stripe_payment_intent', paymentIntent).maybeSingle()
  if (existing) return

  const email = session.customer_details?.email ?? ''
  const name = session.customer_details?.name ?? 'Customer'
  const phone = session.customer_details?.phone ?? null
  // Shipping shape varies by API version — read defensively.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = session as any
  const ship = s.shipping_details ?? s.collected_information?.shipping_details ?? null
  const addr = ship?.address ?? session.customer_details?.address ?? {}
  const shippingAddress = {
    name: ship?.name ?? name, email, phone,
    line1: addr?.line1 ?? '', line2: addr?.line2 ?? '',
    city: addr?.city ?? '', state: addr?.state ?? '', zip: addr?.postal_code ?? '',
  }
  const total = session.amount_total ?? FIRST_YEAR_PRODUCT.priceCents
  const trackingNumber = crypto.randomUUID()

  const { data: order } = await supabaseAdmin.from('orders').insert({
    customer_name: name, customer_email: email, customer_phone: phone,
    selected_items: [{ id: FIRST_YEAR_PRODUCT.id, name: FIRST_YEAR_PRODUCT.name, price: FIRST_YEAR_PRODUCT.priceCents, category: 'set' }],
    special_note: 'The First Year — 3-shipment set',
    shipping_type: 'standard', shipping_address: shippingAddress,
    tracking_number: trackingNumber, total_amount: total,
    status: 'processing', stripe_payment_intent: paymentIntent,
  }).select().single()
  if (!order) return

  const now = new Date()
  await supabaseAdmin.from('scheduled_shipments').insert(
    FIRST_YEAR_SHIPMENTS.map(sh => ({
      order_id: order.id,
      set_product_id: FIRST_YEAR_PRODUCT.id,
      shipment_index: sh.index,
      label: sh.label,
      target_month_offset: sh.monthOffset,
      status: 'pending',
      ship_by_date: shipByDate(now, sh.monthOffset),
      recipient_email: email,
    }))
  )

  await sendOrderConfirmationEmail({
    customerName: name, customerEmail: email, orderId: order.id,
    recipientName: undefined, total, trackingNumber,
  }).catch(err => console.error('First Year confirmation email error:', err))
}
