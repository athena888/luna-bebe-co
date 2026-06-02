import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getCatalog } from '@/lib/products-db'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

// Returns every catalog product with its photo + current variant stock,
// so the inventory review screen can show a draggable product picker.
export async function GET() {
  try {
    const [catalog, variantsRes, galleryRes] = await Promise.all([
      getCatalog({ activeOnly: false }),
      supabaseAdmin.from('product_variants').select('product_id, color, color_hex, size, quantity'),
      supabaseAdmin.from('product_gallery').select('product_id, image_url, is_primary, sort_order'),
    ])

    // Group variants + primary image by product id
    const variantsByProduct = new Map<string, Array<{ color: string; color_hex: string | null; size: string; quantity: number }>>()
    for (const v of variantsRes.data ?? []) {
      const list = variantsByProduct.get(v.product_id) ?? []
      list.push({ color: v.color, color_hex: v.color_hex, size: v.size, quantity: v.quantity })
      variantsByProduct.set(v.product_id, list)
    }

    const primaryByProduct = new Map<string, string>()
    for (const g of (galleryRes.data ?? [])) {
      if (g.is_primary && !primaryByProduct.has(g.product_id)) primaryByProduct.set(g.product_id, g.image_url)
    }

    const products = catalog.map(p => {
      const image = p.image
        || primaryByProduct.get(p.id)
        || (SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/product-images/${p.id}.jpg` : null)
      return {
        id: p.id,
        name: p.name,
        category: p.category,
        emoji: p.imageEmoji,
        image,
        variants: variantsByProduct.get(p.id) ?? [],
      }
    })

    return NextResponse.json({ products })
  } catch (error) {
    console.error('Inventory catalog error:', error)
    return NextResponse.json({ error: 'Failed to load catalog' }, { status: 500 })
  }
}
