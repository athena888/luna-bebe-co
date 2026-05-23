import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const [galleryRes, overridesRes] = await Promise.all([
    supabaseAdmin
      .from('product_gallery')
      .select('product_id, image_url, is_primary, sort_order')
      .order('sort_order'),
    supabaseAdmin
      .from('product_overrides')
      .select('product_id, hover_video'),
  ])

  const result: Record<string, { image?: string; video?: string }> = {}

  // Group gallery images by product_id, pick the first non-primary image as hover
  const byProduct = new Map<string, typeof galleryRes.data>()
  for (const row of galleryRes.data ?? []) {
    if (!byProduct.has(row.product_id)) byProduct.set(row.product_id, [])
    byProduct.get(row.product_id)!.push(row)
  }
  for (const [productId, images] of byProduct) {
    const nonPrimary = images.find(img => !img.is_primary)
    if (nonPrimary) {
      result[productId] = { image: nonPrimary.image_url }
    }
  }

  // Merge hover_video from overrides
  for (const row of overridesRes.data ?? []) {
    if (row.hover_video) {
      result[row.product_id] = { ...(result[row.product_id] ?? {}), video: row.hover_video }
    }
  }

  return NextResponse.json({ hover: result })
}
