import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const [galleryRes, overridesRes] = await Promise.all([
    supabaseAdmin
      .from('product_gallery')
      .select('product_id, image_url, is_primary, is_hover, sort_order')
      .order('sort_order'),
    supabaseAdmin
      .from('product_overrides')
      .select('product_id, hover_video'),
  ])

  const result: Record<string, { image?: string; video?: string }> = {}

  // Group gallery images by product_id, pick the first non-primary image as hover
  type GalleryRow = NonNullable<typeof galleryRes.data>[number]
  const byProduct = new Map<string, GalleryRow[]>()
  for (const row of galleryRes.data ?? []) {
    if (!byProduct.has(row.product_id)) byProduct.set(row.product_id, [])
    byProduct.get(row.product_id)!.push(row)
  }
  for (const [productId, images] of byProduct) {
    // Prefer an explicitly-chosen hover image; otherwise the first non-primary
    const chosen = images.find(img => (img as { is_hover?: boolean }).is_hover)
      ?? images.find(img => !img.is_primary)
    if (chosen) {
      result[productId] = { image: chosen.image_url }
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
