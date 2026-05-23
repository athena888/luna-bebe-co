import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { email, reference } = await req.json()
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

    const query = supabaseAdmin
      .from('orders')
      .select('id, status, created_at, total_amount, shipping_type, recipient_name, tracking_number, tracking_url, selected_items, shipping_address')
      .ilike('customer_email', email.trim())
      .order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('Track order error:', error)
      return NextResponse.json({ error: 'Failed to look up orders' }, { status: 500 })
    }

    let orders = data || []

    // If reference provided, filter to that specific order
    if (reference) {
      const ref = reference.trim().toUpperCase()
      orders = orders.filter(o => o.id.slice(-8).toUpperCase() === ref || o.id.toUpperCase().includes(ref))
    }

    return NextResponse.json({ orders: orders.slice(0, 5) })
  } catch (err) {
    console.error('Track route error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
