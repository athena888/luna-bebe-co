import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendAbandonedCartEmail } from '@/lib/resend'
import { isOptedOut } from '@/lib/unsubscribe'
import type { Order } from '@/types'

// Runs once daily via Vercel Cron — 10:00 UTC (see vercel.json). The Hobby plan
// caps crons at once/day, so recovery emails go out on the next daily run rather
// than hourly; upgrade the plan and bump the schedule for faster recovery.
// Finds pending orders older than 1 hour with no email sent, sends recovery email.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

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

  const results = await Promise.allSettled(
    (orders as Order[]).map(async (order) => {
      // Opted-out addresses get marked handled without a send.
      if (await isOptedOut(order.customer_email)) {
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
    })
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  return NextResponse.json({ sent, failed })
}
