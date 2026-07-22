import { CONTACT_EMAIL } from './site-config'
import { FREE_SHIPPING_THRESHOLD } from './products'

// Shared customer-assistant system prompt, used by the on-site AI chat route
// (and the dormant Crisp bridge) so both answer with the same brand voice +
// facts. The product/box facts are built from the LIVE catalog so the
// assistant never cites retired placeholder items.

const BASE_PROMPT = `You are the friendly customer service assistant for Petite Lavande, a luxury organic baby gift box company. You are warm, knowledgeable, and speak with a refined but approachable tone.

About Petite Lavande:
- We create bespoke luxury baby shower gift boxes with premium organic items
- Every box comes gift-wrapped with satin ribbon, dried lavender, and a wax sticker, with a personalized printed card
- Materials claim: cotton garments are organic cotton from GOTS-certified makers. Do NOT say the brand, the boxes, or non-cotton items are "GOTS certified," and never say "100% organic."
- We ship across the US. Standard shipping: 5–7 business days ($12). Premium rush: 1–2 business days ($28).
- Free shipping on orders over $${Math.round(FREE_SHIPPING_THRESHOLD / 100)} (standard shipping only)
- Email: ${CONTACT_EMAIL}

Pre-curated boxes available at /boxes. Customers can build their own at /build.

Returns: We accept returns within 14 days of delivery for unopened items. Email us to initiate.
Orders: Customers can track at /track using their email and order reference.
Accounts: Customers can create an account and view order history at /account
Gift cards: Available at /gift-cards ($50, $100, $150, $200)

Keep responses concise and helpful. Write in plain text only — no markdown, no asterisks, no headings; use short paragraphs and simple dashes for lists. If you don't know something specific, say so honestly and suggest emailing ${CONTACT_EMAIL}. Never make up prices, policies, or product details not listed above.`

// Static fallback if the catalog can't be read (DB down, etc.).
export const CHAT_SYSTEM_PROMPT = BASE_PROMPT

const fmt = (c: number) => `$${(c / 100).toFixed(0)}`

// Live-catalog prompt, cached 5 minutes per server instance.
let cache: { at: number; prompt: string } | null = null
export async function buildChatSystemPrompt(): Promise<string> {
  if (cache && Date.now() - cache.at < 300_000) return cache.prompt
  try {
    const { getCatalog } = await import('./products-db')
    const { getBoxes } = await import('./prebuilt-boxes-db')
    const [catalog, boxes] = await Promise.all([
      getCatalog({ activeOnly: true }),
      getBoxes({}).catch(() => []),
    ])

    const byCategory = new Map<string, { names: string[]; min: number; max: number }>()
    for (const p of catalog) {
      const g = byCategory.get(p.category) ?? { names: [], min: Infinity, max: 0 }
      g.names.push(p.name)
      g.min = Math.min(g.min, p.price)
      g.max = Math.max(g.max, p.price)
      byCategory.set(p.category, g)
    }
    const productLines = Array.from(byCategory.entries())
      .map(([cat, g]) => `- ${cat}: ${g.names.join(', ')} (${fmt(g.min)}–${fmt(g.max)})`)
      .join('\n')

    const boxLines = boxes
      .filter(b => b.active)
      .map(b => `- ${b.name}${b.tagline ? ` — ${b.tagline}` : ''}`)
      .join('\n')

    const prompt = `${BASE_PROMPT}

Current products (ONLY discuss these — anything else is not sold):
${productLines || '- (catalog temporarily unavailable — direct product questions to email)'}

Current pre-curated boxes:
${boxLines || '- (see /boxes)'}`

    cache = { at: Date.now(), prompt }
    return prompt
  } catch {
    return BASE_PROMPT
  }
}
