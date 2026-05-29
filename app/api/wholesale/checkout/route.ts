import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import { meetsMinimumOrder, calculateDueDate, NET30_TERM_DAYS } from '@/lib/wholesale'

async function userFromAuthHeader(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice(7)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data } = await supabase.auth.getUser()
  return data.user
}

export async function POST(req: NextRequest) {
  try {
    const user = await userFromAuthHeader(req)
    if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { lineItems, subtotal, total, paymentMethod, poNumber, shippingAddress } = body

    if (!Array.isArray(lineItems) || !lineItems.length) {
      return NextResponse.json({ error: 'Empty order' }, { status: 400 })
    }

    const { data: account } = await supabaseAdmin
      .from('wholesale_accounts')
      .select('*')
      .ilike('contact_email', user.email)
      .maybeSingle()

    if (!account || account.status !== 'approved') {
      return NextResponse.json({ error: 'Account not approved' }, { status: 403 })
    }

    if (!meetsMinimumOrder(subtotal, account.tier)) {
      return NextResponse.json({ error: 'Order below minimum for your tier' }, { status: 400 })
    }

    if (paymentMethod === 'net30' && account.payment_terms !== 'net30') {
      return NextResponse.json({ error: 'NET-30 not enabled for your account' }, { status: 403 })
    }

    const dueAt = paymentMethod === 'net30' ? calculateDueDate().toISOString() : null

    const { data: order, error: orderError } = await supabaseAdmin
      .from('wholesale_orders')
      .insert({
        account_id: account.id,
        po_number: poNumber || null,
        line_items: lineItems,
        subtotal,
        shipping: 0,
        tax: 0,
        total,
        tier_at_order: account.tier,
        payment_method: paymentMethod,
        payment_status: 'pending',
        shipping_address: shippingAddress,
        status: 'pending',
        due_at: dueAt,
      })
      .select()
      .single()

    if (orderError || !order) {
      console.error('Wholesale order error:', orderError)
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

    if (paymentMethod === 'card') {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: account.contact_email,
        line_items: lineItems.map((l: { product_name: string; unit_price: number; quantity: number }) => ({
          price_data: {
            currency: 'usd',
            product_data: { name: `${l.product_name} (wholesale)` },
            unit_amount: l.unit_price,
          },
          quantity: l.quantity,
        })),
        success_url: `${baseUrl}/wholesale/dashboard?success=1`,
        cancel_url: `${baseUrl}/wholesale/dashboard?cancelled=1`,
        metadata: { wholesale_order_id: order.id, type: 'wholesale_order' },
      })

      await supabaseAdmin
        .from('wholesale_orders')
        .update({ stripe_payment_intent: session.id })
        .eq('id', order.id)

      return NextResponse.json({ url: session.url })
    }

    // NET-30: create Stripe invoice
    let customerId = account.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: account.contact_email,
        name: account.business_name,
        metadata: { wholesale_account_id: account.id },
      })
      customerId = customer.id
      await supabaseAdmin.from('wholesale_accounts').update({ stripe_customer_id: customerId }).eq('id', account.id)
    }

    const invoice = await stripe.invoices.create({
      customer: customerId,
      collection_method: 'send_invoice',
      days_until_due: NET30_TERM_DAYS,
      metadata: { wholesale_order_id: order.id, po_number: poNumber || '' },
    })

    for (const l of lineItems) {
      await stripe.invoiceItems.create({
        customer: customerId,
        invoice: invoice.id,
        amount: l.line_total,
        currency: 'usd',
        description: `${l.product_name} × ${l.quantity}`,
      })
    }

    if (!invoice.id) {
      return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 })
    }
    const finalized = await stripe.invoices.finalizeInvoice(invoice.id)
    if (finalized.id) await stripe.invoices.sendInvoice(finalized.id)

    await supabaseAdmin
      .from('wholesale_orders')
      .update({ stripe_invoice_id: invoice.id, status: 'processing' })
      .eq('id', order.id)

    return NextResponse.json({ ok: true, invoiceUrl: finalized.hosted_invoice_url })
  } catch (err) {
    console.error('Wholesale checkout error:', err)
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 })
  }
}
