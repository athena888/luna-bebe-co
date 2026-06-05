import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const OK = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 8 * 1024 * 1024

// Upload a box photo (admin). Stored in the existing box-previews bucket.
// Returns the public URL; the editor saves it onto the box (cover or gallery).
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
    if (!OK.includes(file.type)) return NextResponse.json({ error: 'Only JPG, PNG, or WebP' }, { status: 400 })
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File too large (max 8MB)' }, { status: 400 })

    const ext = (file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
    const safe = slug.replace(/[^a-z0-9.-]/gi, '-')
    const path = `uploads/${safe}-${Date.now()}.${ext}`
    const buffer = await file.arrayBuffer()

    const { error: upErr } = await supabaseAdmin.storage.from('box-previews')
      .upload(path, buffer, { contentType: file.type, cacheControl: '31536000', upsert: true })
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

    const { data: { publicUrl } } = supabaseAdmin.storage.from('box-previews').getPublicUrl(path)
    return NextResponse.json({ url: publicUrl })
  } catch (e) {
    console.error('box upload error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
