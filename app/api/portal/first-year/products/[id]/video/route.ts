import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getFirstYearProductRow, updateFirstYearProduct } from '@/lib/first-year-products'

export const dynamic = 'force-dynamic'

const BUCKET = 'product-images'

// Upload/replace a First Year product's short video.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const row = await getFirstYearProductRow(id)
  if (!row) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'mp4'
  if (!['mp4', 'webm', 'mov'].includes(ext)) {
    return NextResponse.json({ error: 'Only MP4, WebM, or MOV allowed' }, { status: 400 })
  }

  const fileName = `first-year/${id}/video.${ext}`
  const buffer = await file.arrayBuffer()
  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(fileName, buffer, { contentType: file.type, upsert: true })
  if (error) {
    console.error('first-year video upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(fileName)
  await updateFirstYearProduct(id, { video_url: data.publicUrl })
  return NextResponse.json({ videoUrl: data.publicUrl })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const row = await getFirstYearProductRow(id)
  if (row?.video_url) {
    const path = row.video_url.split(`/${BUCKET}/`).pop()
    if (path) { try { await supabaseAdmin.storage.from(BUCKET).remove([path]) } catch { /* ignore */ } }
  }
  await updateFirstYearProduct(id, { video_url: null })
  return NextResponse.json({ ok: true })
}
