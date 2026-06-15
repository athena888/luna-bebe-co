import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Given a pile of uploaded photo URLs, use Claude vision to GROUP them by product
// (same item = one group) and draft each product's name/description/price.
// Returns groups referencing the original photo URLs. Admin-guarded by middleware.

const SYSTEM = `You are a product cataloguer for Petite Lavande — a premium organic baby & postpartum gift brand with a calm, French-apothecary voice (warm, tactile, understated; never hypey).

You are shown a numbered set of photos (image 0, image 1, …). Several photos may show the SAME physical product from different angles / flat-lays / on-model / detail shots. Your job is to GROUP the photos by product: every distinct product becomes one group, and each photo belongs to exactly one group.

For each group return: the photo indexes in it, a short product name (<= 6 words, our voice), a 2-3 sentence warm/specific/premium description, and a sensible RETAIL price in cents (infer from the item type within a roughly $24–$58 range unless a price is visibly shown).

Return ONLY a JSON object, no prose, no markdown fences:
{
  "groups": [
    { "photos": [0,2,5], "name": "...", "description": "...", "suggested_price_cents": 4800 }
  ]
}

Rules: include EVERY image index exactly once across all groups. If a photo clearly stands alone, it is its own group. Never claim certifications not shown; never write "100% organic".`

export async function POST(req: NextRequest) {
  try {
    const { urls } = await req.json() as { urls?: string[] }
    const list = (urls ?? []).filter(u => typeof u === 'string' && u).slice(0, 16)
    if (list.length < 1) return NextResponse.json({ error: 'No photos to group' }, { status: 400 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const content: any[] = []
    list.forEach((url, i) => {
      content.push({ type: 'text', text: `image ${i}:` })
      content.push({ type: 'image', source: { type: 'url', url } })
    })
    content.push({ type: 'text', text: `Group these ${list.length} photos by product and draft each. Remember: every image index 0–${list.length - 1} must appear exactly once.` })

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 1500, system: SYSTEM,
      messages: [{ role: 'user', content }],
    })
    const text = msg.content[0]?.type === 'text' ? msg.content[0].text : ''
    const m = text.match(/\{[\s\S]*\}/)
    if (!m) return NextResponse.json({ error: 'AI could not group the photos. Try again.' }, { status: 502 })

    let parsed: { groups?: Array<{ photos?: number[]; name?: string; description?: string; suggested_price_cents?: number }> } = {}
    try { parsed = JSON.parse(m[0]) } catch { return NextResponse.json({ error: 'AI returned an unreadable result. Try again.' }, { status: 502 }) }

    const cents = (v: unknown) => (Number.isFinite(Number(v)) ? Math.max(0, Math.round(Number(v))) : null)
    const seen = new Set<number>()
    const groups = (parsed.groups ?? []).map(g => {
      const idxs = (g.photos ?? []).filter(i => Number.isInteger(i) && i >= 0 && i < list.length && !seen.has(i))
      idxs.forEach(i => seen.add(i))
      return {
        name: String(g.name ?? '').slice(0, 80),
        description: String(g.description ?? '').slice(0, 600),
        price_cents: cents(g.suggested_price_cents),
        images: idxs.map(i => list[i]),
      }
    }).filter(g => g.images.length > 0)

    // Safety net: any photo the model forgot becomes its own ungrouped product.
    const leftovers = list.filter((_, i) => !seen.has(i))
    for (const url of leftovers) groups.push({ name: '', description: '', price_cents: null, images: [url] })

    if (!groups.length) return NextResponse.json({ error: 'No groups produced. Try again.' }, { status: 502 })
    return NextResponse.json({ groups })
  } catch (e) {
    console.error('first-year group error:', e)
    return NextResponse.json({ error: 'Failed to group photos' }, { status: 500 })
  }
}
