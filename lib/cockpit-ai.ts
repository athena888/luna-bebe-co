import { anthropic } from './anthropic'

// Anthropic integrations for the Marketing Cockpit (brief §7). All return parsed
// JSON. Server-only. Models per the brief: Haiku for the high-volume classifier,
// Sonnet for vision + strategy reasoning.

const HAIKU = 'claude-haiku-4-5-20251001'
const SONNET = 'claude-sonnet-4-6'

function extractJson(text: string): Record<string, unknown> | null {
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) return null
  try { return JSON.parse(m[0]) as Record<string, unknown> } catch { return null }
}

// ── 7.1 Email classifier ─────────────────────────────────────────────────────
export type EmailCategory =
  | 'customer_inquiry' | 'b2b_reply' | 'inbound_pitch'
  | 'partnership_invite' | 'vendor_supplier' | 'spam_newsletter' | 'other'

export interface EmailClassification {
  category: EmailCategory
  intent: string
  sentiment: 'positive' | 'neutral' | 'negative'
  requires_followup: boolean
  suggested_followup: string | null
  summary: string
}

const CLASSIFIER_SYSTEM = `You classify a single email for a small premium baby/postpartum gift brand.
Return ONLY a JSON object, no prose, no markdown fences.
Schema:
{
  "category": one of ["customer_inquiry","b2b_reply","inbound_pitch","partnership_invite","vendor_supplier","spam_newsletter","other"],
  "intent": short phrase (e.g. "wants wholesale pricing"),
  "sentiment": "positive" | "neutral" | "negative",
  "requires_followup": true | false,
  "suggested_followup": "YYYY-MM-DD" | null,
  "summary": one sentence, <= 22 words
}
Rules:
- "partnership_invite" = someone offering collaboration, gifting, podcast, press, stockist.
- "inbound_pitch" = someone selling TO us (agencies, services). Usually low priority.
- A reply from a known B2B contact to our outreach is "b2b_reply".
- Be conservative with requires_followup; only true when a human reply is expected.`

export async function classifyEmail(input: { from: string; subject: string; body: string }): Promise<EmailClassification | null> {
  const msg = await anthropic.messages.create({
    model: HAIKU,
    max_tokens: 300,
    system: CLASSIFIER_SYSTEM,
    messages: [{ role: 'user', content: `From: ${input.from}\nSubject: ${input.subject}\n\n${input.body}`.slice(0, 6000) }],
  })
  const text = msg.content[0]?.type === 'text' ? msg.content[0].text : ''
  const raw = extractJson(text)
  if (!raw) return null
  const cats: EmailCategory[] = ['customer_inquiry', 'b2b_reply', 'inbound_pitch', 'partnership_invite', 'vendor_supplier', 'spam_newsletter', 'other']
  const sent = ['positive', 'neutral', 'negative']
  return {
    category: cats.includes(raw.category as EmailCategory) ? (raw.category as EmailCategory) : 'other',
    intent: String(raw.intent ?? '').slice(0, 120),
    sentiment: (sent.includes(String(raw.sentiment)) ? raw.sentiment : 'neutral') as EmailClassification['sentiment'],
    requires_followup: Boolean(raw.requires_followup),
    suggested_followup: raw.suggested_followup ? String(raw.suggested_followup).slice(0, 10) : null,
    summary: String(raw.summary ?? '').slice(0, 200),
  }
}

// ── 7.2 Image brand-fit scorer (vision) ──────────────────────────────────────
export interface ImageScore {
  brand_fit: number
  craft: number
  composite: number
  color_on_brand: boolean
  verdict: string
  strengths: string[]
  fixes: string[]
  recommended_use: 'hero' | 'secondary' | 'reshoot'
}

const SCORER_SYSTEM = `You are an art director for Petite Lavande, a premium organic newborn + postpartum gift brand. Aesthetic: calm French apothecary, soft natural light, generous negative space, botanical. Palette: Cream #FBF4EA, Sage #A7AE95, Lavender #9A80BD, Soft Lilac #C6B2DC, Espresso #41342A, Kraft #BE9D67.
Judge ONLY brand fit and craft (composition, light, color harmony, product clarity, styling). Do NOT predict engagement, reach, or virality. Return ONLY JSON:
{
  "brand_fit": 0-100,
  "craft": 0-100,
  "composite": 0-100,
  "color_on_brand": true|false,
  "verdict": one sentence,
  "strengths": [ up to 3 short strings ],
  "fixes": [ up to 4 specific, actionable strings ],
  "recommended_use": "hero" | "secondary" | "reshoot"
}
Be specific and honest. A pretty but off-palette image should score lower on brand_fit.`

