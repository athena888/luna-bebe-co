import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Draft a product from uploaded screenshots/photos (e.g. a supplier listing
// showing the item + its wholesale cost). Claude vision returns copy in the brand
// voice + a suggested retail price. Admin-guarded by middleware.
const SYSTEM = `You are a product copywriter, cataloguer, and pricing assistant for Petite Lavande — a premium organic baby & postpartum gift brand with a calm, French-apothecary voice (warm, tactile, understated; never hypey).

You are shown one or more images of a product listing. They are OFTEN IN CHINESE (supplier / wholesale pages) — read and TRANSLATE them to natural English. A listing typically includes: the item itself; a materials/fabric line (面料, e.g. 棉100% = 100% cotton, 锦纶 = nylon, 氨纶 = spandex/elastane); a size chart (尺码/size with 胸围/bust, 衣长 or 裤长/length, 腰围/waist — usually in cm); a style/model number (款号); a model fit reference (e.g. 身高92cm 体重12kg 穿90码 = height 92cm, 12kg, wears size 90); and SOMETIMES a wholesale COST price.

From the image(s), return ONLY a JSON object, no prose, no markdown fences:
{
  "name": short product name in our voice (<= 6 words, English),
  "description": 2-3 sentences describing the STYLE — the look, feel, and the occasion it suits — woven naturally with the fabric. Warm, specific, premium. English.
  "ingredients": the fabric/materials, translated to concise English, e.g. "100% cotton (socks: 95% nylon, 5% spandex)". "" if none shown.
  "sizes": the available size options from the size chart as a short comma-separated list, e.g. "66, 73, 80, 90, 100" or "S, M". "" if no chart is shown.
  "size_detail": one short English line summarizing the measurements (in cm) or the model's fit reference, if useful; else "".
  "cost_cents": the wholesale/cost price you can actually read in the image, in cents, or null,
  "suggested_price_cents": a sensible boutique RETAIL price in cents (if a cost is visible, ~2.5–3x cost rounded to a clean number; otherwise infer from the item type and premium positioning — a full outfit/set sits higher than a single small accessory),
  "price_reasoning": one short sentence on how you set the price (note when no cost was visible).
}

Rules: translate any Chinese to natural English. Never write "100% organic" or claim certifications not shown. If you cannot read a cost, set cost_cents null and price the item from its type. Be honest and concrete.`

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
      sizes: String(raw.sizes ?? '').slice(0, 200),
      size_detail: String(raw.size_detail ?? '').slice(0, 300),
      cost_cents: cents(raw.cost_cents),
      suggested_price_cents: cents(raw.suggested_price_cents),
      price_reasoning: String(raw.price_reasoning ?? '').slice(0, 200),
    })
  } catch (e) {
    console.error('ai-from-image error:', e)
    return NextResponse.json({ error: 'Failed to draft from image' }, { status: 500 })
  }
}
