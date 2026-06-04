import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getCatalog } from '@/lib/products-db'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

// One row per product variant with photo, color/style/size, qty, sell, cost,
// and the sell÷cost value ratio — for the printable stock report.
export async function GET() {
  try {
    const [catalog, variantsRes, galleryRes] = await Promise.all([
      getCatalog({ activeOnly: false }),
      supabaseAdmin.from('product_variants').select('product_id, color, color_code, color_hex, style, size, quantity, unit_price'),
      supabaseAdmin.from('product_gallery').select('product_id, image_url, is_primary'),
    ])

    const byId = new Map(catalog.map(p => [p.id, p]))
    const primary = new Map<string, string>()
    for (const g of galleryRes.data ?? []) {
      if (g.is_primary && !primary.has(g.product_id)) primary.set(g.product_id, g.image_url)
    }

    const rows = (variantsRes.data ?? []).map(v => {
      const p = byId.get(v.product_id)
      const image = p?.image
        || primary.get(v.product_id)
        || (SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/product-images/${v.product_id}.jpg` : null)
      const sell = p?.price ?? 0           // cents
      const cost = v.unit_price ?? 0       // cents
      return {
        productId: v.product_id,
        name: p?.name ?? v.product_id,
        image,
        color: v.color,
        color_code: v.color_code ?? '',
        color_hex: v.color_hex ?? null,
        style: v.style ?? '',
        size: v.size,
        quantity: v.quantity ?? 0,
        sell, cost,
        ratio: cost > 0 ? sell / cost : null,
      }
    }).sort((a, b) => a.name.localeCompare(b.name) || a.color.localeCompare(b.color) || a.size.localeCompare(b.size))

    return NextResponse.json({ rows })
  } catch (error) {
    console.error('Stock report error:', error)
    return NextResponse.json({ error: 'Failed to build stock report' }, { status: 500 })
  }
}
