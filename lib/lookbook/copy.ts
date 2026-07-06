import { anthropic } from '../anthropic'
import { supabaseAdmin } from '../supabase'
import { getConfig } from '../pipeline/config'

// AI copy assist for the lookbook builder. Always DRAFT-ONLY — every field is
// editable in the builder, and nothing reaches a published PDF without Emily's
// explicit publish click (which additionally runs the banned-phrase gate).

export interface CatalogTier {
  id: string
  name: string
  price: number
  corporate_price_10: number | null
  corporate_price_25: number | null
  corporate_price_50: number | null
  description: string | null
  sort: number
}

export interface CorporateFields {
  logo_ribbon?: string
  lead_time?: string
  contact_line?: string
}

export interface LookbookCopy {
  tagline: string
  brand_story: string
  tier_descriptions: Record<string, string>   // tier name → one line
  corporate_blurb: string
}

export async function getTiers(): Promise<CatalogTier[]> {
  const { data } = await supabaseAdmin.from('catalog_tiers').select('*').order('sort')
  return (data ?? []) as CatalogTier[]
}

export async function getCorporateFields(): Promise<CorporateFields> {
  const v = await getConfig<CorporateFields & { include_in_first_touch?: boolean }>('lookbook')
  return { logo_ribbon: v?.logo_ribbon, lead_time: v?.lead_time, contact_line: v?.contact_line }
}

const COPY_SYSTEM = `You draft copy for a 1–2 page corporate lookbook PDF for Petite Lavande — organic newborn & postpartum gift boxes, finished by hand in Seattle. French-apothecary positioning; the brand sees the mother, not just the baby.

Voice: warm but not saccharine. Quiet, not loud. Confident, not apologetic. Specific, not vague. Never "luxury", "premium" or "curated" used flatly. No urgency, no exclamation marks.

HARD COMPLIANCE RULES — violating any of these makes the output unusable:
- Organic-cotton claims ONLY as: "organic cotton, made by a GOTS-certified manufacturer" — and only about garments. Never call a product, box, or the brand "GOTS certified". Never reference a GOTS logo.
- Never use "therapy" or "therapeutic" — say "relaxation".
- No medical claims (nothing cures, treats, heals, or relieves any condition).
- No invented testimonials, client names, or client logos.
- Do not invent traction, awards, or press.

Respond with ONLY a JSON object:
{"tagline": string (≤10 words, for the cover),
 "brand_story": string (exactly 2 sentences),
 "tier_descriptions": { "<tier name>": string (one line, ≤18 words), ... },
 "corporate_blurb": string (2–3 sentences on the corporate program: per-box pricing at 10/25/50, optional logo ribbon, handled end-to-end)}`

export async function draftLookbookCopy(tiers: CatalogTier[], corporate: CorporateFields): Promise<LookbookCopy> {
  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1200,
    system: COPY_SYSTEM,
    messages: [{
      role: 'user',
      content: `Tiers:\n${tiers.map(t => `- ${t.name} — $${t.price}${t.description ? ` (${t.description})` : ''}`).join('\n')}\n\nCorporate details: logo ribbon: ${corporate.logo_ribbon || 'available'}; lead time: ${corporate.lead_time || '2–3 weeks'}; contact: ${corporate.contact_line || 'hello@petitelavande.com'}.\n\nDraft the lookbook copy.`,
    }],
  })
  const text = res.content.filter(b => b.type === 'text').map(b => (b as { text: string }).text).join('')
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) throw new Error('Copy assist returned no JSON')
  const raw = JSON.parse(m[0]) as Record<string, unknown>
  const tierDescriptions: Record<string, string> = {}
  const rawTiers = (raw.tier_descriptions ?? {}) as Record<string, unknown>
  for (const t of tiers) tierDescriptions[t.name] = String(rawTiers[t.name] ?? '').trim()
  return {
    tagline: String(raw.tagline ?? '').trim(),
    brand_story: String(raw.brand_story ?? '').trim(),
    tier_descriptions: tierDescriptions,
    corporate_blurb: String(raw.corporate_blurb ?? '').trim(),
  }
}
