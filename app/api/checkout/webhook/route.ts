import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { sendOrderConfirmationEmail, sendGiftCardEmail } from '@/lib/resend'
import { calculateCommission } from '@/lib/affiliate'
import type Stripe from 'stripe'
import type { Order, Affiliate } from '@/types'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const orderId = session.metadata?.order_id

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
          break
        }

        // Gift card purchase — create a Stripe promo code and email the recipient
        if (session.metadata?.type === 'gift_card') {
          const { recipient_email, recipient_name, sender_name, message, amount } = session.metadata
          const amountCents = parseInt(amount)

          const coupon = await stripe.coupons.create({
            amount_off: amountCents,
            currency: 'usd',
            duration: 'once',
            name: `Gift Card — $${(amountCents / 100).toFixed(0)} from ${sender_name}`,
          })

          const promoCode = await stripe.promotionCodes.create({
            promotion: { type: 'coupon', coupon: coupon.id },
            max_redemptions: 1,
          })

          await sendGiftCardEmail({
            recipientName: recipient_name,
            recipientEmail: recipient_email,
            senderName: sender_name,
            message: message || undefined,
            amount: amountCents,
            code: promoCode.code,
          }).catch(err => console.error('Gift card email error:', err))

          break
        }

        if (orderId) {
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

          // Decrement inventory for each purchased item
          if (order?.selected_items?.length) {
            await Promise.allSettled(
              order.selected_items.map((item) =>
                supabaseAdmin.rpc('decrement_inventory', { p_product_id: item.id })
              )
            )
          }

          // Send order confirmation email
          if (order) {
            await sendOrderConfirmationEmail({
              customerName: order.customer_name,
              customerEmail: order.customer_email,
              orderId: order.id,
              recipientName: order.recipient_name,
              total: order.total_amount,
            }).catch(err => console.error('Confirmation email error:', err))

            // Record affiliate conversion if order tagged with a code
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
                await supabaseAdmin.from('affiliate_conversions').insert({
                  affiliate_id: aff.id,
                  order_id: orderRow.id,
                  order_total: orderRow.total_amount,
                  commission_amount: commission,
                  commission_rate: aff.commission_rate,
                  status: 'pending',
                }).then(({ error }) => {
                  if (error && error.code !== '23505') console.error('Affiliate conversion error:', error)
                })
              }
            }
          }
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        // Could update order status to failed here if needed
        console.log('Payment failed for intent:', paymentIntent.id)
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.id) {
          await supabaseAdmin
            .from('wholesale_orders')
            .update({ payment_status: 'paid', paid_at: new Date().toISOString() })
            .eq('stripe_invoice_id', invoice.id)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
