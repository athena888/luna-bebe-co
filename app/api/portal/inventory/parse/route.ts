import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    if (file.type !== 'application/pdf') return NextResponse.json({ error: 'Please upload a PDF file' }, { status: 400 })
    if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: 'File too large (max 20MB)' }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document' as const,
            source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: base64 },
          },
          {
            type: 'text',
            text: `You are an inventory parser for a luxury baby clothing and gift box company.

Extract ALL inventory items from this PDF sheet. For each item identify:
- item_id: the product/SKU code. If none, slugify the name (e.g. "Cloud Onesie" → "cloud-onesie").
- name: product name as shown
- color: color of the item (e.g. "white", "blush pink", "sage green")
- size: map to one of these exact strings: "0-3", "3-6", "6-9", "9-12", "12-18", "18-24", "one-size"
  - NB / Newborn / 0-3m → "0-3"
  - 3m / 3-6m → "3-6"
  - 6m / 6-9m → "6-9"
  - 9m / 9-12m → "9-12"
  - 12m / 12-18m → "12-18"
  - 18m / 18-24m / 24m → "18-24"
  - No size / OS / one size / accessories / swaddles / non-clothing → "one-size"
- quantity: integer count

Return ONLY a valid JSON array, no markdown, no explanation:
[{"item_id":"...","name":"...","color":"...","size":"...","quantity":0}]`,
          },
        ],
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    const clean = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    const items = JSON.parse(clean)

    if (!Array.isArray(items)) throw new Error('Unexpected response format')

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Inventory parse error:', error)
    const msg = error instanceof Error ? error.message : 'Parse failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
