import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { scoreImage } from '@/lib/cockpit-ai'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const OK = ['image/jpeg', 'image/png', 'image/webp']
const BUCKET = 'marketing-assets'

// Upload an image, score it for brand fit + craft (Claude vision), store the
// asset + verdict. Multipart: file, platform?, product?
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    const platform = String(form.get('platform') ?? 'Instagram').trim()
    const product = String(form.get('product') ?? '').trim()
    if (!file) return NextResponse.json({ error: 'No image' }, { status: 400 })
    if (!OK.includes(file.type)) return NextResponse.json({ error: 'Only JPG, PNG, or WebP' }, { status: 400 })

    const buf = Buffer.from(await file.arrayBuffer())
    if (buf.byteLength > 8 * 1024 * 1024) return NextResponse.json({ error: 'Image too large (max 8MB)' }, { status: 400 })

    const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/webp'
    const score = await scoreImage({ base64: buf.toString('base64'), mediaType, platform, product })
    if (!score) return NextResponse.json({ error: 'Could not score the image' }, { status: 502 })

    // Store the image so the verdict has a thumbnail.
    const ext = (file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
    const path = `marketing-assets/${Date.now()}.${ext}`
    let publicUrl: string | null = null
    const { error: upErr } = await supabaseAdmin.storage.from(BUCKET)
      .upload(path, buf, { contentType: file.type, cacheControl: '31536000', upsert: true })
    if (!upErr) publicUrl = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl

    const { data, error } = await supabaseAdmin.from('content_assets').insert({
      storage_path: path,
      public_url: publicUrl,
      product: product || null,
      platform: platform || null,
      brand_fit: score.brand_fit,
      craft: score.craft,
      composite: score.composite,
      color_on_brand: score.color_on_brand,
      verdict: score.verdict,
      recommended_use: score.recommended_use,
      strengths: score.strengths,
      fixes: score.fixes,
    }).select('*').maybeSingle()
    if (error) throw error

    return NextResponse.json({ ok: true, asset: data, score })
  } catch (e) {
    console.error('score-image error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
