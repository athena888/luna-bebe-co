import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'mp4'
  if (!['mp4', 'webm', 'mov'].includes(ext)) {
    return NextResponse.json({ error: 'Only MP4, WebM, or MOV allowed' }, { status: 400 })
  }

  const buffer = await file.arrayBuffer()
  const fileName = `${id}-hover.${ext}`

  const { error: uploadError } = await supabaseAdmin.storage
    .from('product-images')
    .upload(fileName, buffer, { contentType: file.type, upsert: true })

  if (uploadError) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  const { data: urlData } = supabaseAdmin.storage.from('product-images').getPublicUrl(fileName)
  const videoUrl = urlData.publicUrl

  await supabaseAdmin
    .from('product_overrides')
    .upsert({ product_id: id, hover_video: videoUrl }, { onConflict: 'product_id' })

  return NextResponse.json({ videoUrl })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data } = await supabaseAdmin
    .from('product_overrides')
    .select('hover_video')
    .eq('product_id', id)
    .single()

  if (data?.hover_video) {
    const fileName = data.hover_video.split('/product-images/').pop()
    if (fileName) await supabaseAdmin.storage.from('product-images').remove([fileName])
  }

  await supabaseAdmin
    .from('product_overrides')
    .upsert({ product_id: id, hover_video: null }, { onConflict: 'product_id' })

  return NextResponse.json({ ok: true })
}
