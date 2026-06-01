import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

interface VariantRow {
  item_id: string
  name: string
  color: string
  color_hex?: string
  size: string
  quantity: number
  unit_price?: number | null   // dollars
  status?: string
}

export async function POST(req: NextRequest) {
  try {
    const { items }: { items: VariantRow[] } = await req.json()

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 })
    }

    let updated = 0
    let failed = 0
    const errors: string[] = []

    for (const item of items) {
      if (!item.item_id || !item.color || !item.size || item.quantity < 0) {
        failed++
        errors.push(`Skipped invalid row: ${JSON.stringify(item)}`)
        continue
      }

      const hex = item.color_hex?.trim() || null
      const unitPriceCents =
        item.unit_price != null && !isNaN(Number(item.unit_price))
          ? Math.round(Number(item.unit_price) * 100)
          : null

      const { error } = await supabaseAdmin.rpc('upsert_product_variant', {
        p_product_id: item.item_id.toLowerCase().trim(),
        p_color: item.color.toLowerCase().trim(),
        p_size: item.size,
        p_quantity: Math.round(item.quantity),
        p_color_hex: hex,
        p_unit_price: unitPriceCents,
      })

      if (error) {
        failed++
        errors.push(`${item.item_id} ${item.color} ${item.size}: ${error.message}`)
      } else {
        updated++
      }
    }

    return NextResponse.json({ success: true, updated, failed, errors })
  } catch (error) {
    console.error('Inventory confirm error:', error)
    return NextResponse.json({ error: 'Failed to save inventory' }, { status: 500 })
  }
}
