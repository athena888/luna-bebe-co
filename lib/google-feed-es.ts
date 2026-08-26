import { getBoxProducts, pieceCount } from './catalog-db.ts'
import { getTranslations } from './i18n.ts'
import { FEED_BRAND } from './google-feed.ts'

// Spanish (es-US) Google Merchant feed — a SEPARATE primary feed for the same
// merchant (5829406914), targeting US / Spanish.
//
// It deliberately shares no mutable state with lib/google-feed-tsv.ts. That
// feed is frozen: any change to an English title, description, image, link or
// id re-triggers Merchant Center review and costs up to three business days of
// approval. This module reads the same catalog rows and applies the same
// price/availability/category rules, but writes its own columns.
//
// THE RULE THIS FILE EXISTS TO ENFORCE: Spanish copy comes from the
// `translations` table — the same source of truth the /es/ pages read through
// lib/i18n.ts — and from nowhere else. A feed row is never machine-translated
// at build time. Submitting English text under content_language=es is a
// misrepresentation Google can suspend an account for, so a box without
// approved Spanish copy is SKIPPED and reported rather than passed through in
// English.

const HOST = 'https://petitelavande.com'
export const ES_CONTENT_LANGUAGE = 'es'
export const ES_TARGET_COUNTRY = 'US'

/** Google taxonomy 5859 = Baby & Toddler > Baby Gift Sets (verified 2026-08-14). */
const BABY_GIFT_SETS = '5859'

// Structural scaffolding only — joining words, not product copy. These mirror
// how the /es/ pages get their chrome (the ES_UI dictionary in lib/i18n.ts):
// developer drafts pending the same native review as the rest of es-US. No
// product name, benefit or claim is ever generated here.
const ES_SCAFFOLD = {
  pieces: 'piezas',
  handPacked: 'empacadas a mano',
  cardIncluded: 'Incluye tarjeta personalizada.',
} as const

/**
 * Fields a box needs before it may appear in the Spanish feed at all.
 * Mirrors ES_PRODUCT_REQUIRED in lib/i18n.ts: below this bar the /es/ page is
 * an English fallback, and an English fallback must not be advertised to
 * Google as Spanish inventory.
 */
export const ES_BOX_REQUIRED = ['name', 'subtitle'] as const

export interface EsFeedRow { [column: string]: string }
export interface EsSkip { id: string; slug: string; missing: string[] }
export interface EsFeedResult { rows: EsFeedRow[]; skipped: EsSkip[] }

// Column order is the header order. Same required attributes as the English
// feed, plus the two that make this feed Spanish.
export const ES_HEADER = [
  'id', 'title', 'description', 'link', 'image_link', 'price', 'availability',
  'condition', 'brand', 'identifier_exists', 'google_product_category',
  'age_group', 'gender', 'item_group_id', 'product_type',
  'content_language', 'target_country', 'custom_label_0', 'custom_label_1',
] as const

const clean = (s: string) => s.replace(/[\t\n\r]+/g, ' ').replace(/\s{2,}/g, ' ').trim()

function tier(priceUsd: number): 'entry' | 'mid' | 'premium' {
  if (priceUsd < 80) return 'entry'
  if (priceUsd <= 120) return 'mid'
  return 'premium'
}

// Same rule as the English feed so the two stay consistent per item_group.
function gender(label: string): 'female' | 'male' | 'unisex' {
  if (/girl|pink|strawberry|niña|rosa|fresa/i.test(label)) return 'female'
  if (/boy|blue|niño|azul/i.test(label)) return 'male'
  return 'unisex'
}

/**
 * Build the Spanish feed rows.
 *
 * Every price, image, availability and grouping value is taken from the same
 * catalog rows the English feed reads, so the two feeds can never disagree
 * about what a box costs or whether it is in stock. Only the language-bearing
 * columns differ, and those come from `translations`.
 */
