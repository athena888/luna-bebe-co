import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getCatalog } from '@/lib/products-db'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    const isPdf = file.type === 'application/pdf'
    const isImage = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    if (!isPdf && !isImage) {
      return NextResponse.json({ error: 'Please upload a PDF or image (JPG, PNG, WebP)' }, { status: 400 })
    }
    if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: 'File too large (max 20MB)' }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    // PDFs use the document block; images use the image block (both via Claude Vision)
    const sourceBlock = isPdf
      ? { type: 'document' as const, source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: base64 } }
      : { type: 'image' as const, source: { type: 'base64' as const, media_type: file.type as 'image/jpeg' | 'image/png' | 'image/webp', data: base64 } }

    // Give Claude the existing catalog so it can match items even across
    // languages (e.g. a Chinese supplier sheet → English catalog names).
    let catalogList = ''
    try {
      const catalog = await getCatalog({ activeOnly: false })
      catalogList = catalog.map(p => `- ${p.id}: ${p.name} (${p.category})`).join('\n')
    } catch { /* matching is best-effort */ }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          sourceBlock,
          {
            type: 'text',
            text: `You are an inventory parser for a luxury baby clothing and gift box company. The sheet (PDF or a photo of a quotation/order sheet) may be a supplier "buy now" / purchase sheet with style numbers, color codes (e.g. XJ39#, 100#), per-size quantities, and prices, and may be in any language (e.g. Chinese).

${catalogList ? `Here is the company's EXISTING product catalog (id: name):\n${catalogList}\n\nFor each line item, if it clearly corresponds to one of these existing products (translate across languages as needed — e.g. "短袖连体衣" = "Short Sleeve Onesie"), set item_id to that EXACT existing id. Only match when you are confident; otherwise slugify the name as a new id.\n` : ''}
Extract ALL line items from this sheet. A single style can have multiple color codes and multiple sizes — emit ONE row per (style, color, size, quantity) combination. For each item identify:
- item_id: the matching EXISTING catalog id when confident (see list above); otherwise the style number / SKU code exactly as shown (e.g. "BD01F", "BR06F"), or slugify the name. Keep the SAME item_id across its size/color rows.
- name: product name as shown (drop trailing footnote markers like "*")
- color_code: the supplier's raw color CODE exactly as printed if present (e.g. "XJ32#", "XK47#", "100#", "88#"). Use "" if none.
- color: the human color NAME (e.g. "white", "khaki/sand", "grey-blue", "dusty rose", "cream"). If the sheet only shows a code and no name, infer a reasonable name from the swatch color, else reuse the code.
- color_hex: the actual swatch COLOR as a hex code (e.g. "#E4DCD6") — read it from the color swatch/photo if no hex text is printed. Uppercase, include the leading "#". Use "" if you truly cannot tell.
- size: map to one of these exact strings: "0-3", "3-6", "6-9", "9-12", "12-18", "18-24", "one-size"
  - NB / Newborn / 0-3M → "0-3"
  - 3M / 3-6M → "3-6"
  - 6M / 6-9M → "6-9"
  - 9M / 9-12M → "9-12"
  - 12M / 12-18M → "12-18"
  - 18M / 18-24M / 24M → "18-24"
  - "-" / blank / OS / one size / blankets / lovey / teether / non-clothing → "one-size"
- quantity: integer count (the Qty column)
- unit_price: the per-unit price in dollars as a number (e.g. 4.30 from "$4.30"). If the price is "TBD", blank, or missing, use null.
- status: "to_source" if the row is under a "TO SOURCE" / "confirm before ordering" section or has no price; otherwise "stock".
${isImage ? `- photo_box: the location of THIS style's product photo in the image, as fractions of the image: {"x":0..1,"y":0..1,"w":0..1,"h":0..1} where x,y is the TOP-LEFT corner and w,h are width/height. Use the main product/style photo (or the per-color swatch photo if that's all there is). All rows of the same style may share the same photo_box. Use null if there is no photo for that item.` : '- photo_box: always null (no image to crop from).'}

Ignore subtotal, total, and section-summary rows. Only return real line items.

Return ONLY a valid JSON array, no markdown, no explanation:
[{"item_id":"...","name":"...","color_code":"...","color":"...","color_hex":"...","size":"...","quantity":0,"unit_price":0,"status":"stock","photo_box":{"x":0,"y":0,"w":0,"h":0}}]`,
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
