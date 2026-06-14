import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { CONTACT_EMAIL } from '@/lib/site-config'
import { CHAT_SYSTEM_PROMPT as SYSTEM_PROMPT } from '@/lib/chat-prompt'



// Simple rate limit: 20 messages per IP per hour
const RATE_WINDOW_MS = 60 * 60 * 1000
const RATE_LIMIT = 20
const ipHits = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = ipHits.get(ip)
  if (!entry || now > entry.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: `Too many messages. Please email us at ${CONTACT_EMAIL}` }, { status: 429 })
    }

    const { messages } = await req.json()
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'No messages' }, { status: 400 })
    }

    const recent = messages.slice(-10).map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: String(m.content).slice(0, 1000),
    }))

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: recent,
    })

    const reply = message.content[0].type === 'text'
      ? message.content[0].text
      : `I'm sorry, I couldn't process that. Please email us at ${CONTACT_EMAIL}`

    return NextResponse.json({ reply })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json({ reply: `I'm having trouble right now. Please email us at ${CONTACT_EMAIL} and we'll get back to you shortly.` })
  }
}
