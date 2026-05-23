import { NextRequest, NextResponse } from 'next/server'
import { openai } from '@/lib/openai'
import { supabaseAdmin } from '@/lib/supabase'
import { getAllProducts } from '@/lib/products'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const formData = await req.formData()
    const prompt = (formData.get('prompt') as string) || ''
    const baseImage = formData.get('image') as File | null

    const product = getAllProducts().find(p => p.id === id)
    const productName = product?.name ?? id

    let visionDescription = ''

    // If a base image was uploaded, analyze it with GPT-4o Vision
    if (baseImage && baseImage.size > 0) {
      const buffer = await baseImage.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      const mimeType = baseImage.type || 'image/jpeg'

      const visionRes = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64}` },
            },
            {
              type: 'text',
              text: 'Describe this product photo in detail: the product itself, colors, textures, background, lighting style, and composition. Be specific and concise — this description will guide a new image generation.',
            },
          ],
        }],
        max_tokens: 400,
      })

      visionDescription = visionRes.choices[0]?.message?.content ?? ''
    }

    // Build the final DALL-E prompt
    const baseContext = `Professional product photo for "${productName}", a luxury organic baby brand. Soft natural lighting, clean minimal background, editorial style, warm neutral tones.`
    const userIntent = prompt ? `\n\nSpecific direction: ${prompt}` : ''
    const imageRef = visionDescription ? `\n\nBase image reference: ${visionDescription}` : ''
    const dallePrompt = `${baseContext}${userIntent}${imageRef}\n\nNo text, no logos, no people. High-end lifestyle product photography.`

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: dallePrompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    })

    const tempUrl = response.data[0]?.url
    if (!tempUrl) return NextResponse.json({ error: 'No image generated' }, { status: 500 })

    // Download and store permanently
    const imgBuffer = await (await fetch(tempUrl)).arrayBuffer()
    const fileName = `${id}-ai-${Date.now()}.png`

    const { error: uploadError } = await supabaseAdmin.storage
      .from('product-images')
      .upload(fileName, imgBuffer, { contentType: 'image/png', upsert: false })

    const imageUrl = uploadError
      ? tempUrl // fallback to temp URL
      : supabaseAdmin.storage.from('product-images').getPublicUrl(fileName).data.publicUrl

    // Save to gallery (not primary by default — user can promote it)
    if (!uploadError) {
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
        label: `AI Generated${prompt ? ` — ${prompt.slice(0, 40)}` : ''}`,
        is_primary: false,
        sort_order: nextOrder,
      })
    }

    return NextResponse.json({ imageUrl, prompt: dallePrompt })
  } catch (err) {
    console.error('AI generate error:', err)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
