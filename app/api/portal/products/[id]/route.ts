import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { PRODUCTS } from '@/lib/products'
import { getAllProducts } from '@/lib/products'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const base = getAllProducts().find(p => p.id === id)
  if (!base) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  const [overrideRes, inventoryRes, galleryRes] = await Promise.all([
    supabaseAdmin.from('product_overrides').select('*').eq('product_id', id).single(),
    supabaseAdmin.from('inventory').select('*').eq('product_id', id).single(),
    supabaseAdmin.from('product_gallery').select('*').eq('product_id', id).order('sort_order'),
  ])

  const override = overrideRes.data ?? {}
  const inventory = inventoryRes.data ?? { quantity: 0 }
  const gallery = galleryRes.data ?? []

  return NextResponse.json({
    product: {
      ...base,
      ...Object.fromEntries(Object.entries(override).filter(([, v]) => v !== null)),
    },
    inventory: { quantity: inventory.quantity },
    gallery,
  })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const { name, description, price, tag, ingredients, inventoryQuantity } = body

  // Upsert product overrides
  const overrideData: Record<string, unknown> = { product_id: id }
  if (name !== undefined) overrideData.name = name
  if (description !== undefined) overrideData.description = description
  if (price !== undefined) overrideData.price = price
  if (tag !== undefined) overrideData.tag = tag
  if (ingredients !== undefined) overrideData.ingredients = ingredients

  const { error: overrideError } = await supabaseAdmin
    .from('product_overrides')
    .upsert(overrideData, { onConflict: 'product_id' })

  if (overrideError) {
    return NextResponse.json({ error: 'Failed to save product details' }, { status: 500 })
  }

  // Update inventory if provided
  if (inventoryQuantity !== undefined) {
    await supabaseAdmin
      .from('inventory')
      .upsert({ product_id: id, quantity: inventoryQuantity }, { onConflict: 'product_id' })
  }

  return NextResponse.json({ ok: true })
}
