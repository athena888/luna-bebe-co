import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { firstYearEnabled } from '@/lib/first-year'
import { getFirstYearProduct } from '@/lib/first-year-db'

export const dynamic = 'force-dynamic'

// Start a one-time Stripe Checkout for The First Year set. Reuses the existing
// Stripe checkout (single payment, no subscription). Stripe collects email +
// shipping; the order + 3 scheduled shipments are created in the webhook.
export async function POST() {
  if (!firstYearEnabled()) return NextResponse.json({ error: 'Not available' }, { status: 404 })
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  try {
    const product = await getFirstYearProduct()
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: product.name, description: product.description },
          unit_amount: product.priceCents,
        },
        quantity: 1,
      }],
      shipping_address_collection: { allowed_countries: ['US'] },
      phone_number_collection: { enabled: true },
      allow_promotion_codes: true,
      success_url: `${baseUrl}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/the-first-year`,
      metadata: { first_year: '1', set_product_id: product.id },
    })
    return NextResponse.json({ url: session.url })
  } catch (e) {
    console.error('First Year checkout error:', e)
    return NextResponse.json({ error: 'Could not start checkout' }, { status: 500 })
  }
}
