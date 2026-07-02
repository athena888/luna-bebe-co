import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getCatalog } from '@/lib/products-db'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

// One row per product variant with photo, color/style/size, qty, sell, cost,
// and the sell÷cost value ratio — for the printable stock report.
//
// Only *admin-verified* products appear: the variant's product must exist in the
// catalog, be published (active), and not be flagged "needs review". Unconfirmed
// imports (which land as needs_review drafts) and variants whose product_id has
// no matching product (so they'd print as a raw id) are filtered out.
export async function GET() {
  try {
    const [catalog, variantsRes, galleryRes] = await Promise.all([
      getCatalog({ activeOnly: false }),
      supabaseAdmin.from('product_variants').select('id, product_id, color, color_code, color_hex, style, size, quantity, unit_price'),
      supabaseAdmin.from('product_gallery').select('product_id, image_url, is_primary'),
    ])

    const byId = new Map(catalog.map(p => [p.id, p]))
    const primary = new Map<string, string>()
    for (const g of galleryRes.data ?? []) {
      if (g.is_primary && !primary.has(g.product_id)) primary.set(g.product_id, g.image_url)
    }

    const rows = (variantsRes.data ?? [])
      .map(v => {
        const p = byId.get(v.product_id)
        // Skip unverified / improperly-named variants: no product row, unpublished
        // draft, or still flagged for admin review.
        if (!p || !p.active || p.needs_review) return null
        const image = p.image
          || primary.get(v.product_id)
          || (SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/product-images/${v.product_id}.jpg` : null)
        const sell = p.price ?? 0            // cents
        const cost = v.unit_price ?? 0       // cents
        return {
          id: v.id,
          productId: v.product_id,
          name: p.name,
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
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => a.name.localeCompare(b.name) || a.color.localeCompare(b.color) || a.size.localeCompare(b.size))

    return NextResponse.json({ rows })
  } catch (error) {
    console.error('Stock report error:', error)
    return NextResponse.json({ error: 'Failed to build stock report' }, { status: 500 })
  }
}

// Update a single variant's per-unit cost (dollars → cents). The sell÷cost ratio
// is recomputed client-side from the product's retail price.
export async function PATCH(req: Request) {
  try {
    const { variantId, unitPrice } = await req.json() as { variantId?: string; unitPrice?: number | string | null }
    if (!variantId) {
      return NextResponse.json({ error: 'variantId required' }, { status: 400 })
    }
    const n = unitPrice === '' || unitPrice == null ? null : Number(unitPrice)
    const cents = n != null && !isNaN(n) && n >= 0 ? Math.round(n * 100) : null
    const { error } = await supabaseAdmin
      .from('product_variants')
      .update({ unit_price: cents })
      .eq('id', variantId)
    if (error) throw error
    return NextResponse.json({ ok: true, cost: cents ?? 0 })
  } catch (error) {
    console.error('Stock report cost update error:', error)
    return NextResponse.json({ error: 'Failed to update cost' }, { status: 500 })
  }
}
