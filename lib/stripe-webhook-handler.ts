import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { sendOrderConfirmationEmail, sendGiftCardEmail } from '@/lib/resend'
import { calculateCommission } from '@/lib/affiliate'
import type { Order, Affiliate } from '@/types'

export async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, event.id)
      return
    case 'payment_intent.payment_failed':
      console.log('Payment failed for intent:', (event.data.object as Stripe.PaymentIntent).id)
      return
    case 'invoice.paid':
      await handleInvoicePaid(event.data.object as Stripe.Invoice)
      return
    default:
      console.log(`Unhandled event type: ${event.type}`)
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, eventId: string) {
  // Wholesale prepay order
  if (session.metadata?.type === 'wholesale_order' && session.metadata?.wholesale_order_id) {
    await supabaseAdmin
      .from('wholesale_orders')
      .update({
        payment_status: 'paid',
        status: 'processing',
        stripe_payment_intent: session.payment_intent as string,
        paid_at: new Date().toISOString(),
      })
      .eq('id', session.metadata.wholesale_order_id)
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

    const promoCode = await stripe.promotionCodes.create(
      { promotion: { type: 'coupon', coupon: coupon.id }, max_redemptions: 1 },
      { idempotencyKey: `giftcard-promo-${session.id}` }
    )

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

  // Only mark as processing if it's still pending — otherwise a replay would re-decrement inventory
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
  if (!order) return

  // Side effects only on first transition
  if (!alreadyAdvanced) {
    if (order.selected_items?.length) {
      await Promise.allSettled(
        order.selected_items.map(item =>
          supabaseAdmin.rpc('decrement_inventory', { p_product_id: item.id })
        )
      )
    }

    await sendOrderConfirmationEmail({
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      orderId: order.id,
      recipientName: order.recipient_name,
      total: order.total_amount,
    }).catch(err => console.error('Confirmation email error:', err))
  }

  // Affiliate conversion — UNIQUE(order_id) constraint makes this idempotent on its own
  const orderRow = order as Order & { affiliate_code?: string | null }
  if (orderRow.affiliate_code) {
    const { data: affRow } = await supabaseAdmin
      .from('affiliates')
      .select('id, commission_rate, status')
      .eq('code', orderRow.affiliate_code)
      .maybeSingle()
    const aff = affRow as Pick<Affiliate, 'id' | 'commission_rate' | 'status'> | null
    if (aff && aff.status === 'approved') {
      const commission = calculateCommission(orderRow.total_amount, aff.commission_rate)
      const { error } = await supabaseAdmin.from('affiliate_conversions').insert({
        affiliate_id: aff.id,
        order_id: orderRow.id,
        order_total: orderRow.total_amount,
        commission_amount: commission,
        commission_rate: aff.commission_rate,
        status: 'pending',
      })
      if (error && error.code !== '23505') {
        console.error('Affiliate conversion error:', error, 'event:', eventId)
      }
    }
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  if (!invoice.id) return
  await supabaseAdmin
    .from('wholesale_orders')
    .update({ payment_status: 'paid', paid_at: new Date().toISOString() })
    .eq('stripe_invoice_id', invoice.id)
}
