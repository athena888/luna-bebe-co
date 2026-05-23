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

  // Remove from storage
  const urlParts = image.image_url.split('/product-images/')
  if (urlParts[1]) {
    await supabaseAdmin.storage.from('product-images').remove([urlParts[1]])
  }

  await supabaseAdmin.from('product_gallery').delete().eq('id', imageId)

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

  // Download and re-upload as the primary product image
  try {
    const res = await fetch(image.image_url)
    const buffer = await res.arrayBuffer()
    await supabaseAdmin.storage
      .from('product-images')
      .upload(`${id}.jpg`, buffer, { contentType: 'image/jpeg', upsert: true })
  } catch {
    // Non-fatal — primary flag still updates
  }

  // Clear old primary, set new
  await supabaseAdmin.from('product_gallery').update({ is_primary: false }).eq('product_id', id)
  await supabaseAdmin.from('product_gallery').update({ is_primary: true }).eq('id', imageId)

  // Store primary URL directly in overrides so build page shows correct image
  await supabaseAdmin
    .from('product_overrides')
    .upsert({ product_id: id, image: image.image_url }, { onConflict: 'product_id' })

  return NextResponse.json({ ok: true })
}
