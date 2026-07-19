import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getCatalog } from '@/lib/products-db'

// Unit economics data for Portal → Analytics → Unit Economics.
// GET returns the catalog + saved cost rows (+ a suggested landed cost from
// variant unit prices); PUT upserts one sku/channel cost row.

export async function GET() {
  try {
    const products = (await getCatalog({ activeOnly: true })).map(p => ({
      id: p.id, name: p.name, price: p.price, category: p.category,
    }))

    let econ: unknown[] = []
    try {
      const { data } = await supabaseAdmin.from('sku_economics').select('*')
      econ = data ?? []
    } catch { /* §31 not run yet — page shows a notice */ }

    // Suggested landed cost = average variant unit_price (the inventory pages
    // already treat unit_price as cost).
    const { data: variants } = await supabaseAdmin
      .from('product_variants')
      .select('product_id, unit_price')
      .not('unit_price', 'is', null)
    const costAgg = new Map<string, { sum: number; n: number }>()
    for (const v of variants ?? []) {
      const agg = costAgg.get(v.product_id) ?? { sum: 0, n: 0 }
      agg.sum += Number(v.unit_price) || 0
      agg.n += 1
      costAgg.set(v.product_id, agg)
    }
    const suggestedCost: Record<string, number> = {}
    for (const [id, { sum, n }] of costAgg) suggestedCost[id] = Math.round(sum / n)

    return NextResponse.json({ products, econ, suggestedCost })
  } catch (error) {
    console.error('Economics GET error:', error)
    return NextResponse.json({ error: 'Failed to load economics' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { sku_id, channel, retail_price, landed_cost, packaging_cost, fulfillment_cost } = await req.json()
    if (!sku_id || !['site', 'etsy'].includes(channel)) {
      return NextResponse.json({ error: 'sku_id and channel (site|etsy) required' }, { status: 400 })
    }
    const cents = (v: unknown) => Math.max(0, Math.round(Number(v) || 0))
    const { error } = await supabaseAdmin.from('sku_economics').upsert({
      sku_id,
      channel,
      retail_price: retail_price == null ? null : cents(retail_price),
      landed_cost: cents(landed_cost),
      packaging_cost: cents(packaging_cost),
      fulfillment_cost: cents(fulfillment_cost),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'sku_id,channel' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
}
