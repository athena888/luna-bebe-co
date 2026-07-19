import { supabaseAdmin } from './supabase'
import { getCatalog } from './products-db'

// Reorder points per product: daily_rate (last 30d of paid orders) ×
// lead_time_days + safety_stock. Effective stock follows the same rule as
// /api/inventory — variant sum when variants exist, else the inventory row.
// Knobs (lead_time_days, safety_stock) live on the inventory row (§32).

export interface ReorderRow {
  id: string
  name: string
  onHand: number
  dailyRate: number
  leadTimeDays: number
  safetyStock: number
  reorderPoint: number
  weeksOnHand: number | null   // null = no sales velocity yet
  low: boolean
}

export async function computeReorderStatus(): Promise<ReorderRow[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const [products, variantsRes, invRes, ordersRes] = await Promise.all([
    getCatalog({ activeOnly: true }),
    supabaseAdmin.from('product_variants').select('product_id, quantity'),
    supabaseAdmin.from('inventory').select('*'),
    supabaseAdmin.from('orders').select('selected_items').neq('status', 'pending').gte('created_at', thirtyDaysAgo),
  ])

  const variantStock = new Map<string, number>()
  for (const v of variantsRes.data ?? []) {
    variantStock.set(v.product_id, (variantStock.get(v.product_id) ?? 0) + (v.quantity ?? 0))
  }

  const invByProduct = new Map<string, { quantity: number; lead_time_days?: number; safety_stock?: number }>()
  for (const i of invRes.data ?? []) invByProduct.set(i.product_id, i)

  const units30 = new Map<string, number>()
  for (const o of ordersRes.data ?? []) {
    for (const item of (o.selected_items ?? []) as Array<{ id?: string; qty?: number }>) {
      if (!item?.id) continue
      units30.set(item.id, (units30.get(item.id) ?? 0) + Math.max(1, Math.round(item.qty ?? 1)))
    }
  }

  return products.map(p => {
    const inv = invByProduct.get(p.id)
    const onHand = variantStock.has(p.id) ? variantStock.get(p.id)! : (inv?.quantity ?? 0)
    const dailyRate = (units30.get(p.id) ?? 0) / 30
    const leadTimeDays = inv?.lead_time_days ?? 14
    const safetyStock = inv?.safety_stock ?? 3
    const reorderPoint = Math.ceil(dailyRate * leadTimeDays + safetyStock)
    return {
      id: p.id,
      name: p.name,
      onHand,
      dailyRate,
      leadTimeDays,
      safetyStock,
      reorderPoint,
      weeksOnHand: dailyRate > 0 ? onHand / (dailyRate * 7) : null,
      // Only flag products that actually sell or hold stock — otherwise every
      // not-yet-stocked draft would alarm daily.
      low: (dailyRate > 0 || onHand > 0) && onHand <= reorderPoint,
    }
  })
}
