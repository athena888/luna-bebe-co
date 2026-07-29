import { supabaseAdmin } from './supabase'
import type { Product } from '@/types'

// Catalog restructure Phase 1+2 (§46): boxes as parent PRODUCTS with variant
// rows (tiers/themes/sets), contents referencing the items layer (the existing
// `products` table). Everything here is fail-soft: before §46 runs, reads
// return [] and the legacy prebuilt-box grid keeps the /boxes page alive.

export { BLANKET_COLORS } from './box-colors'

export interface ContentRef {
  item_id: string
  qty: number
  color_choice?: boolean   // buyer picks a blanket color (BLANKET_COLORS)
  note?: string
}

export interface ResolvedContent {
  item: Product
  qty: number
  colorChoice: boolean
  note?: string
}

export interface CatalogVariant {
  key: string
  label: string
  price: number
  basket: string
  basketDepthCm: number | null
  adds: string
  images: string[]
  active: boolean
  sortOrder: number
  contents: ResolvedContent[]
}

export interface CatalogBoxProduct {
  slug: string
  name: string
  subtitle: string
  type: string
  story: Record<string, unknown>
  variantParam: string
  variantLabel: string
  seasonal: boolean
  visible: boolean
  active: boolean
  sortOrder: number
  faqs: Array<{ q: string; a: string }>
  variants: CatalogVariant[]
}

interface ProductRow {
  slug: string; name: string; subtitle: string; type: string; story: Record<string, unknown> | null
  variant_param: string; variant_label: string; seasonal: boolean; visible: boolean
  active: boolean; sort_order: number; faqs: Array<{ q: string; a: string }> | null
}
interface VariantRow {
  product_slug: string; key: string; label: string; price: number; basket: string
  basket_depth_cm: number | null; adds: string; contents: ContentRef[] | null
  images: string[] | null; active: boolean; sort_order: number
}

async function itemsById(): Promise<Map<string, Product>> {
  // Contents resolve against ALL items regardless of `active` — an item can be
  // box-only (standalone=false, inactive) and still render in a contents list.
  const { data } = await supabaseAdmin.from('products').select('*')
  return new Map(((data ?? []) as Product[]).map(p => [p.id, p]))
}

function resolveVariant(v: VariantRow, items: Map<string, Product>): CatalogVariant {
  const contents: ResolvedContent[] = []
  for (const ref of (v.contents ?? [])) {
    const item = items.get(ref.item_id)
    if (!item) continue
    contents.push({ item, qty: ref.qty || 1, colorChoice: !!ref.color_choice, note: ref.note })
  }
  return {
    key: v.key, label: v.label, price: v.price, basket: v.basket,
    basketDepthCm: v.basket_depth_cm, adds: v.adds,
    images: Array.isArray(v.images) ? v.images.filter(Boolean) : [],
    active: v.active, sortOrder: v.sort_order, contents,
  }
}

function resolveProduct(row: ProductRow, variants: VariantRow[], items: Map<string, Product>): CatalogBoxProduct {
  return {
    slug: row.slug, name: row.name, subtitle: row.subtitle, type: row.type,
    story: row.story ?? {}, variantParam: row.variant_param || 'v',
    variantLabel: row.variant_label, seasonal: row.seasonal, visible: row.visible,
    active: row.active, sortOrder: row.sort_order, faqs: row.faqs ?? [],
    variants: variants
      .filter(v => v.product_slug === row.slug && v.active)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(v => resolveVariant(v, items)),
  }
}

/** Active box products for the /boxes hub + sitemap. `visible` filters the
 * seasonally hidden ones (route persists; nav/sitemap presence drops). */
export async function getBoxProducts(opts: { includeHidden?: boolean } = {}): Promise<CatalogBoxProduct[]> {
  try {
    let q = supabaseAdmin.from('catalog_products').select('*').eq('active', true).order('sort_order')
    if (!opts.includeHidden) q = q.eq('visible', true)
    const { data: rows, error } = await q
    if (error || !rows?.length) return []
    const { data: vars } = await supabaseAdmin.from('catalog_variants').select('*')
    const items = await itemsById()
    return (rows as ProductRow[])
      .map(r => resolveProduct(r, (vars ?? []) as VariantRow[], items))
      .filter(p => p.variants.length > 0)
  } catch {
    return [] // §46 not run yet
  }
}

/** One box product by slug — includes seasonally hidden (the route must keep
 * serving off-season so its URL and reviews persist). Inactive returns null. */
export async function getBoxProduct(slug: string): Promise<CatalogBoxProduct | null> {
  try {
    const { data: row, error } = await supabaseAdmin
      .from('catalog_products').select('*').eq('slug', slug).eq('active', true).maybeSingle()
    if (error || !row) return null
    const { data: vars } = await supabaseAdmin.from('catalog_variants').select('*').eq('product_slug', slug)
    const items = await itemsById()
    const resolved = resolveProduct(row as ProductRow, (vars ?? []) as VariantRow[], items)
    return resolved.variants.length > 0 ? resolved : null
  } catch {
    return null
  }
}

export function priceRange(p: CatalogBoxProduct): { low: number; high: number } {
  const prices = p.variants.map(v => v.price)
  return { low: Math.min(...prices), high: Math.max(...prices) }
}
