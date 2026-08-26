// "Founding Families" launch promotion — the first 30 boxes.
//
// PURE by design (no Supabase, no network): the storefront, both Merchant
// feeds, the Stripe checkout and the consistency checker all resolve a sale
// price through this one file. If they each did their own arithmetic they
// would drift, and a feed price that disagrees with the landing page price is
// exactly what Merchant Center disapproves for.
//
// The live on/off decision needs the order count, which needs the database —
// that lives in lib/promo-state.ts so this module stays unit-testable.

/** Attribution only. Adds no further discount — see lib/stripe-discounts.ts. */
export const FOUNDING_CODE = 'FOUNDING30'

/** How many boxes the promotion covers. The badge counts DOWN from here. */
export const FOUNDING_LIMIT = 20

/**
 * Per-tier prices, in cents. A nominal 15% off, rounded to clean fives so the
 * prices read as chosen rather than calculated — which puts every tier between
 * 15.2% and 16.0%. The copy therefore claims "15% off": every customer gets at
 * least that and no tier is overstated. $105 sits deliberately above the $100
 * free-shipping bar, so that box is not discounted twice.
 */
export const FOUNDING_TIERS: Record<number, number> = {
  6500: 5500,    // $65 → $55   (15.4% off)
  9500: 8000,    // $95 → $80   (15.8% off)
  12500: 10500,  // $125 → $105 (16.0% off)
  16500: 14000,  // $165 → $140 (15.2% off)
}

/** Deepest discount in the table. Copy must never claim MORE than this. */
export const FOUNDING_MAX_PERCENT = Math.max(
  ...Object.entries(FOUNDING_TIERS).map(([full, sale]) => Math.round((1 - Number(sale) / Number(full)) * 100))
)

/**
 * Window. The end date is what Product JSON-LD advertises as
 * priceValidUntil, so it must be a real date rather than "whenever we stop":
 * Google treats an expired priceValidUntil as a stale offer.
 * Both are overridable so the dates aren't buried in a deploy.
 */
export const FOUNDING_START = process.env.FOUNDING_START ?? '2026-08-25T00:00:00.000Z'
export const FOUNDING_END = process.env.FOUNDING_END ?? '2026-09-30T23:59:59.000Z'

/** Kill switch — set FOUNDING_PROMO_ACTIVE=false to end the promo early. */
export const FOUNDING_FORCED_OFF = process.env.FOUNDING_PROMO_ACTIVE === 'false'

/**
 * Badge copy. It COUNTS DOWN rather than restating the total: "first 20 boxes"
 * is a claim, "20 left" is a reason to buy today, and a number that visibly
 * moves is the whole point of a founding promotion rather than a sale.
 *
 * Singular is handled per language — "1 left"/"queda 1" and "2 left"/"quedan 2"
 * do not share a form in Spanish.
 */
export function foundingBadge(remaining: number, locale: 'en' | 'es' = 'en'): string {
  const n = Math.max(0, Math.floor(remaining))
  if (locale === 'es') {
    return n === 1 ? 'Familias Fundadoras — queda 1' : `Familias Fundadoras — quedan ${n}`
  }
  return n === 1 ? 'Founding Families — 1 left' : `Founding Families — ${n} left`
}

/** Static form, for surfaces with no access to the live count (e.g. emails). */
export const FOUNDING_BADGE = {
  en: `Founding Families — first ${FOUNDING_LIMIT} boxes`,
  es: `Familias Fundadoras — primeras ${FOUNDING_LIMIT} cajas`,
} as const

/**
 * Sale price for a regular price, or null when this price isn't a promo tier.
 * Returning null (rather than a computed percentage) is deliberate: only the
 * four listed box tiers are on sale. A standalone blanket at $38 has no entry
 * and therefore no sale, which is how single items stay out of the promotion
 * without a separate exclusion list to keep in sync.
 */
export function foundingSalePrice(regularCents: number): number | null {
  const sale = FOUNDING_TIERS[regularCents]
  return sale != null && sale < regularCents ? sale : null
}

/** Is `when` inside the promo window? */
export function inFoundingWindow(when: Date): boolean {
  const t = when.getTime()
  return t >= Date.parse(FOUNDING_START) && t <= Date.parse(FOUNDING_END)
}

export interface PricedVariant { price: number; salePrice: number | null }

/**
 * The one function every caller should use: given a regular price and whether
 * the promo is live, what does the customer pay and what do we strike through?
 */
export function resolvePrice(regularCents: number, promoLive: boolean): PricedVariant {
  const sale = promoLive ? foundingSalePrice(regularCents) : null
  return { price: regularCents, salePrice: sale }
}

/** What the customer is actually charged. */
export function effectivePrice(p: PricedVariant): number {
  return p.salePrice ?? p.price
}

/**
 * Google's sale_price_effective_date: two ISO-8601 instants separated by "/".
 * Merchant Center ignores a sale_price whose window has lapsed, so this must
 * agree with the JSON-LD priceValidUntil the landing page publishes.
 */
export function saleEffectiveDate(): string {
  return `${FOUNDING_START}/${FOUNDING_END}`
}

/** JSON-LD priceValidUntil wants a plain date, not a timestamp. */
export function priceValidUntil(): string {
  return FOUNDING_END.slice(0, 10)
}
