import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendShippingNotificationEmail } from '@/lib/resend'
import type { Order } from '@/types'

// Manual tracking entry (Emily 2026-09-02): a box shipped outside Shippo —
// label bought at the counter, a re-ship, a courier hand-off — still needs
// its tracking number on the order so /track, the shipped email and the
// review-ask flow all work. Same first-transition side effects as the Shippo
// ship route; editing the number on an already-shipped order only saves it
// (no second email, no second review ask). Protected by the portal-session
// middleware like every /api/orders/* route.

// A USPS-shaped number gets the real USPS link; anything else (UPS, FedEx,
// courier refs) is saved without a URL rather than pointed at the wrong
// carrier — /track and the email both cope with a missing link.
function trackingUrlFor(num: string): string | null {
  return /^(9[0-9]{15,25}|[A-Z]{2}[0-9]{9}US)$/i.test(num)
    ? `https://tools.usps.com/go/TrackConfirmAction?tLabels=${num}`
    : null
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let raw = ''
  try {
    const body = await req.json()
    raw = String(body?.trackingNumber ?? '')
  } catch { /* falls through to validation */ }
  const trackingNumber = raw.replace(/\s+/g, '').toUpperCase()
  if (!/^[A-Z0-9-]{8,40}$/.test(trackingNumber)) {
    return NextResponse.json({ error: 'Enter a tracking number (8–40 letters/digits).' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin.from('orders').select('*').eq('id', id).single()
  if (error || !data) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  const order = data as Order

  if (order.status === 'cancelled' || order.status === 'refunded') {
    return NextResponse.json({ error: `Order is ${order.status} — add tracking is disabled.` }, { status: 400 })
  }

  const firstShip = order.status !== 'shipped' && order.status !== 'delivered'
  const trackingUrl = trackingUrlFor(trackingNumber)

  const { error: upErr } = await supabaseAdmin
    .from('orders')
    .update({
      tracking_number: trackingNumber,
      tracking_url: trackingUrl,
      ...(firstShip ? { status: 'shipped' } : {}),
    })
    .eq('id', id)
  if (upErr) return NextResponse.json({ error: `Save failed: ${upErr.message}` }, { status: 500 })

  if (firstShip) {
    // Mirror of the Shippo route's first-transition hooks, all fail-soft.
    try {
      const { schedulePostPurchaseReview } = await import('@/lib/email-flows')
      await schedulePostPurchaseReview(order.id, order.customer_email)
    } catch (e) {
      console.error('Post-purchase scheduling failed:', e)
    }
    try {
      const { sendGiftNoteIfDue } = await import('@/lib/gift-note')
      await sendGiftNoteIfDue(id)
    } catch (e) {
      console.warn('gift note skipped:', e)
    }
    await sendShippingNotificationEmail({
      locale: (order as { locale?: string }).locale === 'es' ? 'es' : 'en',
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      recipientName: order.recipient_name,
      trackingNumber,
      trackingUrl: trackingUrl ?? undefined,
    }).catch(err => console.error('Shipping notification email error:', err))
  }

  return NextResponse.json({ trackingNumber, trackingUrl, shipped: firstShip })
}