export async function scoreImage(input: {
  base64: string
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp'
  platform: string
  product: string
}): Promise<ImageScore | null> {
  const msg = await anthropic.messages.create({
    model: SONNET,
    max_tokens: 600,
    system: SCORER_SYSTEM,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: input.mediaType, data: input.base64 } },
        { type: 'text', text: `Score this image for a ${input.platform || 'Instagram'} post of ${input.product || 'a Petite Lavande gift'}.` },
      ],
    }],
  })
  const text = msg.content[0]?.type === 'text' ? msg.content[0].text : ''
  const raw = extractJson(text)
  if (!raw) return null
  const clamp = (v: unknown) => Math.min(100, Math.max(0, Math.round(Number(v) || 0)))
  const arr = (v: unknown) => Array.isArray(v) ? v.map(String).slice(0, 4) : []
  const use = ['hero', 'secondary', 'reshoot'].includes(String(raw.recommended_use)) ? raw.recommended_use : 'secondary'
  return {
    brand_fit: clamp(raw.brand_fit),
    craft: clamp(raw.craft),
    composite: clamp(raw.composite ?? (Number(raw.brand_fit) + Number(raw.craft)) / 2),
    color_on_brand: Boolean(raw.color_on_brand),
    verdict: String(raw.verdict ?? '').slice(0, 200),
    strengths: arr(raw.strengths).slice(0, 3),
    fixes: arr(raw.fixes),
    recommended_use: use as ImageScore['recommended_use'],
  }
}

// ── 7.3 Daily strategy + task generator ──────────────────────────────────────
export interface PlanTaskDraft {
  title: string; channel?: string; task_type?: string; why?: string; est_minutes?: number; priority?: number
}
export interface ContentDraft { platform: string; suggested_time?: string; caption_draft?: string; image_brief?: string }
export interface FollowupDraft { contact_or_thread: string; action: string; due?: string }
export interface DailyPlanDraft {
  recap: string
  strategy_note: string
  tasks: PlanTaskDraft[]
  content_plan: ContentDraft[]
  followups: FollowupDraft[]
  flags: string[]
}

const PLANNER_SYSTEM = `You are the marketing+sales operator for Petite Lavande (solo founder, premium organic baby/postpartum gift boxes; DTC at petitelavande.com + B2B corporate gifting). Plan TODAY. Be concrete and ruthless about priority — she has limited hours. Favor the highest-leverage moves: niche partnerships (doulas, registries), B2B follow-ups, micro-influencer gifting, Pinterest/IG, email lifecycle.
You receive data as JSON: sales_trend, outreach sent/replied, follow-ups due, posts logged, tasks done vs open, execution_rate, 7-day trend.
Return ONLY JSON:
{
  "recap": 2-3 sentences on yesterday,
  "strategy_note": <= 4 sentences: the single thing to push today and why,
  "tasks": [ { "title", "channel", "task_type"('sell'|'market'|'ops'), "why", "est_minutes", "priority"(1-5) } ],
  "content_plan": [ { "platform", "suggested_time", "caption_draft", "image_brief" } ],
  "followups": [ { "contact_or_thread", "action", "due" } ],
  "flags": [ short strings — anything overdue, stalled, or worth noticing ]
}
Pivot rule: if sales rose week-over-week and one channel had concentrated effort, add 1-2 tasks doubling down on it. If sales are flat/down for 2+ weeks, SHORTEN the list and propose ONE new channel to test, and explain that pivot in strategy_note.
Constraints: 4-7 tasks, total task minutes <= 180, content_plan 0-2 items. If execution_rate < 0.5 for 3+ days, cut the list shorter and say so in strategy_note. Never invent data you weren't given.`

export async function generateDailyPlan(payload: unknown): Promise<DailyPlanDraft | null> {
  const msg = await anthropic.messages.create({
    model: SONNET,
    max_tokens: 1600,
    system: PLANNER_SYSTEM,
    messages: [{ role: 'user', content: JSON.stringify(payload) }],
  })
  const text = msg.content[0]?.type === 'text' ? msg.content[0].text : ''
  const raw = extractJson(text)
  if (!raw) return null
  const asArr = <T,>(v: unknown): T[] => Array.isArray(v) ? (v as T[]) : []
  return {
    recap: String(raw.recap ?? ''),
    strategy_note: String(raw.strategy_note ?? ''),
    tasks: asArr<PlanTaskDraft>(raw.tasks).slice(0, 7),
    content_plan: asArr<ContentDraft>(raw.content_plan).slice(0, 2),
    followups: asArr<FollowupDraft>(raw.followups),
    flags: asArr<string>(raw.flags).map(String),
  }
}
