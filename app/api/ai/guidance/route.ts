import { NextRequest, NextResponse } from 'next/server'
import { anthropic, LUNA_SYSTEM_PROMPT } from '@/lib/anthropic'
import { getAllProducts, getProductById } from '@/lib/products'
import { rateLimitByIp } from '@/lib/rate-limit'
import type { GiftGuideAnswers } from '@/types'

export async function POST(req: NextRequest) {
  try {
    if (!await rateLimitByIp(req, 'ai_guidance', 15, 3600)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    const { answers }: { answers: GiftGuideAnswers } = await req.json()

    if (!answers) {
      return NextResponse.json({ error: 'Missing answers' }, { status: 400 })
    }

    const allProducts = getAllProducts()
    const productList = allProducts
      .map((p) => `ID: ${p.id} | Category: ${p.category} | Name: ${p.name} | Price: $${(p.price / 100).toFixed(0)} | Tag: ${p.tag || 'none'} | Description: ${p.description}`)
      .join('\n')

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: LUNA_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `You are curating a luxury baby gift box based on someone's answers. Select exactly one product per category (swaddle, garment, bath, keepsake, mom).

Customer answers:
- Relationship: ${answers.relationship}
- Style: ${answers.style}
- Budget: ${answers.budget}
- Priority: ${answers.priority}

Available products:
${productList}

Respond with ONLY valid JSON in this exact format (no markdown, no explanation before or after):
{
  "productIds": ["id1", "id2", "id3", "id4", "id5"],
  "reasoning": "A 2-3 sentence warm explanation of why you chose these items, written as Luna speaking directly to the gift-giver."
}

Select products that best match the style, budget, and priority. One product per category.`,
        },
      ],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text.trim() : '{}'

    let parsed: { productIds: string[]; reasoning: string }
    try {
      parsed = JSON.parse(responseText)
    } catch {
      return NextResponse.json({ products: [], reasoning: 'Unable to generate recommendations at this time.' })
    }

    const products = (parsed.productIds || [])
      .map((id: string) => getProductById(id))
      .filter(Boolean)

    return NextResponse.json({ products, reasoning: parsed.reasoning })
  } catch (error) {
    console.error('Guidance generation error:', error)
    return NextResponse.json({ error: 'Failed to generate recommendations' }, { status: 500 })
  }
}
