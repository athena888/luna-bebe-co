import { supabaseAdmin } from '../supabase.ts'
import { getConfig } from '../pipeline/config.ts'
import { getBoxProducts } from '../catalog-db.ts'

// Corporate tier data for the lookbook price calculator, the press line sheet,
// and image auto-tagging. (The AI copy-assist that used to live here was
// removed 2026-08-14 along with the lookbook generator — Emily uploads her own
// PDF now.)

export interface CatalogTier {
  id: string
  name: string
  price: number
  corporate_price_10: number | null
  corporate_price_25: number | null
  corporate_price_50: number | null
  description: string | null
  sort: number
}

export interface CorporateFields {
  logo_ribbon?: string
  lead_time?: string
  contact_line?: string
}

interface OverlayRow {
  product_slug: string; variant_key: string
  corporate_price_10: number | null; corporate_price_25: number | null; corporate_price_50: number | null
  description: string | null
}

// Tiers mirror the LIVE catalog: one row per active, visible box variant (SKU).
// Name, retail price, and order come from catalog_products/catalog_variants;
// only the corporate fields (10/25/50 pricing + one-liner) are lookbook-owned,
// in lookbook_tier_overlay keyed by product_slug+variant_key. Unset corporate
// prices default to ~5/10/15% off retail. Falls back to the legacy hand-seeded
// catalog_tiers rows if the catalog tables are empty.
const pctOff = (usd: number, pct: number) => Math.round(usd * (1 - pct / 100))

export async function getTiers(): Promise<CatalogTier[]> {
  const products = await getBoxProducts()
  if (!products.length) {
    const { data } = await supabaseAdmin.from('catalog_tiers').select('*').order('sort')
    return (data ?? []) as CatalogTier[]
  }
  const { data: overlays } = await supabaseAdmin.from('lookbook_tier_overlay').select('*')
  const byKey = new Map(((overlays ?? []) as OverlayRow[]).map(o => [`${o.product_slug}:${o.variant_key}`, o]))
  const tiers: CatalogTier[] = []
  for (const p of products) {
    for (const v of p.variants) {
      const id = `${p.slug}:${v.key}`
      const o = byKey.get(id)
      const usd = Math.round(v.price / 100)   // catalog_variants.price is cents
      tiers.push({
        id,
        name: p.variants.length > 1 ? `${p.name} — ${v.label}` : p.name,
        price: usd,
        corporate_price_10: o?.corporate_price_10 ?? pctOff(usd, 5),
        corporate_price_25: o?.corporate_price_25 ?? pctOff(usd, 10),
        corporate_price_50: o?.corporate_price_50 ?? pctOff(usd, 15),
        description: o?.description ?? p.subtitle ?? null,
        sort: tiers.length,
      })
    }
  }
  return tiers
}

export async function getCorporateFields(): Promise<CorporateFields> {
  const v = await getConfig<CorporateFields & { include_in_first_touch?: boolean }>('lookbook')
  return { logo_ribbon: v?.logo_ribbon, lead_time: v?.lead_time, contact_line: v?.contact_line }
}
