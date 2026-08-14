import { buildFeed, FEED_BRAND, type FeedItem } from './google-feed'
import { supabaseAdmin } from './supabase'
import { getBoxProducts } from './catalog-db'

// Google Merchant TSV feed (/product-feed.tsv) — built ON TOP of the XML
// feed's buildFeed(), so price ("95.00 USD" from the same cents shown on the
// product page + JSON-LD) and availability (same stock rule as JSON-LD:
// null stock → active = in stock) can never disagree between surfaces.
//
// Feed titles: [search keywords] – [key attribute] – [product name].
// Display names on the site are untouched; this is feed-only.

const FEED_KEYWORDS: Record<string, string> = {
  swaddle: 'Organic Baby Blanket & Swaddle',
  garment: 'Organic Cotton Newborn Clothing',
  bath: 'Calming Baby Bath Gift',
  keepsake: 'Baby Shower Keepsake Gift',
  mom: 'New Mom Postpartum Care Gift',
}

// Spec mapping where it clearly applies; everything else falls back to the
// XML feed's per-category Google taxonomy ids (unchanged behavior there).
function googleCategory(item: FeedItem): number {
  const t = item.title.toLowerCase()
  if (/(blanket|swaddle)/.test(t)) return 1613
  if (/(doll|bunny|companion|lovey)/.test(t)) return 1239
  return item.categoryId
}

function gender(item: FeedItem): 'female' | 'male' | 'unisex' {
  if (/\bgirl\b|\bpink\b/i.test(item.title)) return 'female'
  if (/\bboy\b|\bblue\b/i.test(item.title)) return 'male'
  return 'unisex'
}

function tier(priceUsd: number): 'entry' | 'mid' | 'premium' {
  if (priceUsd < 80) return 'entry'
  if (priceUsd <= 120) return 'mid'
  return 'premium'
}

export function feedTitle(item: FeedItem): string {
  const isBlanket = /(blanket|swaddle)/i.test(item.title)
  const isMama = item.category === 'mom' || item.category === 'bath'
  const kw = isBlanket ? 'Organic Baby Blanket & Swaddle' : FEED_KEYWORDS[item.category] ?? 'Organic Baby Gift'
  // Attribute must be TRUE for the item: cotton claims only for textiles,
  // botanical claims for care products, neutral otherwise.
  const attr = isMama && !isBlanket
    ? (item.organic ? 'Organic Botanicals' : 'Self-Care for New Mothers')
    : (item.organic ? 'GOTS Organic Cotton' : 'Handmade for Newborns')
  return `${kw} – ${attr} – ${item.title}`.slice(0, 150)
}

const clean = (s: string) => s.replace(/[\t\n\r]+/g, ' ').trim()

const HEADER = [
  'id', 'title', 'description', 'link', 'image_link', 'price', 'availability',
  'condition', 'brand', 'identifier_exists', 'google_product_category',
  'age_group', 'gender', 'item_group_id', 'product_type', 'custom_label_0', 'sale_price',
]

export async function buildProductTsv(): Promise<string> {
  const { items } = await buildFeed()

  // Variant expansion: per-variant rows share item_group_id; availability is
  // that variant's own quantity.
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
  for (const item of items) {
    const priceUsd = parseFloat(item.price)
    const base = {
      title: clean(feedTitle(item)),
      description: clean(item.description).slice(0, 5000),
      link: item.link,
      image_link: item.imageLink ?? '',
      price: item.price,                       // "95.00 USD" — same cents as the page + JSON-LD
      condition: 'new',
      brand: FEED_BRAND,
      identifier_exists: 'false',
      google_product_category: String(googleCategory(item)),
      age_group: item.category === 'mom' ? '' : 'newborn',
      product_type: `Baby Gifts > ${item.productType.replace(/^Gift Boxes > /, '')}`,
      custom_label_0: tier(priceUsd),
      sale_price: '',                          // no sale-price column in the DB yet
    }
    const variants = variantsByProduct.get(item.id) ?? []
    if (variants.length > 1) {
      variants.forEach((v, n) => {
        const g = /pink|rose|blush/i.test(v.color) ? 'female' : /blue|navy|sky/i.test(v.color) ? 'male' : gender(item)
        lines.push([
          `${item.id}--${n + 1}`, `${base.title} (${clean(v.color)}${v.size && v.size !== 'one-size' ? `, ${clean(v.size)}` : ''})`.slice(0, 150),
          base.description, base.link, base.image_link, base.price,
          v.quantity > 0 ? 'in_stock' : 'out_of_stock',
          base.condition, base.brand, base.identifier_exists, base.google_product_category,
          base.age_group, g, item.id, base.product_type, base.custom_label_0, base.sale_price,
        ].join('\t'))
      })
    } else {
      lines.push([
        item.id, base.title, base.description, base.link, base.image_link, base.price,
        item.availability, base.condition, base.brand, base.identifier_exists,
        base.google_product_category, base.age_group, gender(item), '',
        base.product_type, base.custom_label_0, base.sale_price,
      ].join('\t'))
    }
  }
  // ── Gift boxes: every active+visible box, one row per variant, pooled under
  // a shared item_group_id. Category 5394 (gift baskets); always in stock —
  // boxes are packed to order from live inventory.
  const BOX_KEYWORDS: Record<string, string> = {
    'signature-baby-gift-box': 'Organic Newborn Gift Basket',
    'themed-baby-gift-box': 'Baby Shower Gift Box',
    'new-mom-gift-box': 'New Mom Postpartum Gift Box',
    'baby-first-christmas-gift-box': "Baby's First Christmas Gift Box",
  }
  const boxes = await getBoxProducts()
  for (const b of boxes) {
    const kw = BOX_KEYWORDS[b.slug] ?? 'Organic Baby Gift Box'
    const many = b.variants.length > 1
    for (const v of b.variants) {
      const title = clean(`${kw} – Hand-Packed & Personalized – ${b.name}${many ? ` (${v.label})` : ''}`).slice(0, 150)
      const g = /girl|pink|strawberry/i.test(v.label) ? 'female' : /boy|blue/i.test(v.label) ? 'male' : 'unisex'
      const link = many
        ? `https://www.petitelavande.com/boxes/${b.slug}?${b.variantParam}=${encodeURIComponent(v.key)}`
        : `https://www.petitelavande.com/boxes/${b.slug}`
      lines.push([
        `box-${b.slug}--${v.key}`, title,
        clean(`${b.name} — a hand-packed organic baby gift box from Petite Lavande: ${v.contents.map(c => c.item.name).join(', ')}. Personalized card included, sealed by hand.`).slice(0, 5000),
        link, v.images[0] ?? '', `${(v.price / 100).toFixed(2)} USD`,
        'in_stock', 'new', FEED_BRAND, 'false', '5394',
        b.slug === 'new-mom-gift-box' ? '' : 'newborn', g,
        many ? `box-${b.slug}` : '', 'Baby Gifts > Gift Boxes', tier(v.price / 100), '',
      ].join('\t'))
    }
  }
  return lines.join('\n') + '\n'
}
