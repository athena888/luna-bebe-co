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

  // Clear old primary, set new
  await supabaseAdmin.from('product_gallery').update({ is_primary: false }).eq('product_id', id)
  await supabaseAdmin.from('product_gallery').update({ is_primary: true }).eq('id', imageId)

  // Update products.image to use the gallery image URL
  await supabaseAdmin
    .from('products')
    .update({ image: image.image_url })
    .eq('id', id)

  return NextResponse.json({ ok: true })
}
