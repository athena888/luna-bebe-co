import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Given a pile of uploaded photo URLs, use Claude vision to GROUP them by product
// (same item = one group) and draft each product's name/description/price.
// Returns groups referencing the original photo URLs. Admin-guarded by middleware.

const SYSTEM = `You are a product cataloguer for Petite Lavande — a premium organic baby & postpartum gift brand with a calm, French-apothecary voice (warm, tactile, understated; never hypey).

You are shown a numbered set of photos (image 0, image 1, …). Several photos may show the SAME physical product (different angles / flat-lays / on-model / detail shots), and some photos may be SUPPLIER INFO PAGES — often IN CHINESE — showing the fabric (面料, e.g. 棉100% = 100% cotton, 锦纶 = nylon, 氨纶 = spandex), a size chart (尺码/size with 胸围/bust, 衣长 or 裤长/length, 腰围/waist in cm), and a style/model number (款号). Read and TRANSLATE any Chinese.

Your job is to GROUP the photos by product: every distinct product becomes one group, and each photo belongs to exactly one group. Attach each info/size page to the product group it describes (match by style number or by the item shown).

For each group return: the photo indexes in it; a short product name (<= 6 words, English); a 2-3 sentence description of the STYLE woven with the fabric (English); the fabric/materials translated to concise English (or ""); the available sizes as a short comma list from the chart (e.g. "66, 73, 80, 90" or ""); a short size_detail line (key measurements in cm or the model fit, or ""); the wholesale price in RMB CENTS if shown in yuan (¥48 → 4800, else null); a weight_grams estimate (baby outfit ~150–400g, socks ~30g); and a sensible boutique RETAIL price in cents (infer from the item type — a full outfit/set sits higher than a small accessory — unless a cost is visibly shown).

Return ONLY a JSON object, no prose, no markdown fences:
{
  "groups": [
    { "photos": [0,2,5], "name": "...", "description": "...", "ingredients": "100% cotton", "sizes": "66, 73, 80, 90", "size_detail": "Bust 31cm, length 36cm (size 90)", "wholesale_rmb_cents": 4800, "weight_grams": 250, "suggested_price_cents": 4800 }
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

    let parsed: { groups?: Array<{ photos?: number[]; name?: string; description?: string; ingredients?: string; sizes?: string; size_detail?: string; wholesale_rmb_cents?: number; weight_grams?: number; suggested_price_cents?: number }> } = {}
    try { parsed = JSON.parse(m[0]) } catch { return NextResponse.json({ error: 'AI returned an unreadable result. Try again.' }, { status: 502 }) }

    const cents = (v: unknown) => (Number.isFinite(Number(v)) ? Math.max(0, Math.round(Number(v))) : null)
    const seen = new Set<number>()
    const groups = (parsed.groups ?? []).map(g => {
      const idxs = (g.photos ?? []).filter(i => Number.isInteger(i) && i >= 0 && i < list.length && !seen.has(i))
      idxs.forEach(i => seen.add(i))
      return {
        name: String(g.name ?? '').slice(0, 80),
        description: String(g.description ?? '').slice(0, 600),
        materials: String(g.ingredients ?? '').slice(0, 300),
        sizes: String(g.sizes ?? '').slice(0, 200),
        size_detail: String(g.size_detail ?? '').slice(0, 300),
        wholesale_rmb_cents: cents(g.wholesale_rmb_cents),
        weight_grams: cents(g.weight_grams),
        price_cents: cents(g.suggested_price_cents),
        images: idxs.map(i => list[i]),
      }
    }).filter(g => g.images.length > 0)

    // Safety net: any photo the model forgot becomes its own ungrouped product.
    const leftovers = list.filter((_, i) => !seen.has(i))
    for (const url of leftovers) groups.push({ name: '', description: '', materials: '', sizes: '', size_detail: '', wholesale_rmb_cents: null, weight_grams: null, price_cents: null, images: [url] })

    if (!groups.length) return NextResponse.json({ error: 'No groups produced. Try again.' }, { status: 502 })
    return NextResponse.json({ groups })
  } catch (e) {
    console.error('first-year group error:', e)
    return NextResponse.json({ error: 'Failed to group photos' }, { status: 500 })
  }
}
