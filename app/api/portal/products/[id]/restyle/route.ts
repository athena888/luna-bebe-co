import { NextRequest, NextResponse } from 'next/server'
import { editImage } from '@/lib/gemini'

// The house style — soft daylight oat-muslin flat lay, garment preserved.
const STYLE_PROMPT = `Restyle this baby clothing photo into a premium flat-lay product shot, but KEEP THE GARMENT EXACTLY THE SAME — same color, fabric, texture, pattern, stripes, straps, bows, snaps, and shape. Do not redesign or recolor the clothing.

Re-stage and re-light only the scene:
- Lay the garment flat, viewed from directly overhead (top-down), with soft, natural, realistic fabric folds and a relaxed airy drape.
- Background: a soft cream / oatmeal muslin blanket with gentle natural texture.
- Lighting: soft diffused natural window light coming from the upper left, gentle soft shadows, calm and minimal.
- Add a few sparse, tasteful natural props in the corners only (not covering the garment): dried baby's breath, a cotton branch, a small wooden cloud toy, a soft knit lamb.
- Neutral muted beige and cream palette, editorial premium e-commerce quality, photorealistic, sharp focus on the garment.
- Vertical 3:4 composition.

Do NOT add any text, letters, logos, watermarks, icons, badges, tags, hangers, mannequins, or people.`

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await params
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No image provided' }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const mimeType = file.type || 'image/jpeg'

    const out = await editImage(base64, mimeType, STYLE_PROMPT)
    return NextResponse.json({ imageData: `data:image/jpeg;base64,${out.toString('base64')}` })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Restyle failed'
    console.error('Restyle error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
