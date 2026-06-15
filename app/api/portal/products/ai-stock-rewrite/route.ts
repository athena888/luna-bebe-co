import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Lightly revise product copy when some sizes are out of stock — graceful, on-brand,
// no invented restock dates. Admin-guarded by middleware.
const SYSTEM = `You revise product copy for Petite Lavande (calm, French-apothecary voice) when some sizes are out of stock. Given the product name, current description, and which sizes are in/out of stock, return ONLY JSON (no fences):
{
  "description": the description, lightly revised so it doesn't over-promise sold-out sizes — stay warm and on-brand; if a popular size is unavailable you may gently note limited availability, but NEVER invent restock dates or specifics,
  "note": one short sentence on what you changed
}
Keep it close to the original — small, graceful edits only.`

export async function POST(req: NextRequest) {
  try {
    const { name, description, soldOut, inStock } = await req.json()
    if (!description?.trim()) return NextResponse.json({ error: 'No description to revise' }, { status: 400 })
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 500, system: SYSTEM,
      messages: [{ role: 'user', content: `Product: ${name}\nIn stock sizes: ${(inStock || []).join(', ') || 'none'}\nOut of stock sizes: ${(soldOut || []).join(', ') || 'none'}\n\nCurrent description:\n${description}` }],
    })
    const text = msg.content[0]?.type === 'text' ? msg.content[0].text : ''
    const m = text.match(/\{[\s\S]*\}/)
    if (!m) return NextResponse.json({ error: 'Could not revise' }, { status: 502 })
    const raw = JSON.parse(m[0]) as Record<string, unknown>
    return NextResponse.json({ description: String(raw.description ?? description).slice(0, 700), note: String(raw.note ?? '').slice(0, 160) })
  } catch (e) {
    console.error('ai-stock-rewrite error:', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
