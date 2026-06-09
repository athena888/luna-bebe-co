import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Per-slot multi-image galleries for the rotating homepage slots (hero, the two
// editorial features, the CTA background). Rows live in `site_images` under
// slot_key `home.<slot>` with sort_order 1..n. Admin-guarded by /api/portal/*.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const BUCKET = 'home-images'
const key = (slot: string) => `home.${slot}`
const legacyUrl = (slot: string) => `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${slot}.jpg`

// List a slot's gallery (ordered).
export async function GET(req: NextRequest) {
  const slot = req.nextUrl.searchParams.get('slot')
  if (!slot) return NextResponse.json({ error: 'slot required' }, { status: 400 })
  const { data, error } = await supabaseAdmin
    .from('site_images')
    .select('id, public_url, sort_order')
    .eq('slot_key', key(slot))
    .order('sort_order')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ images: (data ?? []).map(r => ({ id: r.id, url: r.public_url })) })
}

// Add a photo. On the first add, seed the legacy single image (if any) as #1 so
// nothing disappears when a slot becomes a gallery.
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    const slot = form.get('slot') as string | null
    if (!file || !slot) return NextResponse.json({ error: 'file and slot required' }, { status: 400 })

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      return NextResponse.json({ error: 'Only JPG, PNG, or WebP' }, { status: 400 })
    }

    const { data: existing } = await supabaseAdmin
      .from('site_images').select('sort_order').eq('slot_key', key(slot)).order('sort_order')
    let next = (existing?.length ? Math.max(...existing.map(r => r.sort_order)) : 0) + 1

    if (!existing?.length) {
      try {
        const head = await fetch(legacyUrl(slot), { method: 'HEAD' })
        if (head.ok) {
          await supabaseAdmin.from('site_images').insert({
            slot_key: key(slot), bucket: BUCKET, path: `${slot}.jpg`, public_url: legacyUrl(slot), alt_text: '', sort_order: next,
          })
          next += 1
        }
      } catch { /* no legacy image — fine */ }
    }

    const path = `gallery/${slot}-${Date.now()}.${ext}`
    const buf = await file.arrayBuffer()
    const { error: upErr } = await supabaseAdmin.storage.from(BUCKET).upload(path, buf, { contentType: file.type, upsert: true })
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })
    const pub = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl

    const { data: row, error: insErr } = await supabaseAdmin.from('site_images').insert({
      slot_key: key(slot), bucket: BUCKET, path, public_url: pub, alt_text: '', sort_order: next,
    }).select('id').single()
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

    return NextResponse.json({ id: row.id, url: pub })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// Reorder — body { order: string[] of row ids in desired order } (first = shown first).
export async function PATCH(req: NextRequest) {
  const { order } = await req.json() as { order: string[] }
  if (!Array.isArray(order)) return NextResponse.json({ error: 'order[] required' }, { status: 400 })
  for (let i = 0; i < order.length; i++) {
    await supabaseAdmin.from('site_images').update({ sort_order: i + 1 }).eq('id', order[i])
  }
  return NextResponse.json({ ok: true })
}

// Remove one photo — body { id }.
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
