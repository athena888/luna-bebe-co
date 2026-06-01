import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { invalidateCertCache } from '@/lib/certifications'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params
  const body = await req.json()
  const patch: Record<string, unknown> = {}
  if (body.name !== undefined) patch.name = body.name
  if (body.full_name !== undefined) patch.full_name = body.full_name
  if (body.blurb !== undefined) patch.blurb = body.blurb
  if (body.region !== undefined) patch.region = body.region
  if (body.valid_until !== undefined) patch.valid_until = body.valid_until
  if (body.icon_url !== undefined) patch.icon_url = body.icon_url

  const { error } = await supabaseAdmin.from('cert_library').update(patch).eq('key', key)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  invalidateCertCache()
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params
  const { error } = await supabaseAdmin.from('cert_library').delete().eq('key', key)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  invalidateCertCache()
  return NextResponse.json({ ok: true })
}

// Upload icon image for this cert
export async function POST(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
  if (!['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext)) {
    return NextResponse.json({ error: 'PNG, JPG, WebP or SVG only' }, { status: 400 })
  }

  const buffer = await file.arrayBuffer()
  const path = `cert-icons/${key}.${ext}`
  const { error: uploadError } = await supabaseAdmin.storage
    .from('product-images').upload(path, buffer, { contentType: file.type, upsert: true })
  if (uploadError) return NextResponse.json({ error: 'Upload failed' }, { status: 500 })

  const { data } = supabaseAdmin.storage.from('product-images').getPublicUrl(path)
  const iconUrl = data.publicUrl

  await supabaseAdmin.from('cert_library').update({ icon_url: iconUrl }).eq('key', key)
  invalidateCertCache()
  return NextResponse.json({ url: iconUrl })
}
