import { getCatalog } from './products-db.ts'
import { supabaseAdmin } from './supabase.ts'
import { FEATURED_IDS } from './products.ts'
import type { Product } from '@/types'

// Single source of truth for the Bestsellers carousel, shared by the home page,
// the public API, and the admin manager so they always agree.
//
// Rule: if the owner has hand-picked any products (featured = true), the carousel
// is EXACTLY those — fully curated, nothing auto-added. Only when nothing is
// picked yet do we fall back to top sales → FEATURED_IDS → other active products
// so a fresh site is never empty.
export async function getBestsellerProducts(limit = 8): Promise<{ products: Product[]; curated: boolean }> {
  const catalog = await getCatalog({ activeOnly: true })
  const picked = catalog.filter(p => p.featured)

  if (picked.length > 0) {
    return { products: picked.slice(0, limit), curated: true }
  }

  // Fallback (no curation yet): rank by real sales, then featured-ids, then rest.
  const { data } = await supabaseAdmin.from('orders').select('selected_items, status').neq('status', 'pending')
  const unitsById = new Map<string, number>()
  for (const order of data ?? []) {
    for (const it of (order.selected_items ?? []) as Array<{ id: string }>) {
      if (it?.id) unitsById.set(it.id, (unitsById.get(it.id) ?? 0) + 1)
    }
  }
  const byId = new Map(catalog.map(p => [p.id, p]))
  const seen = new Set<string>()
  const ranked = [...unitsById.entries()]
    .filter(([id]) => byId.has(id))
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => byId.get(id)!)
  ranked.forEach(p => seen.add(p.id))
  const fallback = [
    ...FEATURED_IDS.map(id => byId.get(id)).filter(Boolean) as Product[],
    ...catalog,
  ].filter(p => !seen.has(p.id))
  return { products: [...ranked, ...fallback].slice(0, limit), curated: false }
}
