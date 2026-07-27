import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getCatalogProduct, getProductStock } from '@/lib/products-db'
import { resolveCerts } from '@/lib/certifications'
import type { ProductCert } from '@/lib/certifications'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await getCatalogProduct(id)
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  const [galleryRes, variantsRes] = await Promise.all([
    supabaseAdmin.from('product_gallery').select('*').eq('product_id', id).order('sort_order'),
    product.has_variants
      ? supabaseAdmin
          .from('product_variants')
          .select('color, color_hex, style, size, quantity')
          .eq('product_id', id)
          .order('color')
          .order('size')
      : Promise.resolve({ data: [] as unknown[] }),
  ])

  const certs = await resolveCerts((product.certifications ?? []) as ProductCert[])
  const stock = await getProductStock(id, product.has_variants)
  let esDescription: string | null = null
  try {
    const { getTranslations } = await import('@/lib/i18n')
    esDescription = (await getTranslations('product', [id])).get(id)?.description ?? null
  } catch { /* no translations yet */ }

  return NextResponse.json({
    product: { ...product, certifications: certs },
    stock,
    esDescription,
    gallery: galleryRes.data ?? [],
    variants: variantsRes.data ?? [],
  })
}
