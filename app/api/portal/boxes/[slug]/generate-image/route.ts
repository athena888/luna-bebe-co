import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { generateImage } from '@/lib/gemini'
import { supabaseAdmin } from '@/lib/supabase'
import { getBox, updateBox } from '@/lib/prebuilt-boxes-db'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const box = await getBox(slug)
  if (!box) return NextResponse.json({ error: 'Box not found' }, { status: 404 })

  // Collect product images from all 7 slots
  const products = Object.values(box.selection).filter(Boolean) as Array<{ name: string; image?: string; imageEmoji: string }>
  const productImages = products.filter(p => p.image).map(p => ({ name: p.name, url: p.image! }))

  // Describe the products visually using Claude Vision on their actual images
  let productDescriptions = products.map(p => p.name).join(', ')

  if (productImages.length > 0) {
    try {
      const imageBlocks: Anthropic.ImageBlockParam[] = []
      for (const { url } of productImages.slice(0, 4)) {
        const res = await fetch(url)
        if (!res.ok) continue
        const buf = await res.arrayBuffer()
        const b64 = Buffer.from(buf).toString('base64')
        const ct = res.headers.get('content-type') || 'image/jpeg'
        const mt = ct.startsWith('image/png') ? 'image/png' : ct.startsWith('image/webp') ? 'image/webp' : 'image/jpeg'
        imageBlocks.push({ type: 'image', source: { type: 'base64', media_type: mt, data: b64 } })
      }

      if (imageBlocks.length > 0) {
        const visionRes = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 400,
          messages: [{
            role: 'user',
            content: [
              ...imageBlocks,
              {
                type: 'text',
                text: `These are photos of luxury organic baby products that go inside a gift box. Describe each item briefly in terms of its color, texture, and material — focus on what makes them visually beautiful and organic. Be specific, 1 sentence per item. Return just the descriptions, one per line.`,
              },
            ],
          }],
        })
        const desc = visionRes.content[0].type === 'text' ? visionRes.content[0].text.trim() : ''
        if (desc) productDescriptions = desc
      }
    } catch { /* fall back to product names */ }
  }

  // Build the Gemini Imagen prompt
  const prompt = `Ultra-realistic lifestyle product photography for a luxury organic French baby gift box brand called Petite Lavande.

Scene: A beautiful white magnetic gift box with lid slightly open or beside it, set on aged linen or stone surface with natural light. Inside and around the box are these organic baby products arranged naturally:

${productDescriptions}

Style requirements:
- Ultra-high resolution, photorealistic, editorial quality
- NOT too perfect or organized — items placed with gentle, natural imperfection as if just unwrapped
- Warm, soft natural light from a window, subtle shadows
- Organic French aesthetic: raw linen, dried lavender sprigs, dried flowers, soft neutral palette (cream, sand, dusty rose, sage)
- A few delicate props: a small sprig of dried lavender, a wax seal, a satin ribbon loosely coiled
- The box itself should be elegant white with subtle texture — premium magnetic closure
- No text, no logos, no people, no hands
- Mood: quiet luxury, slow living, a gift worth cherishing`

  try {
    const [imageBuffer] = await generateImage(prompt, 1)

    // Upload to Supabase
    const fileName = `box-previews/${slug}-assembled-${Date.now()}.jpg`
    await supabaseAdmin.storage.from('product-images').upload(fileName, imageBuffer, {
      contentType: 'image/jpeg', upsert: true,
    })
    const { data: urlData } = supabaseAdmin.storage.from('product-images').getPublicUrl(fileName)
    const imageUrl = urlData.publicUrl

    // Save on the box record
    await updateBox(slug, { image: imageUrl })

    return NextResponse.json({ imageUrl, prompt })
  } catch (error) {
    console.error('Box image generation error:', error)
    const msg = error instanceof Error ? error.message : 'Generation failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
