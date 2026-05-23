import { NextRequest, NextResponse } from 'next/server'
import { anthropic, LUNA_SYSTEM_PROMPT } from '@/lib/anthropic'

export async function POST(req: NextRequest) {
  try {
    const { recipientName, senderName, tone, boxSelection } = await req.json()

    if (!recipientName || !senderName || !tone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const selectedItems = boxSelection
      ? Object.values(boxSelection).filter(Boolean).map((p: any) => p.name).join(', ')
      : 'a curated selection of organic baby items'

    const toneGuide: Record<string, string> = {
      heartfelt: 'warm, deeply emotional, and sincere — like a love letter to a best friend',
      playful: 'fun, lighthearted, and joyful — full of warmth and humor',
      elegant: 'sophisticated, poetic, and refined — like a note on fine stationery',
      funny: 'witty and humorous with genuine love underneath the jokes',
      spiritual: 'meaningful, soulful, and uplifting — honoring the sacred journey of motherhood',
    }

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: LUNA_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Write a handwritten-style letter for a luxury baby gift box.

Recipient: ${recipientName}
Sender: ${senderName}
Tone: ${toneGuide[tone] || tone}
Items in the box: ${selectedItems}

Guidelines:
- Start with "Dear ${recipientName},"
- 3-4 short paragraphs
- Reference the gift items naturally (don't just list them)
- End with a warm closing and "${senderName}"
- Write as if it will be hand-written on premium card stock
- No quotes around the letter, just the letter itself`,
        },
      ],
    })

    const letter = message.content[0].type === 'text' ? message.content[0].text : ''

    return NextResponse.json({ letter })
  } catch (error) {
    console.error('Letter generation error:', error)
    return NextResponse.json({ error: 'Failed to generate letter' }, { status: 500 })
  }
}
