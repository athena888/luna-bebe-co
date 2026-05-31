import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { amount, recipientEmail, recipientName, senderName, senderEmail, message } = await req.json()

    if (!amount || !recipientEmail || !recipientName || !senderName || !senderEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Petite Lavande Gift Card — $${(amount / 100).toFixed(0)}`,
            description: `For ${recipientName} from ${senderName}`,
          },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      customer_email: senderEmail,
      success_url: `${baseUrl}/gift-cards/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/gift-cards`,
      metadata: {
        type: 'gift_card',
        recipient_email: recipientEmail,
        recipient_name: recipientName,
        sender_name: senderName,
        message: message || '',
        amount: String(amount),
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Gift card purchase error:', err)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
