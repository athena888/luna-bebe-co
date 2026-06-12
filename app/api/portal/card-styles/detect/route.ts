import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'

// Vision auto-detect for a card-style upload: the admin picks an image and we
// fill in the fields for them — name, alt text, a suggested size + word limit,
// the printed theme/label, and where the personal message should be placed
// (the empty zone) with a sensible font. Admin-guarded by middleware.
const OK = ['image/jpeg', 'image/png', 'image/webp']

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No image' }, { status: 400 })
    if (!OK.includes(file.type)) return NextResponse.json({ error: 'Only JPG, PNG, or WebP' }, { status: 400 })

    const buf = Buffer.from(await file.arrayBuffer())
    if (buf.byteLength > 5 * 1024 * 1024) return NextResponse.json({ error: 'Image too large to analyze' }, { status: 400 })
    const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/webp'
    const base64 = buf.toString('base64')

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          {
            type: 'text',
            text: `This is a printed greeting-card design for a luxury organic baby-gift brand (Petite Lavande). A customer's personal message will be printed onto the empty area of this card.

Look at the card and return ONLY valid JSON (no prose) with these fields:
{
  "name": "a short, elegant style name, 2-3 words, e.g. 'Lavender Wreath' or 'Olive & Eucalyptus'",
  "altText": "8-16 word description of the artwork incl. any printed words you can read",
  "theme": "the card's printed sub-label or sentiment if visible (e.g. 'a note for you', 'with love', 'fait avec amour', 'for baby & mama'), else a 1-3 word occasion like 'new baby' or 'congratulations'",
  "sizeLabel": "A6 — 4.1 × 5.8 in",
  "wordLimit": a number (40-120) — how many words of personal message will comfortably fit in the empty area,
  "textZone": { "x": 0-100, "y": 0-100, "w": 0-100, "align": "left|center|right" },
  "font": "serif | script"
}

For textZone: x,y is the TOP-LEFT of the empty area where the message should sit, as percentages of the image width/height; w is the width of that area as a percentage. Pick the LARGEST clear, illustration-free space. "align" is how the text should align within it. "font" is "script" for a flowing/handwritten feel or "serif" for a classic engraved feel — choose what matches the card.`,
          },
        ],
      }],
    })

    const text = message.content[0]?.type === 'text' ? message.content[0].text : ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ error: 'Could not analyze the card' }, { status: 500 })

    const raw = JSON.parse(match[0]) as Record<string, unknown>
    const clampPct = (v: unknown, d: number) => {
      const n = typeof v === 'number' ? v : Number(v)
      return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : d
    }
    const tz = (raw.textZone ?? {}) as Record<string, unknown>
    const detected = {
      name: String(raw.name ?? '').trim() || 'Botanical Card',
      altText: String(raw.altText ?? '').trim(),
      theme: String(raw.theme ?? '').trim(),
      sizeLabel: String(raw.sizeLabel ?? 'A6 — 4.1 × 5.8 in').trim(),
      wordLimit: Math.min(120, Math.max(40, Number(raw.wordLimit) || 80)),
      meta: {
        theme: String(raw.theme ?? '').trim(),
        font: (raw.font === 'script' ? 'script' : 'serif') as 'script' | 'serif',
        textZone: {
          x: clampPct(tz.x, 12),
          y: clampPct(tz.y, 40),
          w: clampPct(tz.w, 76),
          align: (['left', 'center', 'right'].includes(String(tz.align)) ? String(tz.align) : 'center') as 'left' | 'center' | 'right',
        },
      },
    }

    return NextResponse.json({ detected })
  } catch (e) {
    console.error('card-styles detect error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
