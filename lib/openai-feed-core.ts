// OpenAI Ads product feed — PURE core (no database, no network), so every rule
// below is unit-testable and the hosted route and the local export share one
// implementation.
//
// Implemented against the stable spec at
// https://developers.openai.com/commerce/specs/file-upload/products
// (fetched 2026-08-21). Deliberately shares NO code with the Google Merchant
// feed: lib/google-feed*.ts must stay untouched, and coupling the two would
// risk a Merchant re-review every time this file changed.

export const FEED_BRAND = 'Petite Lavande'
export const FEED_SELLER = 'Petite Lavande'
export const FEED_COUNTRY = 'US'
export const FEED_CURRENCY = 'USD'
export const HOST = 'https://petitelavande.com'

/** Spec limits. Titles/descriptions are trimmed for the FEED only — the
 *  database copy is never rewritten. */
export const TITLE_MAX = 150
export const DESCRIPTION_MAX = 5000

export type Availability = 'in_stock' | 'out_of_stock' | 'pre_order' | 'backorder' | 'unknown'
const AVAILABILITY_VALUES: Availability[] = ['in_stock', 'out_of_stock', 'pre_order', 'backorder', 'unknown']

/** What a caller hands us: already-resolved facts from the store, no guessing. */
export interface FeedInput {
  itemId: string
  title: string
  description: string
  url: string
  imageUrl: string | null
  additionalImageUrls?: string[]
  priceCents: number
  salePriceCents?: number | null
  availability: Availability
  productCategory?: string
  groupId?: string | null
  variantLabel?: string | null
  ageGroup?: 'newborn' | 'infant' | 'toddler' | 'kids' | 'adult' | null
  adsMetadata?: Record<string, string>
}

export interface FeedRow { [column: string]: string }
export interface Rejection { itemId: string; reasons: string[] }
export interface BuildResult { rows: FeedRow[]; rejected: Rejection[] }

// Column order is the header order. Every Required field in the spec is here,
// plus the flags Emily fixed for this feed and the optional fields we can fill
// truthfully from real product data.
export const COLUMNS = [
  'item_id', 'title', 'description', 'url', 'image_url', 'price', 'availability',
  'brand', 'seller_name', 'target_countries',
  'is_ads_eligible', 'is_eligible_search', 'is_eligible_checkout',
  'condition', 'is_digital', 'identifier_exists',
  'sale_price', 'additional_image_urls', 'product_category', 'group_id',
  'item_group_title', 'age_group', 'ads_metadata',
] as const

/** "129.00 USD" — never "$129", never a bare number. */
export function formatPrice(cents: number, currency = FEED_CURRENCY): string {
  return `${(cents / 100).toFixed(2)} ${currency}`
}

/** Feed text must be plain: no HTML, no markdown emphasis, no runaway space. */
export function plainText(input: string): string {
  return (input ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6])>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')          // markdown image
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')        // markdown link keeps its text
    .replace(/[*_`#>]+/g, ' ')                      // markdown emphasis marks
    .replace(/\s+/g, ' ')
    .trim()
}

/** Trim to a limit on a word boundary — never mid-word. */
export function clamp(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim()
}

const HTTPS_URL = /^https:\/\/[^\s"<>]+$/i
const IMAGE_EXT = /\.(jpe?g|png)(\?|$)/i

function validate(input: FeedInput, seen: Set<string>): string[] {
  const reasons: string[] = []
  const id = (input.itemId ?? '').trim()
  if (!id) reasons.push('missing item_id')
  else if (id.length > 100) reasons.push('item_id over 100 chars')
  else if (seen.has(id)) reasons.push('duplicate item_id')

  if (!plainText(input.title)) reasons.push('missing title')
  if (!plainText(input.description)) reasons.push('empty description')

  if (!input.url) reasons.push('missing url')
  else if (!HTTPS_URL.test(input.url)) reasons.push('malformed url')
  else if (!input.url.startsWith(`${HOST}/`)) reasons.push('url is not on the canonical host')

  if (!input.imageUrl) reasons.push('missing image')
  else if (!HTTPS_URL.test(input.imageUrl)) reasons.push('malformed image url')
  else if (!IMAGE_EXT.test(input.imageUrl)) reasons.push('image is not JPEG/PNG')

  if (!Number.isFinite(input.priceCents) || input.priceCents <= 0) reasons.push('invalid price')
  if (input.salePriceCents != null) {
    if (!Number.isFinite(input.salePriceCents) || input.salePriceCents <= 0) reasons.push('invalid sale price')
    else if (input.salePriceCents >= input.priceCents) reasons.push('sale price is not below price')
  }

  if (!AVAILABILITY_VALUES.includes(input.availability)) reasons.push('invalid availability')
  return reasons
}

/**
 * Turn resolved product facts into validated feed rows.
 * A product that fails validation is REPORTED and dropped — one bad row can
 * never corrupt the file.
 */
export function buildRows(inputs: FeedInput[]): BuildResult {
  const rows: FeedRow[] = []
  const rejected: Rejection[] = []
  const seen = new Set<string>()

  for (const input of inputs) {
    const reasons = validate(input, seen)
    if (reasons.length) {
      rejected.push({ itemId: input.itemId || '(no id)', reasons })
      continue
    }
    seen.add(input.itemId.trim())

    rows.push({
      item_id: input.itemId.trim(),
      title: clamp(plainText(input.title), TITLE_MAX),
      description: clamp(plainText(input.description), DESCRIPTION_MAX),
      url: input.url,
      image_url: input.imageUrl as string,
      price: formatPrice(input.priceCents),
      availability: input.availability,
      brand: FEED_BRAND,
      seller_name: FEED_SELLER,
      target_countries: FEED_COUNTRY,
      is_ads_eligible: 'true',
      // Ads-only feed. The spec ties is_eligible_checkout to search (checkout
      // requires search=true); both are false here, which is consistent — we
      // are not enabling OpenAI search or checkout.
      is_eligible_search: 'false',
      is_eligible_checkout: 'false',
      condition: 'new',
      is_digital: 'false',
      // Hand-assembled gift boxes carry no GTIN and we never invent one.
      identifier_exists: 'no',
      sale_price: input.salePriceCents != null ? formatPrice(input.salePriceCents) : '',
      additional_image_urls: (input.additionalImageUrls ?? [])
        .filter(u => HTTPS_URL.test(u) && IMAGE_EXT.test(u))
        .join(','),
      product_category: input.productCategory ?? '',
      group_id: input.groupId ?? '',
      item_group_title: input.variantLabel ? clamp(plainText(input.variantLabel), TITLE_MAX) : '',
      age_group: input.ageGroup ?? '',
      ads_metadata: input.adsMetadata && Object.keys(input.adsMetadata).length
        ? JSON.stringify(input.adsMetadata)
        : '',
    })
  }
  return { rows, rejected }
}

/** RFC 4180 escaping: quote when the value holds a comma, quote, CR or LF, and
 *  double any embedded quote. JSON metadata and French accents pass through
 *  untouched because the file is UTF-8. */
export function csvCell(value: string): string {
  const v = value ?? ''
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

export function toCsv(rows: FeedRow[]): string {
  const header = COLUMNS.join(',')
  const body = rows.map(r => COLUMNS.map(c => csvCell(r[c] ?? '')).join(','))
  return [header, ...body].join('\r\n') + '\r\n'
}
