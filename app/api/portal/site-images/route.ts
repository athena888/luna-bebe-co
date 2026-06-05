import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { SLOT_BUCKET } from '@/lib/image-slots'

const OK = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 8 * 1024 * 1024

// List all managed slot images (admin) — keyed by slot_key.
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('site_images')
    .select('slot_key, public_url, alt_text')
    .order('sort_order')
  if (error) return NextResponse.json({ images: {} }) // table may not exist yet
  const images: Record<string, { public_url: string; alt_text: string }> = {}
  for (const r of data ?? []) if (!images[r.slot_key]) images[r.slot_key] = { public_url: r.public_url, alt_text: r.alt_text }
  return NextResponse.json({ images })
}

// Upload/replace a slot image (+ alt text). Admin-guarded by middleware.
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    const slotKey = String(form.get('slotKey') ?? '')
    const altText = String(form.get('altText') ?? '').trim()

    if (!slotKey) return NextResponse.json({ error: 'slotKey required' }, { status: 400 })

    // Alt-text-only update (no new file) is allowed
    if (!file) {
      if (!altText) return NextResponse.json({ error: 'Provide a file or alt text' }, { status: 400 })
      const { error } = await supabaseAdmin.from('site_images')
        .update({ alt_text: altText, updated_at: new Date().toISOString() })
        .eq('slot_key', slotKey)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    if (!OK.includes(file.type)) return NextResponse.json({ error: 'Only JPG, PNG, or WebP' }, { status: 400 })
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File too large (max 8MB)' }, { status: 400 })

    const ext = (file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
    const safe = slotKey.replace(/[^a-z0-9.-]/gi, '-')
    const path = `slots/${safe}-${Date.now()}.${ext}`
    const buffer = await file.arrayBuffer()

    const { error: upErr } = await supabaseAdmin.storage.from(SLOT_BUCKET)
      .upload(path, buffer, { contentType: file.type, cacheControl: '31536000', upsert: true })
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

    const { data: { publicUrl } } = supabaseAdmin.storage.from(SLOT_BUCKET).getPublicUrl(path)

    // Manual upsert keyed by slot_key. The table's unique index is partial
    // (WHERE sort_order = 0), which Postgres can't use as an ON CONFLICT target,
    // so we update-or-insert explicitly instead of supabase upsert(onConflict).
    const row = { slot_key: slotKey, bucket: SLOT_BUCKET, path, public_url: publicUrl, alt_text: altText, sort_order: 0, updated_at: new Date().toISOString() }
    const { data: existing } = await supabaseAdmin
      .from('site_images').select('id').eq('slot_key', slotKey).limit(1).maybeSingle()
    const { error: dbErr } = existing
      ? await supabaseAdmin.from('site_images').update(row).eq('slot_key', slotKey)
      : await supabaseAdmin.from('site_images').insert(row)
    if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

    return NextResponse.json({ url: publicUrl })
  } catch (e) {
    console.error('site-images upload error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
