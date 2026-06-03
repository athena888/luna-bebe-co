import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

interface VariantRow {
  item_id: string
  name: string
  color: string
  color_code?: string
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
      const code = item.color_code?.trim() || null
      const unitPriceCents =
        item.unit_price != null && !isNaN(Number(item.unit_price))
          ? Math.round(Number(item.unit_price) * 100)
          : null
      const pid = item.item_id.toLowerCase().trim()
      const color = item.color.toLowerCase().trim()
      const delta = Math.round(item.quantity)

      // Read current stock first so we can log old → new (and allow a revert)
      const { data: existing } = await supabaseAdmin
        .from('product_variants')
        .select('quantity')
        .eq('product_id', pid).eq('color', color).eq('size', item.size)
        .maybeSingle()
      const oldQty = existing?.quantity ?? 0

      const { error } = await supabaseAdmin.rpc('upsert_product_variant', {
        p_product_id: pid,
        p_color: color,
        p_size: item.size,
        p_quantity: delta,
        p_color_hex: hex,
        p_unit_price: unitPriceCents,
        p_color_code: code,
      })

      if (error) {
        failed++
        errors.push(`${item.item_id} ${item.color} ${item.size}: ${error.message}`)
      } else {
        updated++
        // Log the change for review (best-effort — won't block the save)
        await supabaseAdmin.from('inventory_changes').insert({
          product_id: pid, color, color_code: code, color_hex: hex, size: item.size,
          old_quantity: oldQty, delta, new_quantity: oldQty + delta, unit_price: unitPriceCents, status: 'pending',
        }).then(undefined, () => {})
      }
    }

    // Flag every product touched by this import so the admin reviews + publishes
    // it from the Products page — nothing here changes the live storefront on its own.
    const touchedIds = Array.from(new Set(items.map(it => it.item_id?.toLowerCase().trim()).filter(Boolean)))
    if (touchedIds.length) {
      await supabaseAdmin.from('products').update({ needs_review: true }).in('id', touchedIds)
    }

    return NextResponse.json({ success: true, updated, failed, errors, flagged: touchedIds.length })
  } catch (error) {
    console.error('Inventory confirm error:', error)
    return NextResponse.json({ error: 'Failed to save inventory' }, { status: 500 })
  }
}