export async function buildEsFeedRows(): Promise<EsFeedResult> {
  const boxes = await getBoxProducts()
  const rows: EsFeedRow[] = []
  const skipped: EsSkip[] = []
  if (!boxes.length) return { rows, skipped }

  // One round trip per entity type rather than per product.
  const boxEs = await getTranslations('catalog_product', boxes.map(b => b.slug))
  const variantIds = boxes.flatMap(b => b.variants.map(v => `${b.slug}:${v.key}`))
  const variantEs = await getTranslations('catalog_variant', variantIds)
  const itemIds = [...new Set(boxes.flatMap(b => b.variants.flatMap(v => v.contents.map(c => c.item.id))))]
  const itemEs = await getTranslations('product', itemIds)

  for (const b of boxes) {
    const t = boxEs.get(b.slug) ?? {}
    const missing = ES_BOX_REQUIRED.filter(f => !t[f])
    if (missing.length) {
      // Reported, never guessed. Enter the copy in `translations`
      // (entity_type 'catalog_product', locale 'es', approved true) and the
      // box appears in the next fetch with no code change.
      skipped.push({ id: `box-${b.slug}`, slug: b.slug, missing: [...missing] })
      continue
    }

    const many = b.variants.length > 1
    for (const v of b.variants) {
      const vt = variantEs.get(`${b.slug}:${v.key}`) ?? {}
      // A variant label that has no Spanish falls back to the label as stored:
      // these are proper nouns and colourways ("Strawberry", "Neutral"), not
      // sentences, and the box itself is already gated on real Spanish copy.
      const label = vt.label || v.label

      // Contents in Spanish where an approved translation exists, otherwise
      // the item's own name — item names are largely French/proper nouns that
      // stay as-is in every locale (see lib/i18n.ts rule 4).
      const contents = v.contents
        .map(c => `${itemEs.get(c.item.id)?.name || c.item.name}${c.qty > 1 ? ` (x${c.qty})` : ''}`)
        .join(', ')

      const pieces = pieceCount(v)
      const link = many
        ? `${HOST}/es/canastillas/${b.slug}?${b.variantParam}=${encodeURIComponent(v.key)}`
        : `${HOST}/es/canastillas/${b.slug}`

      rows.push({
        // English id + "-es" so the two feeds are traceable to each other
        // while staying distinct offers in Merchant Center.
        id: `box-${b.slug}--${v.key}-es`,
        title: clean(`${t.name}${many ? ` — ${label}` : ''}`).slice(0, 150),
        description: clean(
          `${t.subtitle} — ${pieces} ${ES_SCAFFOLD.pieces} ${ES_SCAFFOLD.handPacked}: ${contents}. ${ES_SCAFFOLD.cardIncluded}`
        ).slice(0, 5000),
        link,
        image_link: v.images[0] ?? '',
        price: `${(v.price / 100).toFixed(2)} USD`,
        availability: 'in_stock',
        condition: 'new',
        brand: FEED_BRAND,
        identifier_exists: 'false',
        google_product_category: BABY_GIFT_SETS,
        age_group: b.slug === 'new-mom-gift-box' ? '' : 'newborn',
        gender: gender(v.label),
        item_group_id: many ? `box-${b.slug}-es` : '',
        product_type: 'Baby Gifts > Gift Boxes',
        content_language: ES_CONTENT_LANGUAGE,
        target_country: ES_TARGET_COUNTRY,
        custom_label_0: 'box',
        custom_label_1: tier(v.price / 100),
      })
    }
  }
  return { rows, skipped }
}

/** Rows → the TSV body Merchant Center fetches. */
export function toEsTsv(rows: EsFeedRow[]): string {
  const lines = [ES_HEADER.join('\t')]
  for (const r of rows) lines.push(ES_HEADER.map(c => r[c] ?? '').join('\t'))
  return lines.join('\n') + '\n'
}

export async function buildEsProductTsv(): Promise<{ tsv: string; rows: number; skipped: EsSkip[] }> {
  const { rows, skipped } = await buildEsFeedRows()
  return { tsv: toEsTsv(rows), rows: rows.length, skipped }
}
