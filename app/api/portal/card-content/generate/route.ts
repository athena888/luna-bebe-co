import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getCardItemContents, saveCardItemContents } from '@/lib/card-content'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const { productId, name, description, ingredients, category, existing } = await req.json()
    if (!productId || !name) {
      return NextResponse.json({ error: 'productId and name required' }, { status: 400 })
    }

    // When `existing` content is supplied (the "Refine" action on an order),
    // polish what's there rather than starting over: tighten wording, fix
    // grammar, keep it accurate and on the same lines/labels where sensible.
    const hasExisting = existing && Array.isArray(existing.lines) && existing.lines.length > 0
    const prompt = hasExisting
      ? `Refine (do NOT rewrite from scratch) the inside-card details for a luxury baby/mama gift box. Keep the existing facts and structure; just tighten wording, fix grammar, and make it elegant and concise. Text prints small.

Product: ${name}
Existing content to refine:
${JSON.stringify({ lines: existing.lines, note: existing.note ?? null })}

Keep 2–4 key-value lines. Values: 1 short sentence, max 20 words. Keep a short note if one exists (under 12 words).

Respond ONLY with valid JSON:
{"lines":[{"k":"Label:","v":"value"}],"note":"short note or null"}`
      : `Write concise product details for the inside of a luxury baby/mama gift box insert card. Text prints small — keep values brief.

Product: ${name}
Category: ${category}
Description: ${description}
${ingredients ? `Ingredients/Materials: ${ingredients}` : ''}

Generate 2–4 key-value lines. Labels (1–2 words + colon): Ingredients, Material, Use, Care, Contents, Sourced, Crafted. Values: 1 short sentence, max 20 words.
Optionally add a note (1 line, under 12 words — warm or practical).

Respond ONLY with valid JSON:
{"lines":[{"k":"Label:","v":"value"}],"note":"short note or null"}`

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ error: 'AI response malformed' }, { status: 500 })

    const parsed = JSON.parse(match[0])
    const content = {
      title: name,
      lines: (parsed.lines ?? []) as { k: string; v: string }[],
      note: parsed.note && parsed.note !== 'null' ? parsed.note : undefined,
    }

    const current = await getCardItemContents()
    current[productId] = content
    await saveCardItemContents(current)

    return NextResponse.json({ content })
  } catch (e) {
    console.error('Card content generate error:', e)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
