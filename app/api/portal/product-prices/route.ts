import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getPricesForProduct } from '@/lib/pricing'

// Admin-guarded by middleware (/api/portal/*). Per-currency product prices.
export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get('productId')
  if (!productId) return NextResponse.json({ prices: {} })
  return NextResponse.json({ prices: await getPricesForProduct(productId) })
}

export async function POST(req: NextRequest) {
  try {
    const { productId, currency, unitAmount, active } = await req.json()
    if (!productId || !['USD', 'GBP', 'EUR'].includes(currency)) {
      return NextResponse.json({ error: 'productId and a valid currency are required' }, { status: 400 })
    }
    const { error } = await supabaseAdmin.from('product_prices').upsert({
      product_id: productId,
      currency,
      unit_amount: Math.max(0, Math.round(Number(unitAmount) || 0)),
      active: active !== false,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'product_id,currency' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
