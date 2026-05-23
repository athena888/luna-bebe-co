import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createShippingLabel } from '@/lib/shippo'
import { sendOrderConfirmationEmail } from '@/lib/resend'
import type { Order } from '@/types'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

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
    })
  } catch (err) {
    console.error('Shippo label error:', err)
    return NextResponse.json({ error: 'Failed to create shipping label' }, { status: 500 })
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

  // Send shipping confirmation email
  await sendOrderConfirmationEmail({
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    orderId: order.id,
    recipientName: order.recipient_name,
    total: order.total_amount,
    trackingNumber: label.trackingNumber,
    trackingUrl: label.trackingUrl,
  }).catch(err => console.error('Confirmation email error:', err))

  return NextResponse.json({
    trackingNumber: label.trackingNumber,
    trackingUrl: label.trackingUrl,
    labelUrl: label.labelUrl,
  })
}
