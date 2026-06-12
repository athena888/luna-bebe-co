import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getCardStyles } from '@/lib/card-styles'

const OK = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 8 * 1024 * 1024
const BUCKET = 'home-images' // reuse the existing public bucket

// List all card styles (admin).
export async function GET() {
  const styles = await getCardStyles(false)
  return NextResponse.json({ styles })
}

// Create or update a card style. Multipart: id?, name, sizeLabel, wordLimit,
// altText, active, sortOrder, file?
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const id = String(form.get('id') ?? '').trim()
    const name = String(form.get('name') ?? '').trim()
    const sizeLabel = String(form.get('sizeLabel') ?? '').trim()
    const altText = String(form.get('altText') ?? '').trim()
    const wordLimit = parseInt(String(form.get('wordLimit') ?? '100'), 10) || 100
    const sortOrder = parseInt(String(form.get('sortOrder') ?? '0'), 10) || 0
    const active = String(form.get('active') ?? 'true') !== 'false'
    const file = form.get('file') as File | null

    // Optional auto-detected placement/styling (JSON). Stored in card_styles.meta
    // (jsonb) — silently ignored if that column hasn't been migrated yet.
    let meta: unknown = undefined
    const metaRaw = String(form.get('meta') ?? '').trim()
    if (metaRaw) { try { meta = JSON.parse(metaRaw) } catch { /* ignore bad json */ } }

    let imageUrl = String(form.get('imageUrl') ?? '').trim()

    if (file) {
      if (!OK.includes(file.type)) return NextResponse.json({ error: 'Only JPG, PNG, or WebP' }, { status: 400 })
      if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File too large (max 8MB)' }, { status: 400 })
      const ext = (file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
      const path = `card-styles/${Date.now()}.${ext}`
      const buffer = await file.arrayBuffer()
      const { error: upErr } = await supabaseAdmin.storage.from(BUCKET)
        .upload(path, buffer, { contentType: file.type, cacheControl: '31536000', upsert: true })
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })
      imageUrl = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
    }

    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    // Writes the row; if `meta` errors because the column hasn't been migrated
    // yet, retries once without it so card saving never breaks.
    async function write(row: Record<string, unknown>, withMeta: boolean) {
      const payload = withMeta && meta !== undefined ? { ...row, meta } : row
      return id
        ? await supabaseAdmin.from('card_styles').update(payload).eq('id', id)
        : await supabaseAdmin.from('card_styles').insert(payload)
    }

    if (id) {
      const patch: Record<string, unknown> = { name, size_label: sizeLabel, alt_text: altText, word_limit: wordLimit, sort_order: sortOrder, active }
      if (imageUrl) patch.image_url = imageUrl
      let { error } = await write(patch, true)
      if (error && /meta/i.test(error.message)) ({ error } = await write(patch, false))
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    if (!imageUrl) return NextResponse.json({ error: 'An image is required' }, { status: 400 })
    const insertRow = { name, image_url: imageUrl, alt_text: altText, size_label: sizeLabel, word_limit: wordLimit, sort_order: sortOrder, active }
    let { error } = await write(insertRow, true)
    if (error && /meta/i.test(error.message)) ({ error } = await write(insertRow, false))
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('card-styles POST error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await supabaseAdmin.from('card_styles').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
