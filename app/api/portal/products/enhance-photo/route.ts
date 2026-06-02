import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { generateImage } from '@/lib/gemini'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const mimeType = file.type || 'image/jpeg'

    // Analyze current image with Claude Vision
    const analysisResponse = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType as any, data: base64 } },
          {
            type: 'text',
            text: 'Briefly describe this product photo in 1-2 sentences. Focus on the main product and its appearance.',
          },
        ],
      }],
    })

    const productDescription = analysisResponse.content[0].type === 'text' ? analysisResponse.content[0].text : 'a product'

    // Generate enhanced version with Gemini Imagen (oat wall background)
    const enhancePrompt = `Professional product photo: ${productDescription}.
Background: Simple, natural warm oat/beige wall.
Lighting: Soft, natural.
Composition: Product centered, 1000×1250 pixels portrait.
Style: Clean, minimal, retail-quality.
Do not include text or watermarks.`

    const imageBuffers = await generateImage(enhancePrompt, 1)
    if (!imageBuffers || imageBuffers.length === 0) {
      console.error('No image buffers returned from Gemini')
      return NextResponse.json({ error: 'Image generation failed - no images returned', details: 'Gemini API returned empty result' }, { status: 500 })
    }

    const base64Image = imageBuffers[0].toString('base64')

    return NextResponse.json({
      success: true,
      imageData: `data:image/jpeg;base64,${base64Image}`,
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('Photo enhancement error:', errorMsg)
    return NextResponse.json({ error: 'Photo enhancement failed', details: errorMsg }, { status: 500 })
  }
}
