import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { sendOrderConfirmationEmail, sendGiftCardEmail } from '@/lib/resend'
import type Stripe from 'stripe'
import type { Order } from '@/types'

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
            coupon: coupon.id,
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

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
}
