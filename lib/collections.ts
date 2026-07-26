import { supabaseAdmin } from './supabase'
import { getCatalog, type DbProduct } from './products-db'

// Collections — real indexable routes over the catalog (Collections PDF).
// Membership = explicit pins (product_collections, wins) ∪ the JSONB filter
// ({"categories":[...]} and/or {"ids":[...]}). The empty-collection guard is
// enforced HERE so every consumer (page, sitemap, nav) inherits it: below
// min_products a collection does not exist publicly.

export interface CollectionRow {
  id: string
  slug: string
  title: string
  h1: string | null
  intro_copy: string | null
  meta_title: string | null
  meta_description: string | null
  hero_image: string | null
  sort_order: number
  type: 'recipient' | 'occasion' | 'format'
  filter: { categories?: string[]; ids?: string[] } | null
  min_products: number
  active: boolean
  segment_hint: string | null
}

export interface ResolvedCollection extends CollectionRow {
  products: DbProduct[]
}

async function resolveProducts(c: CollectionRow, catalog: DbProduct[]): Promise<DbProduct[]> {
  const { data: pins } = await supabaseAdmin
    .from('product_collections').select('product_id, sort_order').eq('collection_id', c.id).order('sort_order')
  const pinned = (pins ?? [])
    .map(p => catalog.find(x => x.id === p.product_id))
    .filter((x): x is DbProduct => Boolean(x))
  const pinnedIds = new Set(pinned.map(p => p.id))
  const filtered = catalog.filter(p =>
    !pinnedIds.has(p.id) && (
      (c.filter?.categories?.includes(p.category) ?? false) ||
      (c.filter?.ids?.includes(p.id) ?? false)
    ))
  return [...pinned, ...filtered]
}

/** Active collections that clear their product threshold — the only ones
 *  that exist publicly (pages, sitemap, nav). */
export async function getLiveCollections(): Promise<ResolvedCollection[]> {
  const { data } = await supabaseAdmin
    .from('collections').select('*').eq('active', true).order('sort_order')
  if (!data?.length) return []
  const catalog = await getCatalog({ activeOnly: true })
  const out: ResolvedCollection[] = []
  for (const row of data as CollectionRow[]) {
    const products = await resolveProducts(row, catalog)
    if (products.length >= row.min_products) out.push({ ...row, products })
  }
  return out
}

export async function getLiveCollection(slug: string): Promise<ResolvedCollection | null> {
  const all = await getLiveCollections()
  return all.find(c => c.slug === slug) ?? null
}

/** For the portal: every collection with its resolved count and publish state. */
export async function getCollectionStates(): Promise<Array<CollectionRow & { productCount: number; published: boolean }>> {
  const { data } = await supabaseAdmin.from('collections').select('*').order('sort_order')
  const catalog = await getCatalog({ activeOnly: true })
  const out = []
  for (const row of (data ?? []) as CollectionRow[]) {
    const products = await resolveProducts(row, catalog)
    out.push({ ...row, productCount: products.length, published: row.active && products.length >= row.min_products })
  }
  return out
}
