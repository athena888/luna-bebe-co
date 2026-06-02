import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getCatalog } from '@/lib/products-db'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

type OrderItem = { id: string; name?: string; price?: number; selectedColor?: string; selectedSize?: string }

// Inventory analytics: per-product sales history with photo, broken down by
// color, size, and month — plus current stock and 90-day velocity.
export async function GET() {
  try {
    const [catalog, ordersRes, variantsRes, galleryRes] = await Promise.all([
      getCatalog({ activeOnly: false }),
      supabaseAdmin.from('orders').select('selected_items, status, created_at').neq('status', 'pending'),
      supabaseAdmin.from('product_variants').select('product_id, color, color_hex, size, quantity, unit_price'),
      supabaseAdmin.from('product_gallery').select('product_id, image_url, is_primary'),
    ])

    // photo + cost lookups
    const primaryByProduct = new Map<string, string>()
    for (const g of galleryRes.data ?? []) {
      if (g.is_primary && !primaryByProduct.has(g.product_id)) primaryByProduct.set(g.product_id, g.image_url)
    }
    const stockByProduct = new Map<string, number>()
    const costByProduct = new Map<string, number>()   // representative unit cost (cents)
    for (const v of variantsRes.data ?? []) {
      stockByProduct.set(v.product_id, (stockByProduct.get(v.product_id) ?? 0) + (v.quantity || 0))
      if (v.unit_price != null && !costByProduct.has(v.product_id)) costByProduct.set(v.product_id, Number(v.unit_price))
    }

    const now = Date.now()
    const ninetyAgo = now - 90 * 24 * 60 * 60 * 1000

    // Aggregate sales per product
    type Agg = {
      units: number; revenue: number; units90: number
      byColor: Map<string, number>
      bySize: Map<string, number>
      byMonth: number[]   // last 12 months, index 11 = current month
      colorHex: Map<string, string>
    }
    const agg = new Map<string, Agg>()
    const fresh = (): Agg => ({ units: 0, revenue: 0, units90: 0, byColor: new Map(), bySize: new Map(), byMonth: Array(12).fill(0), colorHex: new Map() })

    for (const order of ordersRes.data ?? []) {
      const created = new Date(order.created_at).getTime()
      const monthsAgo = Math.floor((now - created) / (30.4 * 24 * 60 * 60 * 1000))
      const items = (order.selected_items ?? []) as OrderItem[]
      for (const it of items) {
        if (!it?.id) continue
        const a = agg.get(it.id) ?? fresh()
        a.units += 1
        a.revenue += it.price ?? 0
        if (created >= ninetyAgo) a.units90 += 1
        if (it.selectedColor) a.byColor.set(it.selectedColor, (a.byColor.get(it.selectedColor) ?? 0) + 1)
        if (it.selectedSize) a.bySize.set(it.selectedSize, (a.bySize.get(it.selectedSize) ?? 0) + 1)
        if (monthsAgo >= 0 && monthsAgo < 12) a.byMonth[11 - monthsAgo] += 1
        agg.set(it.id, a)
      }
    }

    const catalogById = new Map(catalog.map(p => [p.id, p]))
    // Include every product that's either in the catalog or has historical sales
    const ids = new Set<string>([...catalog.map(p => p.id), ...agg.keys()])

    const products = Array.from(ids).map(id => {
      const p = catalogById.get(id)
      const a = agg.get(id) ?? fresh()
      const image = p?.image
        || primaryByProduct.get(id)
        || (SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/product-images/${id}.jpg` : null)
      const sellPrice = p?.price ?? 0
      const cost = costByProduct.get(id) ?? 0
      const margin = sellPrice > 0 ? Math.round(((sellPrice - cost) / sellPrice) * 100) : 0
      return {
        id,
        name: p?.name ?? id,
        category: p?.category ?? 'unknown',
        image,
        inCatalog: !!p,
        currentStock: stockByProduct.get(id) ?? 0,
        sellPrice,                 // cents
        unitCost: cost,            // cents
        margin,                    // %
        units: a.units,
        units90: a.units90,
        revenue: a.revenue,        // cents
        profit: a.units * Math.max(0, sellPrice - cost), // cents (approx)
        byColor: Array.from(a.byColor.entries()).map(([color, units]) => ({ color, units })).sort((x, y) => y.units - x.units),
        bySize: Array.from(a.bySize.entries()).map(([size, units]) => ({ size, units })).sort((x, y) => y.units - x.units),
        byMonth: a.byMonth,
      }
    }).sort((x, y) => y.units - x.units)

    // current month index for labeling the 12-month series
    const d = new Date(now)
    const monthLabels = Array.from({ length: 12 }, (_, i) => MONTH_LABELS[(d.getMonth() - 11 + i + 24) % 12])

    return NextResponse.json({ products, monthLabels })
  } catch (error) {
    console.error('Inventory analytics error:', error)
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 })
  }
}
