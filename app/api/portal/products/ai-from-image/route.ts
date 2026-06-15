import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Draft a product from uploaded screenshots/photos (e.g. a supplier listing
// showing the item + its wholesale cost). Claude vision returns copy in the brand
// voice + a suggested retail price. Admin-guarded by middleware.
const SYSTEM = `You are a product copywriter and pricing assistant for Petite Lavande — a premium organic baby & postpartum gift brand with a calm, French-apothecary voice (warm, tactile, understated; never hypey).

You are shown one or more images: a product, and often a supplier/wholesale listing showing details and the COST price. From the image(s), return ONLY a JSON object, no prose, no markdown fences:
{
  "name": short product name in our voice (<= 6 words),
  "description": 2-3 sentences — warm, specific, premium; mention material/feel if visible,
  "ingredients": materials/fabric if visible, else "",
  "cost_cents": the wholesale/cost price you can read in the image, in cents, or null,
  "suggested_price_cents": a sensible RETAIL price in cents (if a cost is visible, ~2.5–3x cost, rounded to a clean number ending in 00; otherwise infer from the item type and our $24–$58 range),
  "price_reasoning": one short sentence on how you set the price
}

Rules: never write "100% organic" or claim certifications not shown. If you cannot read a cost, set cost_cents null and price the item from its type. Be honest and concrete.`

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const files = form.getAll('images').filter((f): f is File => f instanceof File)
    if (!files.length) return NextResponse.json({ error: 'Add at least one image' }, { status: 400 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const content: any[] = []
    for (const f of files.slice(0, 4)) {
      const buf = Buffer.from(await f.arrayBuffer())
      const media = f.type === 'image/png' ? 'image/png' : f.type === 'image/webp' ? 'image/webp' : 'image/jpeg'
      content.push({ type: 'image', source: { type: 'base64', media_type: media, data: buf.toString('base64') } })
    }
    content.push({ type: 'text', text: 'Draft this product (name, description, materials, cost if shown, suggested retail price).' })

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 700, system: SYSTEM,
      messages: [{ role: 'user', content }],
    })
    const text = msg.content[0]?.type === 'text' ? msg.content[0].text : ''
    const m = text.match(/\{[\s\S]*\}/)
    if (!m) return NextResponse.json({ error: 'Could not read the image' }, { status: 502 })
    const raw = JSON.parse(m[0]) as Record<string, unknown>
    const cents = (v: unknown) => (Number.isFinite(Number(v)) ? Math.max(0, Math.round(Number(v))) : null)
    return NextResponse.json({
      name: String(raw.name ?? '').slice(0, 80),
      description: String(raw.description ?? '').slice(0, 600),
      ingredients: String(raw.ingredients ?? '').slice(0, 300),
      cost_cents: cents(raw.cost_cents),
      suggested_price_cents: cents(raw.suggested_price_cents),
      price_reasoning: String(raw.price_reasoning ?? '').slice(0, 200),
    })
  } catch (e) {
    console.error('ai-from-image error:', e)
    return NextResponse.json({ error: 'Failed to draft from image' }, { status: 500 })
  }
}
