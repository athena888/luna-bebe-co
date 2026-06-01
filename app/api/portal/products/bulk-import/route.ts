import { NextRequest, NextResponse } from 'next/server'
import { getAllProducts } from '@/lib/products'
import { supabaseAdmin } from '@/lib/supabase'

interface ProductUpdate {
  product_id: string
  name?: string
  description?: string
  ingredients?: string
  tag?: string
  price?: number
}

export async function POST(req: NextRequest) {
  try {
    const { updates } = await req.json()

    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: 'updates must be an array' }, { status: 400 })
    }

    const allProducts = getAllProducts()
    const productMap = new Map(allProducts.map(p => [p.id, p]))

    const saved: string[] = []
    const errors: Array<{ id: string; reason: string }> = []

    for (const update of updates) {
      const { product_id, ...fields } = update

      if (!product_id) {
        errors.push({ id: '', reason: 'product_id is required' })
        continue
      }

      if (!productMap.has(product_id)) {
        errors.push({ id: product_id, reason: `Product "${product_id}" not found` })
        continue
      }

      // Build override object with only non-empty fields
      const override: Record<string, any> = { product_id }
      if (fields.name?.trim()) override.name = fields.name.trim()
      if (fields.description?.trim()) override.description = fields.description.trim()
      if (fields.ingredients?.trim()) override.ingredients = fields.ingredients.trim()
      if (fields.tag?.trim()) override.tag = fields.tag.trim()
      if (fields.price) override.price = Math.round(fields.price)

      // Upsert into product_overrides
      const { error } = await supabaseAdmin
        .from('product_overrides')
        .upsert([override], { onConflict: 'product_id' })

      if (error) {
        errors.push({ id: product_id, reason: error.message })
      } else {
        saved.push(product_id)
      }
    }

    return NextResponse.json({ saved, errors })
  } catch (error) {
    console.error('Bulk import error:', error)
    return NextResponse.json({ error: 'Bulk import failed' }, { status: 500 })
  }
}
