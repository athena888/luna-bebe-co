import { getBoxProducts, priceRange, type CatalogBoxProduct } from './catalog-db.ts'
import { getCatalog } from './products-db.ts'
import { isShoppingOnly } from './catalog-visibility.ts'
import type { GiftOccasion } from './gifting-copy.ts'

export * from './gifting-copy.ts'

// ── The gifting layer: resolving real products ───────────────────────────────
//
// Everything product-shaped here resolves from the LIVE catalog at request
// time. No slug, price, name or contents list is invented: `preferredSlugs` is
// an ordering preference, and a slug that isn't in the catalog simply doesn't
// appear. When the catalog returns nothing, the calling section renders
// nothing — never a placeholder product.
//
// The copy and configuration half lives in lib/gifting-copy.ts, which imports
// nothing server-side so the header can use it without shipping supabase-js to
// every visitor. Both halves are re-exported here, so callers have one import.

/** Every box product a visitor is allowed to see, cheapest first. */
export async function shoppableBoxes(): Promise<CatalogBoxProduct[]> {
  const all = await getBoxProducts().catch(() => [])
  return all
    .filter(p => !isShoppingOnly(p.slug))
    .sort((a, b) => priceRange(a).low - priceRange(b).low)
}

/**
 * The gifts to show for one occasion, in the order they should appear.
 * Preference first, then anything else in the catalog, so the section is never
 * short of products because a preferred slug was renamed — and never shows a
 * product that doesn't exist because one was.
 */
export async function occasionGifts(occasion: GiftOccasion, limit = 3): Promise<CatalogBoxProduct[]> {
  const boxes = await shoppableBoxes()
  const bySlug = new Map(boxes.map(b => [b.slug, b]))
  const picked: CatalogBoxProduct[] = []
  for (const slug of occasion.preferredSlugs) {
    const b = bySlug.get(slug)
    if (b && !picked.includes(b)) picked.push(b)
  }
  for (const b of boxes) {
    if (picked.length >= limit) break
    if (!picked.includes(b)) picked.push(b)
  }
  return picked.slice(0, limit)
}

export interface GiftTier {
  product: CatalogBoxProduct
  /** 'A little something' / 'The signature' / 'The heirloom' */
  tierLabel: string
  /** One sentence: why choose THIS one. */
  reason: string
  /** Flagged on exactly one card, and only when the catalog supports it. */
  mostLoved: boolean
  low: number
  high: number
}

const TIER_LABELS: [string, string, string] = ['A little something', 'The signature', 'The heirloom']
const TIER_REASONS: [string, string, string] = [
  'For a thoughtful hello — when you want to send something lovely without making an occasion of it.',
  'The Petite Lavande gift: beautiful pieces for the baby, and a moment saved for Mama.',
  'For the biggest moments — the sister, the best friend, the first grandchild.',
]

/**
 * Three products, arranged as an entry / signature / premium ladder from REAL
 * prices. Three is the number: a gift buyer wants to know which one to choose,
 * not what all thirteen objects inside are.
 *
 * The MOST LOVED flag is earned, never decorative — it goes to the product the
 * owner flagged in the catalog, and to nothing otherwise.
 *
 * No budget band is printed: each card already shows its real price, and a
 * "$125–$165" rung label above a "$125–$165" price is noise, not guidance.
 */
export function giftLadder(products: CatalogBoxProduct[]): GiftTier[] {
  if (products.length === 0) return []
  const sorted = [...products].sort((a, b) => priceRange(a).low - priceRange(b).low)
  // Fewer than three real products: show what exists rather than padding.
  const chosen = sorted.length <= 3
    ? sorted
    : [sorted[0], sorted[Math.floor(sorted.length / 2)], sorted[sorted.length - 1]]

  // The middle rung is the signature when there are three; with two, the
  // dearer one is. `featured` is an owner decision in the catalog, so a
  // MOST LOVED badge always reflects something a human actually chose.
  const signatureIndex = chosen.length >= 3 ? 1 : chosen.length - 1

  return chosen.map((product, i) => {
    const { low, high } = priceRange(product)
    const tierIndex = chosen.length >= 3 ? i : (i === signatureIndex ? 1 : 0)
    return {
      product,
      tierLabel: TIER_LABELS[tierIndex],
      reason: TIER_REASONS[tierIndex],
      mostLoved: i === signatureIndex && isFeatured(product),
      low,
      high,
    }
  })
}

function isFeatured(p: CatalogBoxProduct): boolean {
  // `story.most_loved` is an explicit owner flag in the catalog JSON. Absent
  // it, nothing is badged — an unearned badge is a lie the visitor can't check.
  return (p.story as { most_loved?: boolean })?.most_loved === true
}

/** Cover photo for a box product: its hub image, else its first variant photo. */
export function coverImage(p: CatalogBoxProduct): string | null {
  return ((p.story as { hub_image?: string })?.hub_image) || p.variants[0]?.images[0] || null
}

/** One-line reason a gift buyer can act on, from the product's own subtitle. */
export function giftLine(p: CatalogBoxProduct): string {
  return p.subtitle || ''
}

// ── Little companions ────────────────────────────────────────────────────────
//
// The beginning of an original character world. It is built from REAL catalog
// items, never from invented characters: the section resolves soft companion
// pieces out of the keepsake category and presents them with the storybook
// framing the section supplies, rather than as a grid of toy SKUs.
//
// Nothing here asserts a material, an origin or a manufacturing method — the
// only claim made is the item's own name, which is the catalog's.
export interface Companion {
  name: string
  line: string
  href?: string
}

// Words that mark a keepsake item as a companion rather than, say, a name-block
// set or a night light. Matched against the catalog's own product names.
const COMPANION_WORDS = /\b(bunny|rabbit|doll|bear|fox|reindeer|lamb|deer|elephant|companion|crochet|plush|animal|friend)\b/i

export async function getCompanions(limit = 3): Promise<Companion[]> {
  try {
    const catalog = await getCatalog({ activeOnly: true })
    return catalog
      .filter(p => p.category === 'keepsake' && COMPANION_WORDS.test(p.name))
      .slice(0, limit)
      .map(p => ({
        name: p.name,
        // The item's own first sentence — the catalog's words, not ours.
        line: (p.description || '').split(/(?<=\.)\s/)[0] ?? '',
        href: `/products/${p.id}`,
      }))
  } catch {
    return []
  }
}
