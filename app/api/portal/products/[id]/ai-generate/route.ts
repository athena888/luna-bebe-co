import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { generateImage } from '@/lib/gemini'
import { supabaseAdmin } from '@/lib/supabase'
import { getAllProducts } from '@/lib/products'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const formData = await req.formData()
    const prompt = (formData.get('prompt') as string) || ''
    const baseImage = formData.get('image') as File | null
    const babyImage = formData.get('babyImage') as File | null
    const isLifestyle = formData.get('isLifestyle') === 'true'

    const product = getAllProducts().find(p => p.id === id)
    const productName = product?.name ?? id

    let clothingDescription = ''
    let babyDescription = ''

    // Analyze clothing image with Claude Vision
    if (baseImage && baseImage.size > 0) {
      const buffer = await baseImage.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      const mimeType = (baseImage.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

      const visionRes = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType, data: base64 },
            },
            {
              type: 'text',
              text: isLifestyle
                ? 'Describe this baby clothing item in detail: style, color, fabric, and design. This will be used to generate a lifestyle photo of a baby wearing it.'
                : 'Describe this product photo in detail: the product itself, colors, textures, background, lighting style, and composition. Be specific and concise — this description will guide a new image generation.',
            },
          ],
        }],
      })

      clothingDescription = visionRes.content[0].type === 'text' ? visionRes.content[0].text : ''
    }

    // Analyze baby image with Claude Vision if provided
    if (babyImage && babyImage.size > 0) {
      const buffer = await babyImage.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      const mimeType = (babyImage.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

      const visionRes = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType, data: base64 },
            },
            {
              type: 'text',
              text: 'Describe this baby image: age/size, skin tone, any notable features. This will be used to composite the baby into a clothing lifestyle photo.',
            },
          ],
        }],
      })

      babyDescription = visionRes.content[0].type === 'text' ? visionRes.content[0].text : ''
    }

    // Build the Gemini prompt
    let geminiPrompt = ''
    if (isLifestyle && (clothingDescription || babyDescription)) {
      geminiPrompt = `Generate a lifestyle photo of a baby wearing ${productName}.
Baby details: ${babyDescription || 'newborn to 18 months, soft skin tone'}
Clothing details: ${clothingDescription}
Style: bright, airy nursery or lifestyle setting. Natural soft lighting. Warm, inviting atmosphere. Professional product photography for a luxury organic baby brand.
The baby should be clearly visible, comfortable, and the clothing should be the focus. Include soft textures like blankets or natural materials.`
    } else {
      const baseContext = `Professional product photo for "${productName}", a luxury organic baby brand. Soft natural lighting, clean minimal background, editorial style, warm neutral tones.`
      const userIntent = prompt ? `\n\nSpecific direction: ${prompt}` : ''
      const imageRef = clothingDescription ? `\n\nBase image reference: ${clothingDescription}` : ''
      geminiPrompt = `${baseContext}${userIntent}${imageRef}\n\nNo text, no logos, no people. High-end lifestyle product photography.`
    }

    const [imgBuffer] = await generateImage(geminiPrompt)

    // Upload to Supabase Storage
    const fileName = `${id}-ai-${Date.now()}.png`
    const { error: uploadError } = await supabaseAdmin.storage
      .from('product-images')
      .upload(fileName, imgBuffer, { contentType: 'image/png', upsert: false })

    const imageUrl = uploadError
      ? null
      : supabaseAdmin.storage.from('product-images').getPublicUrl(fileName).data.publicUrl

    if (!imageUrl) return NextResponse.json({ error: 'Upload failed' }, { status: 500 })

    // Save to gallery
    const { data: existing } = await supabaseAdmin
      .from('product_gallery')
      .select('sort_order')
      .eq('product_id', id)
      .order('sort_order', { ascending: false })
      .limit(1)

    const nextOrder = ((existing?.[0]?.sort_order) ?? -1) + 1

    await supabaseAdmin.from('product_gallery').insert({
      product_id: id,
      image_url: imageUrl,
      label: isLifestyle ? `Lifestyle (with baby)` : `AI Generated${prompt ? ` — ${prompt.slice(0, 40)}` : ''}`,
      is_primary: false,
      sort_order: nextOrder,
    })

    return NextResponse.json({ imageUrl, prompt: geminiPrompt })
  } catch (err) {
    console.error('AI generate error:', err)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
