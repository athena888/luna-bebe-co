import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// AI naming assistant for the Gift Boxes editor: given the items in a box
// (and optionally Emily's direction), returns a few French name options each
// with a short fairy-tale description in English. Names must fit the existing
// family (Douce Sérénité, Champ de Sauge, Petite Rose…).
export async function POST(req: NextRequest) {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return NextResponse.json({ error: 'AI not configured' }, { status: 500 })
  try {
    const { items, request } = await req.json() as { items: string[]; request?: string }
    if (!items?.length) return NextResponse.json({ error: 'Add items to the box first — names come from what\'s inside.' }, { status: 400 })

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 1200,
        system: `You name gift boxes for Petite Lavande, a luxury French-inspired organic baby gift brand (lavender fields, Provence, soft mornings). Existing names for register: Douce Sérénité, Champ de Sauge, Petite Rose, Brume de Lilas, La Collection, Mama et Bébé. Rules: names are short French (2-3 words, correct French grammar and accents), evocative not literal, never kitsch. Each description is 2-3 sentences of gentle fairy-tale storytelling in ENGLISH, grounded in the actual items (never invent materials or craft methods — say "soft" not "hand-knit" unless a knit item is listed). Never use the words "wax seal" — the seal is a sticker, say "signature seal" if needed.`,
        messages: [{
          role: 'user',
          content: `Items in this box:\n${items.map(i => `- ${i}`).join('\n')}\n${request?.trim() ? `\nDirection from the owner: ${request.trim()}` : ''}\n\nGive 4 name options. Respond ONLY as JSON: [{"name":"...","story":"..."}]`,
        }],
      }),
    })
    if (!res.ok) return NextResponse.json({ error: `AI error ${res.status}` }, { status: 502 })
    const data = await res.json() as { content?: Array<{ type: string; text?: string }> }
    const text = data.content?.find(c => c.type === 'text')?.text ?? ''
    const m = text.match(/\[[\s\S]*\]/)
    if (!m) return NextResponse.json({ error: 'No suggestions returned — try again.' }, { status: 502 })
    const suggestions = JSON.parse(m[0]) as Array<{ name: string; story: string }>
    return NextResponse.json({ suggestions: suggestions.slice(0, 5) })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'failed' }, { status: 500 })
  }
}
