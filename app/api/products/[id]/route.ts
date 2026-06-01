import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getCatalogProduct } from '@/lib/products-db'
import { CERTIFICATIONS } from '@/lib/certifications'
import type { ProductCert } from '@/lib/certifications'

const BUCKET = 'product-images'

async function injectCertIcons(certs: ProductCert[]): Promise<ProductCert[]> {
  if (!certs.length) return certs
  return Promise.all(certs.map(async cert => {
    for (const ext of ['png', 'jpg', 'webp', 'svg']) {
      const path = `cert-icons/${cert.key}.${ext}`
      const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)
      try {
        const res = await fetch(data.publicUrl, { method: 'HEAD' })
        if (res.ok) return { ...cert, iconUrl: data.publicUrl }
      } catch { /* not found */ }
    }
    return cert
  }))
}

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

  const certs = await injectCertIcons((product.certifications ?? []) as ProductCert[])

  return NextResponse.json({
    product: { ...product, certifications: certs },
    gallery: galleryRes.data ?? [],
    variants: variantsRes.data ?? [],
  })
}
