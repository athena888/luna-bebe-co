import { NextRequest, NextResponse } from 'next/server'
import { buildBoxStylePrompts } from '@/lib/openai'
import { generateImage } from '@/lib/gemini'
import { supabaseAdmin } from '@/lib/supabase'
import { getAllProducts } from '@/lib/products'

const VALID_IDS = new Set(getAllProducts().map(p => p.id))

// Rate limit: 3 requests per IP per 10 minutes (each call = 3 DALL-E images)
const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT = 3
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

function cacheKey(itemIds: string[], style: number) {
  return [...itemIds].sort().join('|') + `_s${style}`
}

async function getCached(key: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('box_image_cache')
    .select('image_url')
    .eq('cache_key', key)
    .single()
  return data?.image_url ?? null
}

async function generateAndStore(prompt: string, key: string): Promise<string> {
  const [imgBuffer] = await generateImage(prompt)
  const fileName = `${key}.png`

  const { error } = await supabaseAdmin.storage
    .from('box-previews')
    .upload(fileName, imgBuffer, { contentType: 'image/png', upsert: true })

  if (error) throw error

  const { data } = supabaseAdmin.storage.from('box-previews').getPublicUrl(fileName)
  const permanentUrl = data.publicUrl

  await supabaseAdmin
    .from('box_image_cache')
    .upsert({ cache_key: key, image_url: permanentUrl }, { onConflict: 'cache_key', ignoreDuplicates: true })

  return permanentUrl
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Too many requests. Please try again.' }, { status: 429 })
    }

    const { itemNames, itemIds }: { itemNames: string[]; itemIds: string[] } = await req.json()

    if (!itemIds?.length || !itemNames?.length) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 })
    }
    if (itemIds.length > 5 || !itemIds.every(id => VALID_IDS.has(id))) {
      return NextResponse.json({ error: 'Invalid items' }, { status: 400 })
    }

    const prompts = buildBoxStylePrompts(itemNames)
    const keys = [0, 1, 2].map(i => cacheKey(itemIds, i))

    // Check cache for all 3 styles simultaneously
    const cached = await Promise.all(keys.map(k => getCached(k)))

    // Generate any that aren't cached yet (in parallel)
    const urls = await Promise.all(
      prompts.map((prompt, i) =>
        cached[i] ? Promise.resolve(cached[i]!) : generateAndStore(prompt, keys[i])
      )
    )

    return NextResponse.json({
      options: [
        { style: 'A', label: 'Linen Flat Lay', url: urls[0] },
        { style: 'B', label: 'Inside the Box', url: urls[1] },
        { style: 'C', label: 'Marble & Botanicals', url: urls[2] },
      ]
    })
  } catch (error) {
    console.error('Box options error:', error)
    return NextResponse.json({ error: 'Failed to generate options' }, { status: 500 })
  }
}
