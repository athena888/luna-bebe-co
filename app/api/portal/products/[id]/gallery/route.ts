import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = await supabaseAdmin
    .from('product_gallery')
    .select('*')
    .eq('product_id', id)
    .order('sort_order')

  if (error) return NextResponse.json({ error: 'Failed to fetch gallery' }, { status: 500 })
  return NextResponse.json({ gallery: data })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const label = formData.get('label') as string | null
  const setPrimary = formData.get('primary') === 'true'

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
    return NextResponse.json({ error: 'Only JPG, PNG, or WebP allowed' }, { status: 400 })
  }

  const buffer = await file.arrayBuffer()

  // If setting as primary, write to the main product-images bucket too
  // so the customer build page picks it up automatically
  if (setPrimary) {
    const { error: primaryErr } = await supabaseAdmin.storage
      .from('product-images')
      .upload(`${id}.jpg`, buffer, { contentType: file.type, upsert: true })
    if (primaryErr) {
      console.error('Primary upload error:', primaryErr)
      return NextResponse.json({ error: `Storage error: ${primaryErr.message}` }, { status: 500 })
    }
  }

  // Upload to gallery bucket with unique name
  const galleryFileName = `${id}-${Date.now()}.${ext}`
  const { error: uploadError } = await supabaseAdmin.storage
    .from('product-images')
    .upload(galleryFileName, buffer, { contentType: file.type, upsert: false })

  if (uploadError) {
    console.error('Gallery upload error:', uploadError)
    return NextResponse.json({ error: `Storage error: ${uploadError.message}` }, { status: 500 })
  }

  const { data: urlData } = supabaseAdmin.storage.from('product-images').getPublicUrl(galleryFileName)
  const imageUrl = urlData.publicUrl

  // If setting as primary, clear existing primary flag
  if (setPrimary) {
    await supabaseAdmin
      .from('product_gallery')
      .update({ is_primary: false })
      .eq('product_id', id)
  }

  // Get current max sort_order
  const { data: existing } = await supabaseAdmin
    .from('product_gallery')
    .select('sort_order')
    .eq('product_id', id)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = ((existing?.[0]?.sort_order) ?? -1) + 1

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('product_gallery')
    .insert({ product_id: id, image_url: imageUrl, label, is_primary: setPrimary, sort_order: nextOrder })
    .select()
    .single()

  if (insertError) {
    console.error('Gallery insert error:', insertError)
    return NextResponse.json({ error: `Database error: ${insertError.message}` }, { status: 500 })
  }

  // If primary, store the URL on the product so the storefront picks it up immediately
  if (setPrimary) {
    await supabaseAdmin
      .from('product_overrides')
      .upsert({ product_id: id, image: imageUrl }, { onConflict: 'product_id' })
    await supabaseAdmin
      .from('products')
      .update({ image: imageUrl })
      .eq('id', id)
  }

  return NextResponse.json({ image: inserted })
}
