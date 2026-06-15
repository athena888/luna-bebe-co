import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getFirstYearProductRow, updateFirstYearProduct } from '@/lib/first-year-products'

export const dynamic = 'force-dynamic'

const BUCKET = 'product-images'

// Add a photo to a First Year product (appends to its images[]). One file per call.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const row = await getFirstYearProductRow(id)
  if (!row) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
    return NextResponse.json({ error: 'Only JPG, PNG, or WebP allowed' }, { status: 400 })
  }

  const fileName = `first-year/${id}/${crypto.randomUUID()}.${ext}`
  const buffer = await file.arrayBuffer()
  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(fileName, buffer, { contentType: file.type, upsert: true })
  if (error) {
    console.error('first-year image upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(fileName)
  const images = [...row.images, data.publicUrl]
  await updateFirstYearProduct(id, { images })
  return NextResponse.json({ url: data.publicUrl, images })
}

// Remove one photo by its URL (body: { url }).
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const row = await getFirstYearProductRow(id)
  if (!row) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  const { url } = await req.json()
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })

  const path = String(url).split(`/${BUCKET}/`).pop()
  if (path) { try { await supabaseAdmin.storage.from(BUCKET).remove([path]) } catch { /* ignore */ } }

  const images = row.images.filter(u => u !== url)
  await updateFirstYearProduct(id, { images })
  return NextResponse.json({ ok: true, images })
}
