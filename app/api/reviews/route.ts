import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get('product_id')
  if (!productId) return NextResponse.json({ error: 'product_id required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('reviews')
    .select('id, customer_name, rating, body, created_at')
    .eq('product_id', productId)
    .eq('approved', true)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reviews: data })
}

export async function POST(req: NextRequest) {
  try {
    const { product_id, customer_name, rating, body } = await req.json()

    if (!product_id || !customer_name || !rating || !body) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be 1–5' }, { status: 400 })
    }
    if (body.trim().length < 10) {
      return NextResponse.json({ error: 'Review must be at least 10 characters' }, { status: 400 })
    }

    const { error } = await supabaseAdmin.from('reviews').insert({
      product_id,
      customer_name: customer_name.trim(),
      rating,
      body: body.trim(),
      approved: false,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Review POST error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
