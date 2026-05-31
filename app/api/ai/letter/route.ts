import { NextRequest, NextResponse } from 'next/server'
import { anthropic, LUNA_SYSTEM_PROMPT } from '@/lib/anthropic'

export async function POST(req: NextRequest) {
  try {
    const { recipientName, senderName } = await req.json()

    if (!recipientName || !senderName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 900,
      system: LUNA_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Write TWO different short handwritten letters to accompany a luxury baby gift box. Make them feel distinct — one warm and deeply heartfelt, one poetic and elegant.

Recipient: ${recipientName}
Sender: ${senderName}

Guidelines for BOTH letters:
- Start with "Dear ${recipientName},"
- 2-3 short paragraphs only — keep it brief and intimate
- Focus entirely on love, joy, and the beauty of new life — purely personal and emotional
- Do NOT mention any products, items, gifts, or what's inside the box
- Write as if speaking heart to heart, like a close friend or family member
- End with a warm closing and "${senderName}"
- No quotes around the letter, just the letter text itself

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
