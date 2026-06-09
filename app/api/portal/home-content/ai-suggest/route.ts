import { NextRequest, NextResponse } from 'next/server'
import { anthropic, LUNA_SYSTEM_PROMPT } from '@/lib/anthropic'

// Brand-voice copy ideas for a homepage text field. Admin-guarded by
// middleware (under /api/portal/*). Returns a few short on-brand options the
// editor can click to drop into the field.
//
// Body: { fieldLabel: string, current?: string, kind?: 'eyebrow'|'title'|'tagline'|'body'|'bullet'|'text', context?: string }

const LENGTH_GUIDE: Record<string, string> = {
  eyebrow: 'a tiny all-caps label, 2–4 words',
  title: 'a short headline, max ~6 words (a single line)',
  tagline: 'one evocative sentence, under 12 words',
  body: '1–3 warm sentences, under 55 words',
  bullet: 'a single benefit phrase, 3–6 words, no trailing period',
  text: 'a short, on-brand line',
}

export async function POST(req: NextRequest) {
  try {
    const { fieldLabel, current, kind, context } = await req.json()
    const lenHint = LENGTH_GUIDE[kind as string] ?? LENGTH_GUIDE.text

    const prompt =
      `Write 3 distinct options for a homepage field on the Petite Lavande site.\n` +
      `Field: "${fieldLabel || 'copy'}". Each option should be ${lenHint}.\n` +
      (context ? `Context: ${context}.\n` : '') +
      (current?.trim() ? `The current draft is: "${current.trim()}". Offer fresh angles, don't just echo it.\n` : '') +
      `Lean into the brand's signatures (the mother as much as the baby, traced-to-source materials, hand-finished wax seal & linen ribbon, dried lavender, the personalized card). ` +
      `Vary the angle across the three. No quotes around them, no numbering, no trailing commentary.\n` +
      `Return ONLY a JSON array of exactly 3 strings.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      system: LUNA_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = message.content[0]?.type === 'text' ? message.content[0].text.trim() : ''
    let options: string[] = []
    // Prefer a clean JSON array; fall back to line-splitting if the model adds prose.
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      try { options = JSON.parse(jsonMatch[0]) } catch { /* fall through */ }
    }
    if (!options.length) {
      options = raw.split('\n').map(l => l.replace(/^\s*[-*\d.)\]]+\s*/, '').replace(/^["']|["']$/g, '').trim()).filter(Boolean)
    }
    options = options.filter(o => typeof o === 'string' && o.trim()).map(o => o.trim()).slice(0, 3)
    if (!options.length) return NextResponse.json({ error: 'Could not generate ideas' }, { status: 500 })

    return NextResponse.json({ options })
  } catch (e) {
    console.error('ai-suggest error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
