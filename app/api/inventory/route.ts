import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('inventory')
    .select('product_id, quantity')

  if (error) return NextResponse.json({ inventory: {} })

  const inventory: Record<string, number> = {}
  for (const row of data ?? []) {
    inventory[row.product_id] = row.quantity
  }

  return NextResponse.json({ inventory })
}
