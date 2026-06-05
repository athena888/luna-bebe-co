import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'

// Generate optimized alt text for an image using Claude vision.
// Admin-guarded by middleware (under /api/portal/*).
export async function POST(req: NextRequest) {
  try {
    const { imageUrl, context } = await req.json()
    if (!imageUrl) return NextResponse.json({ error: 'No image' }, { status: 400 })

    // Pull the image and base64-encode it for the vision request.
    const imgRes = await fetch(imageUrl)
    if (!imgRes.ok) return NextResponse.json({ error: 'Could not load image' }, { status: 400 })
    const contentType = imgRes.headers.get('content-type') || 'image/jpeg'
    const mediaType = (['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(contentType)
      ? contentType
      : 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
    const buf = Buffer.from(await imgRes.arrayBuffer())
    if (buf.byteLength > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image too large to analyze' }, { status: 400 })
    }
    const base64 = buf.toString('base64')

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 120,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          {
            type: 'text',
            text: `Write concise, descriptive alt text for this image on a luxury organic baby-gift website${context ? ` (it's used for: ${context})` : ''}. ` +
              `Describe what is actually visible — subjects, materials, colors, setting. 8–16 words. ` +
              `No "image of"/"photo of" prefix, no quotes, no trailing period. Return ONLY the alt text.`,
          },
        ],
      }],
    })

    const altText = message.content[0]?.type === 'text'
      ? message.content[0].text.trim().replace(/^["']|["']$/g, '').replace(/\.$/, '')
      : ''
    if (!altText) return NextResponse.json({ error: 'Could not generate alt text' }, { status: 500 })
    return NextResponse.json({ altText })
  } catch (e) {
    console.error('alt-suggest error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
