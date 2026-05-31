import { NextRequest, NextResponse } from 'next/server'
import { anthropic, LUNA_SYSTEM_PROMPT } from '@/lib/anthropic'

export async function POST(req: NextRequest) {
  try {
    const { recipientName, senderName, boxSelection } = await req.json()

    if (!recipientName || !senderName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const selectedItems = boxSelection
      ? Object.values(boxSelection).filter(Boolean).map((p: { name: string }) => p.name).join(', ')
      : 'a curated selection of organic baby items'

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 900,
      system: LUNA_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Write TWO different handwritten-style letters for a luxury baby gift box. Make them feel distinct — one warm and heartfelt, one more poetic and elegant.

Recipient: ${recipientName}
Sender: ${senderName}
Items in the box: ${selectedItems}

Guidelines for both:
- Start with "Dear ${recipientName},"
- 3-4 short paragraphs
- Reference the gift items naturally
- End with a warm closing and "${senderName}"
- Write as if hand-written on premium card stock
- No quotes, just the letter text

Separate the two letters with exactly this line: ---LETTER_BREAK---

Write Letter 1 first, then the separator, then Letter 2.`,
      }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const parts = text.split('---LETTER_BREAK---')
    const letters = parts.map(p => p.trim()).filter(Boolean)

    return NextResponse.json({ letters })
  } catch (error) {
    console.error('Letter generation error:', error)
    return NextResponse.json({ error: 'Failed to generate letter' }, { status: 500 })
  }
}
