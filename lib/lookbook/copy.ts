import { anthropic } from '../anthropic'
import { supabaseAdmin } from '../supabase'
import { getConfig } from '../pipeline/config'
import { getBoxProducts } from '../catalog-db'

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

interface OverlayRow {
  product_slug: string; variant_key: string
  corporate_price_10: number | null; corporate_price_25: number | null; corporate_price_50: number | null
  description: string | null
}

// Tiers mirror the LIVE catalog: one row per active, visible box variant (SKU).
// Name, retail price, and order come from catalog_products/catalog_variants;
// only the corporate fields (10/25/50 pricing + one-liner) are lookbook-owned,
// in lookbook_tier_overlay keyed by product_slug+variant_key. Unset corporate
// prices default to ~5/10/15% off retail. Falls back to the legacy hand-seeded
// catalog_tiers rows until §46 (catalog restructure) has run.
const pctOff = (usd: number, pct: number) => Math.round(usd * (1 - pct / 100))

export async function getTiers(): Promise<CatalogTier[]> {
  const products = await getBoxProducts()
  if (!products.length) {
    const { data } = await supabaseAdmin.from('catalog_tiers').select('*').order('sort')
    return (data ?? []) as CatalogTier[]
  }
  const { data: overlays } = await supabaseAdmin.from('lookbook_tier_overlay').select('*')
  const byKey = new Map(((overlays ?? []) as OverlayRow[]).map(o => [`${o.product_slug}:${o.variant_key}`, o]))
  const tiers: CatalogTier[] = []
  for (const p of products) {
    for (const v of p.variants) {
      const id = `${p.slug}:${v.key}`
      const o = byKey.get(id)
      const usd = Math.round(v.price / 100)   // catalog_variants.price is cents
      tiers.push({
        id,
        name: p.variants.length > 1 ? `${p.name} — ${v.label}` : p.name,
        price: usd,
        corporate_price_10: o?.corporate_price_10 ?? pctOff(usd, 5),
        corporate_price_25: o?.corporate_price_25 ?? pctOff(usd, 10),
        corporate_price_50: o?.corporate_price_50 ?? pctOff(usd, 15),
        description: o?.description ?? p.subtitle ?? null,
        sort: tiers.length,
      })
    }
  }
  return tiers
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
 "tier_descriptions": { "<tier name>": string (one line, ≤18 words), ... } — keys must be EXACTLY the tier names as listed, with nothing appended (no price, no dash),
 "corporate_blurb": string (2–3 sentences on the corporate program: per-box pricing at 10/25/50, an optional printed gift tag with the client's logo hung on the ribbon — NEVER call it printing ON the ribbon — handled end-to-end)}`

const norm = (s: string) => s.normalize('NFC').toLowerCase().trim()

/** Exact field, else any key whose normalized name contains the candidate. */
function pickField(raw: Record<string, unknown>, ...candidates: string[]): string {
  for (const c of candidates) {
    if (typeof raw[c] === 'string') return (raw[c] as string).trim()
  }
  for (const c of candidates) {
    const k = Object.keys(raw).find(key => norm(key).includes(norm(c)) && typeof raw[key] === 'string')
    if (k) return (raw[k] as string).trim()
  }
  return ''
}

function parseCopy(text: string, tiers: CatalogTier[]): LookbookCopy {
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) throw new Error('Copy assist returned no JSON')
  const raw = JSON.parse(m[0]) as Record<string, unknown>
  const tierDescriptions: Record<string, string> = {}
  const rawTiers = (raw.tier_descriptions ?? raw.tiers ?? {}) as Record<string, unknown>
  // Tolerant key matching — the model has returned keys like "Petit Nuage — $85"
  // (echoing the prompt's list format) and may vary unicode normalization.
  const rawKeys = Object.keys(rawTiers)
  for (const t of tiers) {
    const want = norm(t.name)
    const key = rawKeys.find(k => norm(k) === want) ?? rawKeys.find(k => norm(k).startsWith(want))
    tierDescriptions[t.name] = String((key ? rawTiers[key] : '') ?? '').trim()
  }
  return {
    tagline: pickField(raw, 'tagline'),
    brand_story: pickField(raw, 'brand_story', 'story'),
    tier_descriptions: tierDescriptions,
    corporate_blurb: pickField(raw, 'corporate_blurb', 'corporate', 'blurb'),
  }
}

const isComplete = (c: LookbookCopy, tiers: CatalogTier[]) =>
  Boolean(c.tagline && c.brand_story && c.corporate_blurb)
  && tiers.every(t => c.tier_descriptions[t.name])

export async function draftLookbookCopy(tiers: CatalogTier[], corporate: CorporateFields): Promise<LookbookCopy> {
  let best: LookbookCopy | null = null
  // The model occasionally omits or renames a field — one retry, keep the best.
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: COPY_SYSTEM,
      messages: [{
        role: 'user',
        content: `Tiers (use these EXACT names as tier_descriptions keys):\n${tiers.map(t => `- ${t.name} — $${t.price}${t.description ? ` (${t.description})` : ''}`).join('\n')}\n\nCorporate details: logo gift tag: ${corporate.logo_ribbon || 'available'}; lead time: ${corporate.lead_time || '2–3 weeks'}; contact: ${corporate.contact_line || 'hello@petitelavande.com'}.\n\nDraft the lookbook copy. Include ALL four fields.`,
      }],
    })
    const text = res.content.filter(b => b.type === 'text').map(b => (b as { text: string }).text).join('')
    try {
      const copy = parseCopy(text, tiers)
      if (isComplete(copy, tiers)) return copy
      if (!best) best = copy
    } catch (e) {
      console.error('copy-assist parse failed (attempt', attempt + 1, '):', e)
    }
  }
  if (!best) throw new Error('Copy assist returned no usable JSON')
  return best   // partial — every field is editable in the builder anyway
}
