import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Fetch product gallery images
  const { data: gallery } = await supabaseAdmin
    .from('product_gallery')
    .select('image_url, is_primary')
    .eq('product_id', id)
    .order('sort_order')
    .limit(4)

  // Also check the product's main image
  const { data: product } = await supabaseAdmin
    .from('products')
    .select('image')
    .eq('id', id)
    .maybeSingle()

  // Build list of image URLs to analyze (deduplicated)
  const urls: string[] = []
  if (product?.image) urls.push(product.image)
  for (const img of gallery ?? []) {
    if (img.image_url && !urls.includes(img.image_url)) urls.push(img.image_url)
  }

  if (urls.length === 0) {
    return NextResponse.json({ error: 'No product images found. Upload photos first, then detect colors.' }, { status: 400 })
  }

  // Fetch images and send to Claude Vision
  const imageBlocks: Anthropic.ImageBlockParam[] = []
  for (const url of urls.slice(0, 3)) {
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const buffer = await res.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      const contentType = res.headers.get('content-type') || 'image/jpeg'
      const mediaType = contentType.startsWith('image/png') ? 'image/png'
        : contentType.startsWith('image/webp') ? 'image/webp'
        : 'image/jpeg'
      imageBlocks.push({
        type: 'image',
        source: { type: 'base64', media_type: mediaType, data: base64 },
      })
    } catch { /* skip failed fetches */ }
  }

  if (imageBlocks.length === 0) {
    return NextResponse.json({ error: 'Could not load product images for analysis.' }, { status: 400 })
  }

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    messages: [{
      role: 'user',
      content: [
        ...imageBlocks,
        {
          type: 'text',
          text: `Look at these product images. Identify every distinct color variant visible — for example if a romper comes in white, khaki, dusty rose, grey-blue, those are 4 separate colors.

For each distinct color you can see:
- Give it a short human-readable name (e.g. "White", "Khaki/Sand", "Dusty Rose", "Grey-Blue", "Sage Green")
- Provide the closest matching hex code based on the color you see

Return ONLY a JSON array, no markdown:
[{"name":"White","hex":"#F5F0EB"},{"name":"Dusty Rose","hex":"#C49A8C"}]

List all colors visible across all images. If you only see one color, return one. If you see many, list all.`,
        },
      ],
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '[]'
  const clean = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')

  try {
    const colors = JSON.parse(clean)
    return NextResponse.json({ colors })
  } catch {
    return NextResponse.json({ error: 'Could not parse color detection result' }, { status: 500 })
  }
}
