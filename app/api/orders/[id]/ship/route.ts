import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { CARTON_IDS } from '@/lib/packaging'
import { createShippingLabel } from '@/lib/shippo'
import { sendShippingNotificationEmail } from '@/lib/resend'
import type { Order } from '@/types'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // The portal sends the carton the box actually went into and its weighed
  // pounds. Anything unrecognised is ignored rather than rejected: a label is
  // still better bought at the defaults than not bought at all. 70 lb is the
  // USPS domestic ceiling.
  let cartonId: string | undefined
  let weightLb: number | undefined
  try {
    const body = await req.json()
    if (body && typeof body === 'object') {
      if (typeof body.cartonId === 'string' && CARTON_IDS.includes(body.cartonId)) cartonId = body.cartonId
      const w = Number(body.weightLb)
      if (Number.isFinite(w) && w > 0 && w <= 70) weightLb = w
    }
  } catch { /* no body — the defaults in lib/packaging.ts apply */ }

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  const order = data as Order

  if (order.status === 'shipped' || order.status === 'delivered') {
    return NextResponse.json({ error: 'Order already shipped' }, { status: 400 })
  }

  const addr = order.shipping_address
  let label
  try {
    label = await createShippingLabel({
      toName: addr.name,
      toStreet1: addr.line1,
      toStreet2: addr.line2,
      toCity: addr.city,
      toState: addr.state,
      toZip: addr.zip,
      toPhone: addr.phone,
      isPremium: order.shipping_type === 'premium',
      cartonId,
      weightLb,
    })
  } catch (err) {
    console.error('Shippo label error:', err)
    const message = err instanceof Error ? err.message : 'Failed to create shipping label'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  await supabaseAdmin
    .from('orders')
    .update({
      status: 'shipped',
      tracking_number: label.trackingNumber,
      tracking_url: label.trackingUrl,
      shippo_label_url: label.labelUrl,
    })
    .eq('id', id)

  // Post-purchase flow: review ask ~10 days out (sent by the daily flows cron).
  // Best-effort — works only once §31 (email_events) is run.
  try {
    const { schedulePostPurchaseReview } = await import('@/lib/email-flows')
    await schedulePostPurchaseReview(order.id, order.customer_email)
  } catch (e) {
    console.error('Post-purchase scheduling failed (email_events table ready?):', e)
  }

  // Send shipping notification email (distinct from order confirmation)
  // Build 17: recipient's one-time digital gift note (GIFTNOTE_ACTIVE-gated,
  // no-op without a recipient email). Fail-soft.
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
    trackingNumber: label.trackingNumber,
    trackingUrl: label.trackingUrl,
  }).catch(err => console.error('Shipping notification email error:', err))

  return NextResponse.json({
    trackingNumber: label.trackingNumber,
    trackingUrl: label.trackingUrl,
    labelUrl: label.labelUrl,
  })
}
