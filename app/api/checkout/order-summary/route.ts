import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'
import type { Order } from '@/types'

// Minimal, read-only order summary for the confirmation page's Meta Pixel
// Purchase event — value/currency/content_ids keyed to the checkout session.
// Value comes from Stripe's amount_total (the real charged amount incl. shipping
// and any tax). eventId = order id so the browser Pixel Purchase dedupes against
// the server-side CAPI Purchase.
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id')
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    // Only surface a summary for a genuinely paid session.
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ paid: false })
    }

    const orderId = session.metadata?.order_id ?? null
    let contentIds: string[] = []
    if (orderId) {
      const { data } = await supabaseAdmin
        .from('orders').select('selected_items').eq('id', orderId).maybeSingle()
      const items = ((data as Pick<Order, 'selected_items'> | null)?.selected_items ?? []) as Array<{ id: string }>
      contentIds = items.map(i => i.id).filter(Boolean)
    }

    return NextResponse.json({
      paid: true,
      orderId,
      value: (session.amount_total ?? 0) / 100,
      currency: (session.currency ?? 'usd').toUpperCase(),
      contentIds,
      // For the Google Customer Reviews opt-in on the confirmation page.
      // Only the session_id holder (the purchaser) can reach this.
      email: session.customer_details?.email ?? null,
      createdAt: session.created ? new Date(session.created * 1000).toISOString() : null,
    })
  } catch (err) {
    console.error('Order summary error:', err)
    return NextResponse.json({ error: 'Failed to load order summary' }, { status: 500 })
  }
}
