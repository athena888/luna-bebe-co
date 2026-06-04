import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  const { id, imageId } = await params

  const { data: image } = await supabaseAdmin
    .from('product_gallery')
    .select('image_url')
    .eq('id', imageId)
    .eq('product_id', id)
    .single()

  if (!image) return NextResponse.json({ error: 'Image not found' }, { status: 404 })

  await supabaseAdmin.from('product_gallery').delete().eq('id', imageId)

  // Only remove the storage file if no other gallery row (e.g. a merged/split
  // sibling product) still references the same image — avoids breaking shared photos.
  const urlParts = image.image_url.split('/product-images/')
  if (urlParts[1]) {
    const { count } = await supabaseAdmin
      .from('product_gallery')
      .select('id', { count: 'exact', head: true })
      .eq('image_url', image.image_url)
    if ((count ?? 0) === 0) {
      await supabaseAdmin.storage.from('product-images').remove([urlParts[1]])
    }
  }

  return NextResponse.json({ ok: true })
}

// Set as primary
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  const { id, imageId } = await params

  const { data: image } = await supabaseAdmin
    .from('product_gallery')
    .select('image_url')
    .eq('id', imageId)
    .eq('product_id', id)
    .single()

  if (!image) return NextResponse.json({ error: 'Image not found' }, { status: 404 })

  // Clear old primary, set new
  await supabaseAdmin.from('product_gallery').update({ is_primary: false }).eq('product_id', id)
  await supabaseAdmin.from('product_gallery').update({ is_primary: true }).eq('id', imageId)

  // Update both products.image and product_overrides.image so the storefront
  // thumbnail (the "shortcut") matches the selected primary everywhere
  await supabaseAdmin
    .from('products')
    .update({ image: image.image_url })
    .eq('id', id)
  await supabaseAdmin
    .from('product_overrides')
    .upsert({ product_id: id, image: image.image_url }, { onConflict: 'product_id' })

  return NextResponse.json({ ok: true })
}
