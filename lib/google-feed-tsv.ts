import { buildFeed, FEED_BRAND, type FeedItem } from './google-feed.ts'
import { supabaseAdmin } from './supabase.ts'
import { getBoxProducts, pieceCount } from './catalog-db.ts'
import { scrubGots, scrubHardship } from './feed-copy.ts'
import { foundingSalePrice, saleEffectiveDate } from './promo.ts'
import { foundingPromoState } from './promo-state.ts'

// Google Merchant TSV feed (/product-feed.tsv) — built ON TOP of the XML
// feed's buildFeed(), so price and availability can never disagree with the
// product pages / JSON-LD (one source of cents, one stock rule).
//
// Emily's 2026-08-14 QA pass:
//  • color + size columns (color/size stripped OUT of titles)
//  • unique per-variant links (?variant=N)
//  • host normalized to the canonical bare petitelavande.com (www doesn't
//    even resolve — feed links must match the site canonical)
//  • taxonomy verified against Google's taxonomy-with-ids file: teethers 566,
//    pacifier clips 7016, plush/loveys 1259, knit blankets 1985, swaddles
//    543665, bibs 2125, bath additives 2522, apparel 182, boxes 5859
//    (spec's 5394 is climbing crampons; 1613/1239 don't exist)
//  • NO GOTS claims in feed copy until gots_certified is confirmed per
//    product (§49) — organic products say "Organic Cotton".

const HOST = 'https://petitelavande.com'
const canonical = (url: string) => url.replace(/^https?:\/\/(www\.)?petitelavande\.com/, HOST)

const FEED_KEYWORDS: Record<string, string> = {
  swaddle: 'Organic Baby Blanket & Swaddle',
  garment: 'Organic Cotton Newborn Clothing',
  bath: 'Calming Baby Bath Gift',
  keepsake: 'Baby Shower Keepsake Gift',
  mom: 'New Mom Self-Care Gift',
}

// Verified taxonomy ids (see header comment). Most-specific match wins.
function googleCategory(item: FeedItem): number {
  const t = item.title.toLowerCase()
  if (/teeth/.test(t)) return 566                          // Pacifiers & Teethers
  if (/pacifier clip/.test(t)) return 7016                 // Pacifier Clips & Holders
  if (/(doll|bunny|companion|lovey|fox trio)/.test(t)) return 1259 // Stuffed Animals
  if (/bib/.test(t)) return 2125                           // Nursing & Feeding > Bibs
  if (/swaddle/.test(t)) return 543665                     // Swaddling Blankets
  if (/blanket/.test(t)) return 1985                       // Bedding > Blankets
  if (/(bath|salt|melt)/.test(t)) return 2522              // Bath Additives
  if (item.category === 'garment') return 182              // Baby & Toddler Clothing
  return item.categoryId
}

function gender(title: string): 'female' | 'male' | 'unisex' {
  if (/\bgirl\b|\bpink\b/i.test(title)) return 'female'
  if (/\bboy\b|\bblue\b/i.test(title)) return 'male'
  return 'unisex'
}

function tier(priceUsd: number): 'entry' | 'mid' | 'premium' {
  if (priceUsd < 80) return 'entry'
  if (priceUsd <= 120) return 'mid'
  return 'premium'
}

// Display names like "Bunny & Me Knit Blanket - Blue" carry the colorway in
// the name — the feed moves it to the color column and keeps the clean title.
const COLOR_WORDS = /^(blue|pink|purple|mint|yellow|cream|beige|sand|oat|sage|lavender|white|grey|gray|blush|rose|natural)([ /-]+(blue|pink|purple|mint|yellow|cream|beige|sand|oat|sage|lavender|white|grey|gray|blush|rose|natural))*$/i
function splitNameColor(title: string): { title: string; color: string } {
  const m = title.match(/^(.*?)\s[-–]\s([A-Za-z/ ]+)$/)
  if (m && COLOR_WORDS.test(m[2].trim())) return { title: m[1].trim(), color: m[2].trim() }
  return { title, color: '' }
}

function titleCase(s: string): string {
  return s.replace(/\b[a-z]/g, c => c.toUpperCase())
}

function feedSize(size: string): string {
  if (!size || size === 'one-size') return 'One Size'
  return /^\d+-\d+$/.test(size) ? `${size}M` : size
}

