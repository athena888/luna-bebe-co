import { getBoxProducts, priceRange } from './catalog-db.ts'
import { isShoppingOnly } from './catalog-visibility.ts'

// The live price range of the boxes a shopper can actually browse, in whole
// dollars. pSEO copy used to hardcode "$85 to $200" — numbers from an earlier
// lineup that drifted to $65–$165 without anyone noticing, which meant 7 of the
// 15 /gifts pages advertised prices the site does not charge (a Merchant-style
// price mismatch, and a trust problem on the landing page itself).
//
// Copy carries {PRICE_LOW} / {PRICE_HIGH} tokens instead of digits, and this
// resolves them at render. Shopping-only boxes are excluded — the $29.97 ad
// landing page is not a price the brand advertises.

const FALLBACK = { low: 65, high: 165 }
let cache: { at: number; val: { low: number; high: number } } | null = null

export async function boxPriceRange(): Promise<{ low: number; high: number }> {
  if (cache && Date.now() - cache.at < 300_000) return cache.val
  try {
    const boxes = (await getBoxProducts()).filter(b => !isShoppingOnly(b.slug))
    const ranges = boxes.map(priceRange)
    if (!ranges.length) return FALLBACK
    const val = {
      low: Math.round(Math.min(...ranges.map(r => r.low)) / 100),
      high: Math.round(Math.max(...ranges.map(r => r.high)) / 100),
    }
    cache = { at: Date.now(), val }
    return val
  } catch {
    return FALLBACK   // never let a DB hiccup take down a landing page
  }
}

/** Resolve {PRICE_LOW} / {PRICE_HIGH} in landing-page copy. */
export function fillPrices(text: string, range: { low: number; high: number }): string {
  return text
    .replace(/\{PRICE_LOW\}/g, `$${range.low}`)
    .replace(/\{PRICE_HIGH\}/g, `$${range.high}`)
}
