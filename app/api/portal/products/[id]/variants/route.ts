import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// List all variants for a product.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = await supabaseAdmin
    .from('product_variants')
    .select('id, color, color_code, color_hex, style, size, quantity, unit_price')
    .eq('product_id', id)
    .order('color')
    .order('size')

  if (error) return NextResponse.json({ error: 'Failed to load variants' }, { status: 500 })
  return NextResponse.json({ variants: data ?? [] })
}

interface VariantInput {
  color: string
  color_code?: string | null
  color_hex?: string | null
  style?: string | null
  size: string
  quantity: number
  unit_price?: number | null   // dollars
}

// Replace the full variant set for a product (absolute quantities).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { variants }: { variants: VariantInput[] } = await req.json()

  if (!Array.isArray(variants)) {
    return NextResponse.json({ error: 'variants must be an array' }, { status: 400 })
  }

  const errors: string[] = []
  let saved = 0
  const keep: Array<{ color: string; size: string; style: string }> = []

  for (const v of variants) {
    if (!v.color?.trim() || !v.size?.trim()) {
      errors.push(`Row missing color or size: ${JSON.stringify(v)}`)
      continue
    }
    const color = v.color.toLowerCase().trim()
    const size = v.size.trim()
    const style = (v.style ?? '').trim()
    const unitCents =
      v.unit_price != null && !isNaN(Number(v.unit_price)) ? Math.round(Number(v.unit_price) * 100) : null

    const { error } = await supabaseAdmin.rpc('set_product_variant', {
      p_product_id: id,
      p_color: color,
      p_size: size,
      p_quantity: Math.max(0, Math.round(v.quantity) || 0),
      p_color_hex: v.color_hex?.trim() || null,
      p_unit_price: unitCents,
      p_color_code: v.color_code?.trim() || null,
      p_style: style,
    })
    if (error) errors.push(`${color} ${size}: ${error.message}`)
    else { saved++; keep.push({ color, size, style }) }
  }

  // Delete any existing variants that are no longer in the submitted set
  const { data: existing } = await supabaseAdmin
    .from('product_variants')
    .select('id, color, size, style')
    .eq('product_id', id)
  const keepKeys = new Set(keep.map(k => `${k.color}|${k.size}|${k.style}`))
  const toDelete = (existing ?? []).filter(
    (r: { color: string; size: string; style: string }) => !keepKeys.has(`${r.color}|${r.size}|${r.style ?? ''}`)
  )
  if (toDelete.length) {
    await supabaseAdmin
      .from('product_variants')
      .delete()
      .in('id', toDelete.map((r: { id: string }) => r.id))
  }

  return NextResponse.json({ saved, deleted: toDelete.length, errors })
}