export function feedTitle(item: FeedItem): string {
  const cleanName = splitNameColor(item.title).title
  const isBlanket = /(blanket|swaddle)/i.test(cleanName)
  const isMama = item.category === 'mom' || item.category === 'bath'
  const kw = isBlanket ? 'Organic Baby Blanket & Swaddle' : FEED_KEYWORDS[item.category] ?? 'Organic Baby Gift'
  // Claims must be literally true per product: fiber claims only when the
  // organic flag is set; GOTS wording reserved for gots_certified (§49).
  const attr = isMama && !isBlanket
    ? (item.organic ? 'Organic Botanicals' : 'Self-Care for New Mothers')
    : (item.organic ? 'Organic Cotton' : 'Handmade for Newborns')
  return `${kw} – ${attr} – ${cleanName}`.slice(0, 150)
}

const clean = (s: string) => s.replace(/[\t\n\r]+/g, ' ').trim()

// Ad-spend control (Emily 2026-08-16): custom_label_0 = box | single-item so
// campaigns can target boxes only; excluded_destination = Shopping_ads on ALL
// single items (blankets included — "make it not consume my campaign") keeps
// them out of paid ads while remaining in free listings. The old price-tier
// label moved to custom_label_1. New columns are appended (additive) — no
// existing column's position or values change except custom_label_0's value,
// and custom labels never re-trigger Merchant review.
const HEADER = [
  'id', 'title', 'description', 'link', 'image_link', 'price', 'availability',
  'condition', 'brand', 'identifier_exists', 'google_product_category',
  'age_group', 'gender', 'item_group_id', 'product_type', 'custom_label_0',
  'sale_price', 'color', 'size', 'custom_label_1', 'excluded_destination',
  // Appended for the Founding Families promo. Google pairs sale_price with
  // this window; without it a sale_price is honoured indefinitely.
  'sale_price_effective_date',
]

