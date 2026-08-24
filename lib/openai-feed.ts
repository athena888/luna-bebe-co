import { supabaseAdmin } from './supabase.ts'
import { storeCheckoutEnabled } from './store-flags.ts'
import { getCatalog, getProductStock, type DbProduct } from './products-db.ts'
import { getBoxProducts, pieceCount } from './catalog-db.ts'
import {
  buildRows, toCsv, HOST,
  type Availability, type FeedInput, type BuildResult,
} from './openai-feed-core.ts'

// Data layer for the OpenAI Ads feed: reads the SAME sources the storefront
// renders from, so nothing here can invent a product, price or claim.
//
//   single items → `products` (lib/products-db.getCatalog), stock from
//                  `inventory` / `product_variants`, gallery from
//                  `product_gallery`, page at /products/<id>
//   gift boxes   → `catalog_products` × `catalog_variants`
//                  (lib/catalog-db.getBoxProducts), page at
//                  /boxes/<slug>?<param>=<variant>
//
// The Google Merchant feed (lib/google-feed.ts, lib/google-feed-tsv.ts) is NOT
// imported and NOT modified. This file is additive.

/** Boxes are the advertised product line; single items are components sold
 *  individually. Emily's Google campaign advertises boxes only, and the same
 *  reasoning applies here — but this switch keeps the decision in one place. */
const INCLUDE_SINGLE_ITEMS = false

function absoluteImage(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith('https://')) return url
  if (url.startsWith('http://')) return null            // non-HTTPS is rejected
  return `${HOST}${url.startsWith('/') ? '' : '/'}${url}`
}

/** Real stock → a spec availability value. Never optimistic: an item we can't
 *  read a number for stays `in_stock` only when the store itself still sells
 *  it (null = no inventory row = not stock-tracked). */
function availabilityFor(stock: number | null, preorder?: boolean): Availability {
  if (preorder) return 'pre_order'
  if (stock === null) return 'in_stock'
  return stock > 0 ? 'in_stock' : 'out_of_stock'
}

/** Price tier for ads_metadata — derived from the real price, nothing else. */
function priceTier(cents: number): string {
  const usd = cents / 100
  if (usd < 80) return 'entry'
  if (usd <= 130) return 'premium'
  return 'luxury'
}

/** Which line a box belongs to, from its actual slug. */
function boxMetadata(slug: string, cents: number): Record<string, string> {
  const line =
    slug.includes('new-mom') ? 'new_mom'
      : slug.includes('themed') ? 'mama_and_baby'
        : slug.includes('build-your-own') ? 'baby_gift'
          : 'baby_gift'
  const intent =
    slug.includes('new-mom') ? 'new_mom_gift'
      : slug.includes('christmas') ? 'newborn_gift'
        : 'baby_shower'
  return { product_line: line, purchase_intent: intent, price_tier: priceTier(cents) }
}

async function galleryFor(productId: string): Promise<string[]> {
  try {
    const { data } = await supabaseAdmin
      .from('product_gallery')
      .select('image_url, is_primary, sort_order')
      .eq('product_id', productId)
      .order('sort_order')
    return ((data ?? []) as Array<{ image_url: string }>)
      .map(g => absoluteImage(g.image_url))
      .filter((u): u is string => !!u)
  } catch {
    return []
  }
}

/** Resolve every advertisable product into feed inputs. */
export async function collectFeedInputs(): Promise<FeedInput[]> {
  const inputs: FeedInput[] = []

  // ── Gift boxes: one row per purchasable variant, grouped by box ───────────
  // getBoxProducts already filters to active + visible, so seasonal-hidden and
  // inactive boxes never reach the feed.
  const boxes = await getBoxProducts()
  for (const box of boxes) {
    const many = box.variants.length > 1
    for (const variant of box.variants) {
      if (variant.active === false) continue
      const pieces = pieceCount(variant)
      const contents = variant.contents
        .map(c => `${c.item.name}${c.qty > 1 ? ` (x${c.qty})` : ''}`)
        .join(', ')
      const url = many
        ? `${HOST}/boxes/${box.slug}?${box.variantParam}=${encodeURIComponent(variant.key)}`
        : `${HOST}/boxes/${box.slug}`
      const images = variant.images.map(absoluteImage).filter((u): u is string => !!u)

      inputs.push({
        itemId: `box-${box.slug}--${variant.key}`,
        title: many ? `${box.name} — ${variant.label}` : box.name,
        // Leads with what the shopper is searching for — organic, baby & mama,
        // gift box (Emily 2026-08-24) — then exactly what the buyer receives;
        // no added claims. box.subtitle is deliberately French on the site
        // ("Notre boîte signature."), so it is not used here: the French brand
        // name still leads in `title`, the description itself is English.
        description: `${box.slug.includes('new-mom') ? 'Organic Mama Gift Box' : 'Organic Baby & Mama Gift Box'} — ${pieces} hand-packed pieces: ${contents}. Personalized card included.`,
        url,
        imageUrl: images[0] ?? null,
        additionalImageUrls: images.slice(1, 11),
        priceCents: variant.price,
        salePriceCents: null,             // no sale mechanism exists in the store
        // Assembled to order, so components never gate a box — but the master
        // checkout switch does. Advertising in_stock while checkout is closed
        // sends paid traffic to a store that cannot take the order.
        availability: storeCheckoutEnabled() ? 'in_stock' : 'out_of_stock',
        productCategory: box.slug.includes('new-mom')
          ? 'Health & Beauty > Personal Care'
          : 'Baby & Toddler > Baby Gift Sets',
        groupId: many ? `box-${box.slug}` : null,
        variantLabel: many ? box.name : null,
        ageGroup: box.slug.includes('new-mom') ? 'adult' : 'newborn',
        adsMetadata: boxMetadata(box.slug, variant.price),
      })
    }
  }

  // ── Single items (off by default) ─────────────────────────────────────────
  if (INCLUDE_SINGLE_ITEMS) {
    const products = await getCatalog({ activeOnly: true })
    for (const p of products as DbProduct[]) {
      const stock = await getProductStock(p.id, p.has_variants)
      const gallery = await galleryFor(p.id)
      const primary = absoluteImage(p.image) ?? gallery[0] ?? null
      inputs.push({
        itemId: p.id,
        title: p.name,
        description: p.description ?? '',
        url: `${HOST}/products/${p.id}`,
        imageUrl: primary,
        additionalImageUrls: gallery.filter(g => g !== primary).slice(0, 10),
        priceCents: p.price,
        salePriceCents: null,
        availability: availabilityFor(stock, p.preorder),
        productCategory: 'Baby & Toddler',
        adsMetadata: { product_line: 'baby_gift', price_tier: priceTier(p.price) },
      })
    }
  }

  return inputs
}

export interface FeedBuild extends BuildResult { csv: string }

/** Build the whole feed. Used by BOTH the hosted route and the local export,
 *  so the two can never drift. */
export async function buildOpenAiFeed(): Promise<FeedBuild> {
  const inputs = await collectFeedInputs()
  const result = buildRows(inputs)
  return { ...result, csv: toCsv(result.rows) }
}
