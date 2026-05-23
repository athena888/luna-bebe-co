import { NextRequest, NextResponse } from 'next/server'
import { openai, buildBoxPreviewPrompt } from '@/lib/openai'
import { supabaseAdmin } from '@/lib/supabase'
import { getAllProducts } from '@/lib/products'

function buildCacheKey(itemIds: string[]): string {
  return [...itemIds].sort().join('|')
}

// In-memory rate limiter: 5 requests per IP per 10 minutes
const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT = 5
const ipHits = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = ipHits.get(ip)
  if (!entry || now > entry.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

const VALID_IDS = new Set(getAllProducts().map(p => p.id))

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    const { itemNames, itemIds }: { itemNames: string[]; itemIds: string[] } = await req.json()

    if (!itemNames?.length || !itemIds?.length) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 })
    }

    // Max 5 items (one per category) and all IDs must be real products
    if (itemIds.length > 5 || !itemIds.every(id => VALID_IDS.has(id))) {
      return NextResponse.json({ error: 'Invalid items' }, { status: 400 })
    }

    const cacheKey = buildCacheKey(itemIds)

    // Check cache first
    const { data: cached } = await supabaseAdmin
      .from('box_image_cache')
      .select('image_url')
      .eq('cache_key', cacheKey)
      .single()

    if (cached?.image_url) {
      return NextResponse.json({ imageUrl: cached.image_url, cached: true })
    }

    // Generate new image with DALL-E 3
    const prompt = buildBoxPreviewPrompt(itemNames)
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    })

    const tempUrl = response.data[0]?.url
    if (!tempUrl) {
      return NextResponse.json({ error: 'No image generated' }, { status: 500 })
    }

    // Download the image (DALL-E URLs expire after 1 hour)
    const imgRes = await fetch(tempUrl)
    const imgBuffer = await imgRes.arrayBuffer()

    // Upload to Supabase Storage for permanent storage
    const fileName = `${cacheKey}.png`
    const { error: uploadError } = await supabaseAdmin.storage
      .from('box-previews')
      .upload(fileName, imgBuffer, {
        contentType: 'image/png',
        upsert: true,
      })

    let permanentUrl = tempUrl // fallback to temp URL if upload fails

    if (!uploadError) {
      const { data: publicUrlData } = supabaseAdmin.storage
        .from('box-previews')
        .getPublicUrl(fileName)
      permanentUrl = publicUrlData.publicUrl
    }

    // Save to cache table
    await supabaseAdmin
      .from('box_image_cache')
      .insert({ cache_key: cacheKey, image_url: permanentUrl })
      .onConflict('cache_key')
      .ignore()

    return NextResponse.json({ imageUrl: permanentUrl, cached: false })
  } catch (error) {
    console.error('Box preview generation error:', error)
    return NextResponse.json({ error: 'Failed to generate preview' }, { status: 500 })
  }
}
