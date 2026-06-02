import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getCatalog } from '@/lib/products-db'
import { FEATURED_IDS } from '@/lib/products'

// Returns the top-selling active products based on paid orders.
// Falls back to FEATURED_IDS ordering when there aren't enough sales yet.
export async function GET() {
  try {
    const LIMIT = 8

    const [catalog, ordersRes] = await Promise.all([
      getCatalog({ activeOnly: true }),
      supabaseAdmin.from('orders').select('selected_items, status').neq('status', 'pending'),
    ])

    // Tally units sold per product id
    const unitsById = new Map<string, number>()
    for (const order of ordersRes.data ?? []) {
      const items = (order.selected_items ?? []) as Array<{ id: string }>
      for (const it of items) {
        if (!it?.id) continue
        unitsById.set(it.id, (unitsById.get(it.id) ?? 0) + 1)
      }
    }

    const catalogById = new Map(catalog.map(p => [p.id, p]))

    // Products that have actual sales, ranked by units sold
    const ranked = [...unitsById.entries()]
      .filter(([id]) => catalogById.has(id))
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => catalogById.get(id)!)

    // Fill remaining slots with featured picks, then any other active product
    const seen = new Set(ranked.map(p => p.id))
    const fallback = [
      ...FEATURED_IDS.map(id => catalogById.get(id)).filter(Boolean),
      ...catalog,
    ].filter(p => p && !seen.has(p.id)) as typeof catalog

    const bestsellers = [...ranked, ...fallback].slice(0, LIMIT)

    return NextResponse.json({ products: bestsellers })
  } catch (error) {
    console.error('Bestsellers fetch error:', error)
    return NextResponse.json({ error: 'Failed to load bestsellers' }, { status: 500 })
  }
}
