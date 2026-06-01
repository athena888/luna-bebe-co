import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getCatalogProduct } from '@/lib/products-db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await getCatalogProduct(id)
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  const [galleryRes, variantsRes] = await Promise.all([
    supabaseAdmin.from('product_gallery').select('*').eq('product_id', id).order('sort_order'),
    product.has_variants
      ? supabaseAdmin
          .from('product_variants')
          .select('color, color_hex, size, quantity')
          .eq('product_id', id)
          .order('color')
          .order('size')
      : Promise.resolve({ data: [] as unknown[] }),
  ])

  return NextResponse.json({
    product,
    gallery: galleryRes.data ?? [],
    variants: variantsRes.data ?? [],
  })
}
