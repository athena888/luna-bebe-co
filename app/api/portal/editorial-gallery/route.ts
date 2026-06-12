import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const SLOT_KEY = 'home.editorial'
const BUCKET = 'home-images'

function mediaType(url: string): 'video' | 'image' {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url) ? 'video' : 'image'
}

export async function GET() {
  const { data } = await supabaseAdmin
    .from('site_images')
    .select('id, public_url, sort_order')
    .eq('slot_key', SLOT_KEY)
    .order('sort_order')
  return NextResponse.json({
    items: (data ?? []).map(r => ({ id: r.id, url: r.public_url, type: mediaType(r.public_url) })),
  })
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 })

    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    const allowed = ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'mov', 'webm']
    if (!allowed.includes(ext)) {
      return NextResponse.json({ error: 'Only JPG, PNG, WebP, MP4, MOV, or WebM' }, { status: 400 })
    }

    const { data: existing } = await supabaseAdmin
      .from('site_images').select('sort_order').eq('slot_key', SLOT_KEY).order('sort_order')
    const next = (existing?.length ? Math.max(...existing.map(r => r.sort_order)) : 0) + 1

    const path = `editorial/${Date.now()}.${ext}`
    const buf = await file.arrayBuffer()
    const { error: upErr } = await supabaseAdmin.storage
      .from(BUCKET).upload(path, buf, { contentType: file.type, upsert: true })
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

    const pub = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
    const { data: row, error: insErr } = await supabaseAdmin
      .from('site_images')
      .insert({ slot_key: SLOT_KEY, bucket: BUCKET, path, public_url: pub, alt_text: '', sort_order: next })
      .select('id').single()
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

    return NextResponse.json({ id: row.id, url: pub })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const { order } = await req.json() as { order: string[] }
  if (!Array.isArray(order)) return NextResponse.json({ error: 'order[] required' }, { status: 400 })
  for (let i = 0; i < order.length; i++) {
    await supabaseAdmin.from('site_images').update({ sort_order: i + 1 }).eq('id', order[i])
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json() as { id: string }
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { data: row } = await supabaseAdmin.from('site_images').select('bucket, path').eq('id', id).maybeSingle()
  if (row?.path) {
    try { await supabaseAdmin.storage.from(row.bucket || BUCKET).remove([row.path]) } catch { /* ignore */ }
  }
  const { error } = await supabaseAdmin.from('site_images').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
