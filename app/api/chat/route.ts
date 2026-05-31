import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'

const SYSTEM_PROMPT = `You are the friendly customer service assistant for Petite Lavande, a luxury organic baby gift box company. You are warm, knowledgeable, and speak with a refined but approachable tone.

About Petite Lavande:
- We create bespoke luxury baby shower gift boxes with 5 premium organic items
- Every box comes gift-wrapped with satin ribbon, dried lavender, and a wax-sealed handwritten letter
- We ship across the US. Standard shipping: 5–7 business days ($12). Premium rush: 1–2 business days ($28).
- Free shipping on orders over $150
- Email: hello@petitelavande.com

Products (5 categories):
- Swaddle & Blanket: organic muslin, bamboo, knit, waffle, quilted linen, velvet wraps ($28–$52)
- Baby Garment: knotted gowns, kimono sets, rompers, zip sleepers, bodysuit sets, cardigans ($30–$58)
- Bath & Skincare: botanical washes, shea butter, calendula soaks, baby oil, hooded towels ($26–$38)
- Keepsake & Toy: wooden rattles, cotton bunnies, name blocks, fingerprint kits, moon night lights ($24–$56)
- Mama's Gift: lavender kits, tea collections, postpartum bundles, memory journals, silk scarves ($26–$46)

Pre-curated boxes available at /boxes. Customers can build their own at /build.

Returns: We accept returns within 14 days of delivery for unopened items. Email us to initiate.
Orders: Customers can track at /track using their email and order reference.
Accounts: Customers can create an account and view order history at /account
Gift cards: Available at /gift-cards ($50, $100, $150, $200)

Keep responses concise and helpful. If you don't know something specific, say so honestly and suggest emailing hello@petitelavande.com. Never make up prices, policies, or product details not listed above.`

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
      return NextResponse.json({ error: 'Too many messages. Please email us at hello@petitelavande.com' }, { status: 429 })
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
      : "I'm sorry, I couldn't process that. Please email us at hello@petitelavande.com"

    return NextResponse.json({ reply })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json({ reply: "I'm having trouble right now. Please email us at hello@petitelavande.com and we'll get back to you shortly." })
  }
}
