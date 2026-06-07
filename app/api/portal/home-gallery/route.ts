import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const BUCKET = 'home-images'
const FOLDER = 'box-gallery'
const OK = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 8 * 1024 * 1024

// Dynamic "The Box" homepage gallery — any number of photos, add/remove.
// Stored as files under home-images/box-gallery/ (no fixed slots).
export async function GET() {
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).list(FOLDER, {
    limit: 100, sortBy: { column: 'name', order: 'asc' },
  })
  if (error) return NextResponse.json({ images: [] })
  const images = (data ?? [])
    .filter(f => f.name && !f.name.startsWith('.'))
    .map(f => ({
      path: `${FOLDER}/${f.name}`,
      url: supabaseAdmin.storage.from(BUCKET).getPublicUrl(`${FOLDER}/${f.name}`).data.publicUrl,
    }))
  return NextResponse.json({ images })
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
    if (!OK.includes(file.type)) return NextResponse.json({ error: 'Only JPG, PNG, or WebP' }, { status: 400 })
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File too large (max 8MB)' }, { status: 400 })
    const ext = (file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
    const path = `${FOLDER}/${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`
    const buffer = await file.arrayBuffer()
    const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, buffer, {
      contentType: file.type, cacheControl: '60', upsert: true,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ url: supabaseAdmin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl, path })
  } catch (e) {
    console.error('home-gallery upload error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const path = req.nextUrl.searchParams.get('path')
  if (!path || !path.startsWith(`${FOLDER}/`)) return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
  const { error } = await supabaseAdmin.storage.from(BUCKET).remove([path])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
