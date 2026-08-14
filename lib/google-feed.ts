import { getCatalog, getProductStock, type DbProduct } from './products-db'

// Google Merchant Center feed (US-PRIMARY, USD). One source of truth: the
// same getCatalog the sitemap and product pages use. In-house assembled
// products have no GTIN — identifier_exists:no + mpn (never invent GTINs;
// that's an account-level policy violation). When a product gains a real GS1
// barcode, add a `gtin` column and it will be emitted automatically.

const BASE = (process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com').replace(/\/$/, '')

// Shared with the review feed — identifiers must be byte-identical across
// both feeds or Google fails to match reviews to products.
export const FEED_BRAND = 'Petite Lavande'
export const productFeedUrl = (id: string) => `${BASE}/products/${id}`

// Numeric IDs from Google's official taxonomy file (fetched 2026-07-25 from
// google.com/basepages/producttype/taxonomy-with-ids.en-US.txt):
//   543665 Swaddling Blankets · 182 Baby & Toddler Clothing ·
//   4678 Baby Bathing · 5859 Baby Gift Sets · 469 Health & Beauty
const CATEGORY_IDS: Record<string, number> = {
  swaddle: 543665,
  garment: 182,
  bath: 4678,
  keepsake: 5859,
  mom: 469,
}
const PRODUCT_TYPE: Record<string, string> = {
  swaddle: 'Gift Boxes > Swaddles & Blankets',
  garment: 'Gift Boxes > Baby Clothing',
  bath: 'Gift Boxes > Bath & Body',
  keepsake: 'Gift Boxes > Keepsakes',
  mom: 'Gift Boxes > For Mama',
}

export interface FeedItem {
  id: string
  title: string
  description: string
  link: string
  imageLink: string | null
  availability: 'in_stock' | 'out_of_stock'
  price: string
  categoryId: number
  productType: string
  category: string
  organic: boolean
}

export interface FeedIssue { id: string; problems: string[] }

function absoluteImage(p: DbProduct): string | null {
  const img = p.image ?? null
  if (!img) return null
  if (img.startsWith('http://')) return null // non-HTTPS not allowed
  return img.startsWith('https://') ? img : `${BASE}${img.startsWith('/') ? '' : '/'}${img}`
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Build valid items + a validation report. Invalid items are excluded from
 *  the feed and listed by the validator — never guessed at. */
export async function buildFeed(): Promise<{ items: FeedItem[]; issues: FeedIssue[] }> {
  const products = await getCatalog({ activeOnly: true })
  const items: FeedItem[] = []
  const issues: FeedIssue[] = []

  for (const p of products) {
    const problems: string[] = []
    const title = stripHtml(p.name)
    const description = stripHtml(p.description || '')
    const image = absoluteImage(p)

    if (!title) problems.push('missing title')
    if (title.length > 150) problems.push(`title over 150 chars (${title.length})`)
    if (title !== title.toLowerCase() && title === title.toUpperCase()) problems.push('title is all-caps')
    if (!description) problems.push('missing description')
    if (description.length > 5000) problems.push('description over 5000 chars')
    if (/<[a-z][\s\S]*>/i.test(p.description || '')) problems.push('description contained HTML (stripped)')
    if (!image) problems.push('missing or non-HTTPS image')
    if (!p.price || p.price <= 0) problems.push('missing price')
    if (!CATEGORY_IDS[p.category]) problems.push(`no category mapping for "${p.category}"`)

    // Anything unfixable excludes the item; the stripped-HTML note is advisory.
    const fatal = problems.filter(x => !x.includes('stripped'))
    if (fatal.length) {
      issues.push({ id: p.id, problems })
      continue
    }

    const stock = await getProductStock(p.id, false)
    items.push({
      id: p.id,
      title,
      description,
      link: productFeedUrl(p.id),
      imageLink: image,
      // null stock (no inventory row) falls back to the active flag = in stock
      availability: stock !== null && stock <= 0 ? 'out_of_stock' : 'in_stock',
      price: `${(p.price / 100).toFixed(2)} USD`,
      categoryId: CATEGORY_IDS[p.category],
      productType: PRODUCT_TYPE[p.category] ?? 'Gift Boxes',
      category: p.category,
      organic: !!(p as { organic?: boolean }).organic,
    })
    if (problems.length) issues.push({ id: p.id, problems })
  }
  return { items, issues }
}

const cdata = (s: string) => `<![CDATA[${s.replace(/\]\]>/g, ']]]]><![CDATA[>')}]]>`

export function feedXml(items: FeedItem[]): string {
  const rows = items.map(i => `
  <item>
    <g:id>${i.id}</g:id>
    <g:title>${cdata(i.title)}</g:title>
    <g:description>${cdata(i.description)}</g:description>
    <g:link>${i.link}</g:link>
    <g:image_link>${i.imageLink}</g:image_link>
    <g:availability>${i.availability}</g:availability>
    <g:price>${i.price}</g:price>
    <g:condition>new</g:condition>
    <g:brand>${FEED_BRAND}</g:brand>
    <g:identifier_exists>no</g:identifier_exists>
    <g:mpn>${i.id}</g:mpn>
    <g:google_product_category>${i.categoryId}</g:google_product_category>
    <g:product_type>${cdata(i.productType)}</g:product_type>
  </item>`).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
  <title>Petite Lavande</title>
  <link>${BASE}</link>
  <description>Luxury organic baby and new-mama gift boxes</description>${rows}
</channel>
</rss>`
}
