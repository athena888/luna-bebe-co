import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Photo for a manually-entered review (portal-authed). Client resizes before
// upload; stored in the PUBLIC review-images bucket → { url }.
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 })
    if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: 'Max 8MB' }, { status: 400 })
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
    const path = `manual/${Date.now()}.${ext}`
    const buf = Buffer.from(await file.arrayBuffer())
    const { error } = await supabaseAdmin.storage.from('review-images')
      .upload(path, buf, { contentType: file.type || 'image/jpeg', upsert: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const { data } = supabaseAdmin.storage.from('review-images').getPublicUrl(path)
    return NextResponse.json({ url: data.publicUrl })
  } catch (e) {
    console.error('review image upload error:', e)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
