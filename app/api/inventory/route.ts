import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  // Effective stock per product. Variant products (stock entered per color/size)
  // keep their stock in product_variants, not the single inventory table — so
  // sum the variants and let that override the single number when variants exist.
  const [invRes, varRes] = await Promise.all([
    supabaseAdmin.from('inventory').select('product_id, quantity'),
    supabaseAdmin.from('product_variants').select('product_id, quantity'),
  ])

  const inventory: Record<string, number> = {}
  for (const row of invRes.data ?? []) {
    inventory[row.product_id] = row.quantity
  }

  const variantSum: Record<string, number> = {}
  for (const row of varRes.data ?? []) {
    variantSum[row.product_id] = (variantSum[row.product_id] ?? 0) + (row.quantity ?? 0)
  }
  // A product that has any variant rows uses the variant total for availability.
  for (const pid of Object.keys(variantSum)) {
    inventory[pid] = variantSum[pid]
  }

  return NextResponse.json({ inventory })
}
