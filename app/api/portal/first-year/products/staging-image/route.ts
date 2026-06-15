import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const BUCKET = 'product-images'

// Upload one photo to a staging area (before it's grouped into a product). Returns
// its public URL. Used by the bulk "upload a pile → AI groups them" flow.
export async function POST(req: NextRequest) {
  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
    return NextResponse.json({ error: 'Only JPG, PNG, or WebP allowed' }, { status: 400 })
  }
  if (file.size > 4.3 * 1024 * 1024) {
    return NextResponse.json({ error: 'Photo too large — keep it under ~4MB.' }, { status: 400 })
  }

  const fileName = `first-year/staging/${crypto.randomUUID()}.${ext}`
  const buffer = await file.arrayBuffer()
  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(fileName, buffer, { contentType: file.type, upsert: true })
  if (error) {
    console.error('first-year staging upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(fileName)
  return NextResponse.json({ url: data.publicUrl })
}
