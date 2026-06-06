import { NextRequest, NextResponse } from 'next/server'
import { anthropic, LUNA_SYSTEM_PROMPT } from '@/lib/anthropic'
import { getAllProducts, getProductById, BOX_BASE_PRICE, SHIPPING } from '@/lib/products'
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

    // The customer's budget covers the whole order, so reserve the fixed box &
    // packaging fee plus standard shipping; the rest is what we can spend on items.
    const boxFee = Math.round(BOX_BASE_PRICE / 100)
    const shipFee = Math.round(SHIPPING.standard.price / 100)
    const overhead = boxFee + shipFee

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 700,
      system: LUNA_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `You are curating a luxury baby gift box from real, in-stock products based on someone's answers.

Customer answers:
- Relationship: ${answers.relationship}
- Style: ${answers.style}
- Budget (covers items + box + shipping): ${answers.budget}
- Priority: ${answers.priority}

Pricing context: a fixed box & packaging fee of $${boxFee} plus ~$${shipFee} standard shipping is added on top of the items. So the amount available for ITEMS is the customer's budget minus about $${overhead}.

Available products (choose ONLY from these — never invent items):
${productList}

How to curate:
- The five categories are: swaddle, garment, bath, keepsake, mom.
- Aim for ONE item per category (a complete box) when the item budget allows.
- The total price of the items you pick PLUS $${overhead} must stay within the customer's budget. If money is tight, include FEWER items (skip lower-priority categories) rather than going over budget — a smaller, beautiful box is better than an over-budget one.
- If the budget is generous ("Surprise me with the best" or "$220+"), pick the strongest one-per-category set.
- Never pick two items from the same category. Match the chosen style and priority.

Respond with ONLY valid JSON (no markdown, no text before or after):
{
  "productIds": ["id", "..."],
  "reasoning": "2-3 warm sentences speaking directly to the gift-giver, noting how this fits their budget and her style."
}`,
        },
      ],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text.trim() : '{}'

    // Models sometimes wrap JSON in ```fences``` or add prose — extract the
    // object before parsing so a stray character doesn't blank the results.
    let parsed: { productIds: string[]; reasoning: string }
    try {
      const fenced = responseText.match(/```(?:json)?\s*([\s\S]*?)```/i)
      const body = fenced ? fenced[1] : responseText
      const start = body.indexOf('{')
      const end = body.lastIndexOf('}')
      const jsonStr = start >= 0 && end > start ? body.slice(start, end + 1) : body
      parsed = JSON.parse(jsonStr)
    } catch {
      return NextResponse.json({ products: [], reasoning: 'Unable to generate recommendations at this time.' })
    }

    // Resolve to real products, drop unknowns, and keep at most one per category.
    const seenCategories = new Set<string>()
    const products = (parsed.productIds || [])
      .map((id: string) => getProductById(id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .filter((p) => {
        if (seenCategories.has(p.category)) return false
        seenCategories.add(p.category)
        return true
      })
      .slice(0, 5)

    return NextResponse.json({ products, reasoning: parsed.reasoning })
  } catch (error) {
    console.error('Guidance generation error:', error)
    return NextResponse.json({ error: 'Failed to generate recommendations' }, { status: 500 })
  }
}
