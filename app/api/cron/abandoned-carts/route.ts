import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendAbandonedCartEmail } from '@/lib/resend'
import { isOptedOut } from '@/lib/unsubscribe'
import { storeCheckoutEnabled } from '@/lib/store-flags'
import type { Order } from '@/types'

// Runs once daily via Vercel Cron — 10:00 UTC (see vercel.json). The Hobby plan
// caps crons at once/day, so recovery emails go out on the next daily run rather
// than hourly; upgrade the plan and bump the schedule for faster recovery.
//
// Sequence (Build 1 upgrade): touch 1 here for pending orders >1h old, and —
// while CART_SEQUENCE_ACTIVE — touch 2 queued into email_events at D+3, which
// only sends if the cart is still pending.
const DAY = 24 * 60 * 60 * 1000

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // While checkout is paused, "complete your order" would dead-end — hold
  // everything unmarked; the first run after reopening picks carts back up.
  if (!storeCheckoutEnabled()) {
    return NextResponse.json({ sent: 0, failed: 0, held: true })
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const staleCutoff = new Date(Date.now() - 14 * DAY).toISOString()

  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('status', 'pending')
    .eq('abandoned_cart_email_sent', false)
    .lt('created_at', oneHourAgo)

  if (error) {
    console.error('Abandoned cart query error:', error)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  const sequenceOn = process.env.CART_SEQUENCE_ACTIVE === 'true'

  const results = await Promise.allSettled(
    (orders as Order[]).map(async (order) => {
      // Stale carts (>14 days — e.g. accumulated while the store was closed)
      // and opted-out addresses get marked handled without a send.
      if (order.created_at < staleCutoff || await isOptedOut(order.customer_email)) {
        await supabaseAdmin.from('orders').update({ abandoned_cart_email_sent: true }).eq('id', order.id)
        return
      }
      await sendAbandonedCartEmail({
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        orderId: order.id,
      })
      await supabaseAdmin
        .from('orders')
        .update({ abandoned_cart_email_sent: true })
        .eq('id', order.id)

      // Touch 2 at D+3 — the queue's dispatch re-checks the order is still
      // pending, and cancels instead of sending otherwise.
      if (sequenceOn) {
        const { data: existing } = await supabaseAdmin
          .from('email_events').select('id').eq('order_id', order.id).eq('flow', 'cart').limit(1)
        if (!existing?.length) {
          await supabaseAdmin.from('email_events').insert({
            flow: 'cart', step: 2, recipient: order.customer_email.trim().toLowerCase(),
            order_id: order.id, template: 'cart-2',
            scheduled_at: new Date(Date.now() + 3 * DAY).toISOString(),
          })
        }
      }
    })
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  return NextResponse.json({ sent, failed, sequenceOn })
}