export async function buildProductTsv(): Promise<string> {
  const { items } = await buildFeed()

  // One decision for the whole file: if the promo is off (sold out, outside
  // its window, killed by env, or the count is unknown) every row ships at
  // regular price. Resolving it once means rows cannot disagree with each
  // other mid-build.
  const promo = await foundingPromoState()
  const saleWindow = saleEffectiveDate()

  const { data: variantRows } = await supabaseAdmin
    .from('product_variants')
    .select('product_id, color, size, quantity')
    .in('product_id', items.map(i => i.id))
  const variantsByProduct = new Map<string, Array<{ color: string; size: string; quantity: number }>>()
  for (const v of (variantRows ?? []) as Array<{ product_id: string; color: string; size: string; quantity: number }>) {
    const list = variantsByProduct.get(v.product_id) ?? []
    list.push(v)
    variantsByProduct.set(v.product_id, list)
  }

  const lines: string[] = [HEADER.join('\t')]
  // BOXES ONLY (Emily 2026-08-18). Single items stayed Approved-then-Limited in
  // Merchant Center because their landing page — /products/<id> — offers only
  // "Add to Box", which routes into the builder rather than selling the item at
  // the listed price, and Google requires a feed landing page to allow direct
  // purchase. They were already barred from paid Shopping (excluded_destination
  // since 2026-08-16), so the only loss is free listings on $5–20 items; the
  // alternative was rebuilding cart/checkout around standalone single items.
  // Flip this to true if product pages ever gain a real Add to Cart.
  const INCLUDE_SINGLE_ITEMS = false
  for (const item of INCLUDE_SINGLE_ITEMS ? items : []) {
    const priceUsd = parseFloat(item.price)
    const nameColor = splitNameColor(item.title).color
    const base = {
      title: scrubHardship(clean(feedTitle(item))),
      description: scrubHardship(scrubGots(clean(item.description))).slice(0, 5000),
      link: canonical(item.link),
      image_link: item.imageLink ?? '',
      price: item.price,
      condition: 'new',
      brand: FEED_BRAND,
      identifier_exists: 'false',
      google_product_category: String(googleCategory(item)),
      age_group: item.category === 'mom' ? '' : 'newborn',
      product_type: `Baby Gifts > ${item.productType.replace(/^Gift Boxes > /, '')}`,
      custom_label_0: 'single-item',
      custom_label_1: tier(priceUsd),
      excluded_destination: 'Shopping_ads',   // free listings stay on
      sale_price: '',
    }
    const variants = variantsByProduct.get(item.id) ?? []
    if (variants.length > 1) {
      variants.forEach((v, n) => {
        const g = /pink|rose|blush/i.test(v.color) ? 'female' : /blue|navy|sky/i.test(v.color) ? 'male' : gender(item.title)
        lines.push([
          `${item.id}--${n + 1}`, base.title, base.description,
          `${base.link}?variant=${n + 1}`,
          base.image_link, base.price,
          v.quantity > 0 ? 'in_stock' : 'out_of_stock',
          base.condition, base.brand, base.identifier_exists, base.google_product_category,
          base.age_group, g, item.id, base.product_type, base.custom_label_0, base.sale_price,
          titleCase(clean(v.color)), feedSize(v.size),
          base.custom_label_1, base.excluded_destination, '',   // single items are never on promo
        ].join('\t'))
      })
    } else {
      const only = variants[0]
      lines.push([
        item.id, base.title, base.description, base.link, base.image_link, base.price,
        item.availability, base.condition, base.brand, base.identifier_exists,
        base.google_product_category, base.age_group, gender(item.title), '',
        base.product_type, base.custom_label_0, base.sale_price,
        titleCase(clean(only?.color || nameColor)), only ? feedSize(only.size) : '',
        base.custom_label_1, base.excluded_destination, '',   // single items are never on promo
      ].join('\t'))
    }
  }

  // ── Gift boxes: every active+visible box, one row per variant, pooled
  // under a shared item_group_id. 5859 = Baby Gift Sets (verified).
  const BOX_KEYWORDS: Record<string, string> = {
    'signature-baby-gift-box': 'Organic Newborn Gift Basket',
    'themed-baby-gift-box': 'Baby Shower Gift Box',
    'new-mom-gift-box': 'New Mom Gift Box',
    'baby-first-christmas-gift-box': "Baby's First Christmas Gift Box",
    // The builder's Shopping listing: a fixed, buyable starter set (a
    // configurator page can't carry a feed price — it has no single price).
    'build-your-own-gift-box': 'Customizable Organic Baby Gift Set',
  }
  const boxes = await getBoxProducts()
  for (const b of boxes) {
    const kw = BOX_KEYWORDS[b.slug] ?? 'Organic Baby Gift Box'
    const many = b.variants.length > 1
    for (const v of b.variants) {
      const contents = v.contents
        .map(c => `${c.item.name}${c.qty > 1 ? ` (x${c.qty})` : ''}`)
        .join(', ')
      const g = /girl|pink|strawberry/i.test(v.label) ? 'female' : /boy|blue/i.test(v.label) ? 'male' : 'unisex'
      const link = many
        ? `${HOST}/boxes/${b.slug}?${b.variantParam}=${encodeURIComponent(v.key)}`
        : `${HOST}/boxes/${b.slug}`
      const pieces = pieceCount(v)
      // Boxes only, and only at the four founding tiers — foundingSalePrice
      // returns null for any other price, so nothing else can slip onto sale.
      const sale = promo.active ? foundingSalePrice(v.price) : null
      lines.push([
        `box-${b.slug}--${v.key}`,
        scrubHardship(clean(`${pieces}-Piece ${kw} – Hand-Packed & Personalized – ${b.name}`)).slice(0, 150),
        scrubHardship(clean(`${b.name}${many ? ` (${v.label})` : ''} — ${pieces} hand-packed pieces: ${contents}. Personalized card included, sealed by hand.`)).slice(0, 5000),
        link, v.images[0] ?? '', `${(v.price / 100).toFixed(2)} USD`,
        'in_stock', 'new', FEED_BRAND, 'false', '5859',
        b.slug === 'new-mom-gift-box' ? '' : 'newborn', g,
        many ? `box-${b.slug}` : '', 'Baby Gifts > Gift Boxes', 'box',
        sale ? `${(sale / 100).toFixed(2)} USD` : '',
        '', '',
        tier(v.price / 100), '',   // custom_label_1 = tier; boxes keep full ad eligibility
        sale ? saleWindow : '',
      ].join('\t'))
    }
  }
  return lines.join('\n') + '\n'
}
