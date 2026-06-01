import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { PRODUCT_TAGS } from '@/lib/product-tags'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const BRAND_GUIDE = `You write product copy for Petite Lavande — a luxury organic baby gift box company made in Seattle.

Brand voice: warm but not saccharine. Quiet, not loud. Specific, not vague. Like a trusted friend, not a salesperson. Products are 100% GOTS-certified organic where applicable, ingredients traced to source.

Description style: 1-2 short sentences. Lead with the sensory/practical benefit, then the material or detail that makes it special. No "luxury", "premium", or "curated". No urgency or sales language. Match the cadence of these examples:
- "Ultra-soft GOTS-certified organic cotton muslin. Breathable, pre-washed, and gets softer with every wash. Set of 2."
- "The midnight diaper-change hero. Expandable knotted bottom for easy access. Incredibly soft GOTS-certified cotton."
- "French lavender bath soak, organic lip balm, and a beeswax candle. For the mama who deserves a moment to herself."`

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || ''

    let userContent: Anthropic.MessageParam['content']

    if (contentType.includes('multipart/form-data')) {
      // File upload (PDF or image spec sheet)
      const formData = await req.formData()
      const file = formData.get('file') as File | null
      const keywords = (formData.get('keywords') as string) || ''
      const category = (formData.get('category') as string) || ''

      if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
      if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: 'File too large (max 20MB)' }, { status: 400 })

      const arrayBuffer = await file.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString('base64')

      const instruction = buildInstruction(category, keywords)

      if (file.type === 'application/pdf') {
        userContent = [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
          { type: 'text', text: instruction },
        ]
      } else if (file.type.startsWith('image/')) {
        userContent = [
          { type: 'image', source: { type: 'base64', media_type: file.type as 'image/jpeg' | 'image/png' | 'image/webp', data: base64 } },
          { type: 'text', text: instruction },
        ]
      } else {
        return NextResponse.json({ error: 'Please upload a PDF or image file' }, { status: 400 })
      }
    } else {
      // Keywords only (JSON body)
      const { keywords, category } = await req.json()
      if (!keywords?.trim()) {
        return NextResponse.json({ error: 'Please provide keywords or a description' }, { status: 400 })
      }
      userContent = buildInstruction(category, keywords)
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: BRAND_GUIDE,
      messages: [{ role: 'user', content: userContent }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    const clean = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    const draft = JSON.parse(clean)

    return NextResponse.json({ draft })
  } catch (error) {
    console.error('AI describe error:', error)
    const msg = error instanceof Error ? error.message : 'Generation failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

function buildInstruction(category: string, keywords: string): string {
  const categoryHint = category ? `\nThis product belongs to the "${category}" category.` : ''
  const keywordsHint = keywords?.trim() ? `\n\nProduct details/keywords provided:\n${keywords.trim()}` : ''

  return `Draft product copy for a single baby/mama product based on the information below.${categoryHint}${keywordsHint}

Return ONLY a valid JSON object, no markdown, no explanation:
{
  "name": "Product name — concise and elegant, title case",
  "ingredients": "Materials or ingredients, comma-separated (e.g. '100% Organic Cotton' or 'Calendula, Colloidal Oat, Lavender')",
  "description": "1-2 short sentences in the brand voice",
  "tag": "Choose the single most fitting tag from this list, or empty string if none fit: ${PRODUCT_TAGS.join(', ')}"
}`
}
