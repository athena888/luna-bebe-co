import { supabaseAdmin } from './supabase.ts'
import type { Product } from '@/types'

// Catalog restructure Phase 1+2 (§46): boxes as parent PRODUCTS with variant
// rows (tiers/themes/sets), contents referencing the items layer (the existing
// `products` table). Everything here is fail-soft: before §46 runs, reads
// return [] and the legacy prebuilt-box grid keeps the /boxes page alive.

export { BLANKET_COLORS } from './box-colors.ts'

export interface ContentRef {
  item_id: string
  qty: number
  color_choice?: boolean   // buyer picks a blanket color (BLANKET_COLORS)
  note?: string
  pieces?: number          // per-box piece count for multi-piece sets (e.g. 2 of the 5 bath melts)
}

export interface ResolvedContent {
  item: Product
  qty: number
  colorChoice: boolean
  note?: string
  pieces?: number
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
    contents.push({ item, qty: ref.qty || 1, colorChoice: !!ref.color_choice, note: ref.note, pieces: ref.pieces })
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

export interface SizeOption {
  size: string
  inStock: boolean
  // First in-stock colorway for this size — written onto the cart line so
  // checkout decrements the right variant row.
  color: string | null
  colorHex: string | null
}

/** Per-item size availability for the buy panel. Items whose only size is
 * "one-size" are omitted (no picker needed). Stock = sum across colorways. */
export async function getItemSizeOptions(itemIds: string[]): Promise<Record<string, SizeOption[]>> {
  if (!itemIds.length) return {}
  try {
    const { data } = await supabaseAdmin
      .from('product_variants')
      .select('product_id, size, color, color_hex, quantity')
      .in('product_id', itemIds)
    const byItem: Record<string, SizeOption[]> = {}
    for (const row of (data ?? []) as Array<{ product_id: string; size: string; color: string; color_hex: string | null; quantity: number }>) {
      const list = (byItem[row.product_id] ??= [])
      const existing = list.find(o => o.size === row.size)
      if (existing) {
        if (!existing.inStock && row.quantity > 0) {
          existing.inStock = true; existing.color = row.color; existing.colorHex = row.color_hex
        }
      } else {
        list.push({ size: row.size, inStock: row.quantity > 0, color: row.quantity > 0 ? row.color : null, colorHex: row.quantity > 0 ? row.color_hex : null })
      }
    }
    for (const id of Object.keys(byItem)) {
      const sizes = byItem[id]
      if (sizes.length === 1 && sizes[0].size === 'one-size') delete byItem[id]
      else byItem[id] = sizes.sort((a, b) => a.size.localeCompare(b.size, undefined, { numeric: true }))
    }
    return byItem
  } catch {
    return {}
  }
}

// Piece count from the variant's ACTUAL contents (single source of truth):
// qty × pieces-in-name ('Set of 2' → 2, 'Pair' → 2, 'Trio' → 3).
// Multi-piece sets count their stated piece number (Emily 2026-08-14):
// explicit map first, then 'Set of N', Pair=2, Trio=3.
const SET_PIECES: Record<string, number> = {
  'swaddle-botanical-bath-melt-set': 5, // Bath Melt Set of 5
  'swaddle-fox-trio-gift-set': 3,
  'swaddle-beechwood-rattle-pair': 2,
  'swaddle-soft-snap-bandana-bib': 2, // Set of 2
}
export function piecesPerItem(id: string, name: string): number {
  if (SET_PIECES[id]) return SET_PIECES[id]
  const m = name.match(/set of (\d+)/i)
  if (m) return parseInt(m[1])
  if (/pair/i.test(name)) return 2
  if (/trio/i.test(name)) return 3
  return 1
}
export function pieceCount(v: CatalogVariant): number {
  // A contents entry can carry its own `pieces` (a box may include only 2 of
  // the 5-melt set); the item-level number is the fallback.
  return v.contents.reduce((sum, c) => sum + (c.pieces ?? piecesPerItem(c.item.id, c.item.name)) * (c.qty || 1), 0)
}

export function priceRange(p: CatalogBoxProduct): { low: number; high: number } {
  const prices = p.variants.map(v => v.price)
  return { low: Math.min(...prices), high: Math.max(...prices) }
}
