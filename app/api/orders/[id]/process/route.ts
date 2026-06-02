import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Manually advance an order to "processing" — handy for testing the Ship flow
// in dev without waiting on the Stripe webhook. Only moves pending/paid orders
// forward; never touches shipped/delivered/cancelled.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('status')
    .eq('id', id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  if (['shipped', 'delivered', 'cancelled'].includes(data.status)) {
    return NextResponse.json({ error: `Order is already ${data.status}` }, { status: 400 })
  }

  const { error: updErr } = await supabaseAdmin
    .from('orders')
    .update({ status: 'processing' })
    .eq('id', id)

  if (updErr) return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })

  return NextResponse.json({ ok: true, status: 'processing' })
}
