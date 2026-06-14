import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { CHAT_SYSTEM_PROMPT } from '@/lib/chat-prompt'
import { crispConfigured, getAvailability, getConversationMessages, sendMessage, type CrispMsg } from '@/lib/crisp'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Claude↔Crisp bridge. Crisp POSTs conversation events here. When a visitor sends
// a chat message AND no human operator is online, Claude replies inside the Crisp
// conversation in the brand voice. When you ARE online, it stays silent so you
// handle it yourself. Guarded by a shared secret (?secret=...).

function toAnthropic(msgs: CrispMsg[]): { role: 'user' | 'assistant'; content: string }[] {
  const out: { role: 'user' | 'assistant'; content: string }[] = []
  for (const m of msgs) {
    const role = m.from === 'operator' ? 'assistant' : 'user'
    const last = out[out.length - 1]
    if (last && last.role === role) last.content += `\n${m.content}`
    else out.push({ role, content: m.content.slice(0, 1500) })
  }
  while (out.length && out[0].role === 'assistant') out.shift()
  return out
}

export async function POST(req: NextRequest) {
  // Shared-secret guard.
  if (process.env.CRISP_WEBHOOK_SECRET && req.nextUrl.searchParams.get('secret') !== process.env.CRISP_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  let body: { event?: string; data?: Record<string, unknown> }
  try { body = await req.json() } catch { return NextResponse.json({ ok: true }) }

  const data = body.data ?? {}
  // Only auto-reply to a visitor's text chat message.
  const isVisitorMessage =
    body.event === 'message:send' && data.from === 'user' && data.type === 'text' && data.origin === 'chat'
  if (!isVisitorMessage || !crispConfigured()) return NextResponse.json({ ok: true })

  const sessionId = String(data.session_id ?? '')
  if (!sessionId) return NextResponse.json({ ok: true })

  try {
    // If a human is available, stay quiet — Emily handles it live.
    if ((await getAvailability()) === 'online') return NextResponse.json({ ok: true, skipped: 'operator online' })

    const history = await getConversationMessages(sessionId)
    let messages = toAnthropic(history)
    if (messages.length === 0) {
      const content = typeof data.content === 'string' ? data.content : ''
      if (!content) return NextResponse.json({ ok: true })
      messages = [{ role: 'user', content }]
    }

    const ai = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: CHAT_SYSTEM_PROMPT,
      messages,
    })
    const reply = ai.content[0]?.type === 'text' ? ai.content[0].text : ''
    if (reply) await sendMessage(sessionId, reply)
    return NextResponse.json({ ok: true, replied: Boolean(reply) })
  } catch (e) {
    console.error('crisp webhook error:', e)
    return NextResponse.json({ ok: true }) // never make Crisp retry-storm
  }
}
