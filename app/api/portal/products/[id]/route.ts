import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getCatalogProduct, updateProduct, deleteProduct } from '@/lib/products-db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await getCatalogProduct(id)
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  const [inventoryRes, galleryRes] = await Promise.all([
    supabaseAdmin.from('inventory').select('*').eq('product_id', id).single(),
    supabaseAdmin.from('product_gallery').select('*').eq('product_id', id).order('sort_order'),
  ])

  const inventory = inventoryRes.data ?? { quantity: 0 }
  const gallery = galleryRes.data ?? []

  return NextResponse.json({
    product,
    inventory: { quantity: inventory.quantity },
    gallery,
  })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { name, description, price, tag, ingredients, inventoryQuantity } = body

  try {
    await updateProduct(id, { name, description, price, tag, ingredients })
  } catch {
    return NextResponse.json({ error: 'Failed to save product details' }, { status: 500 })
  }

  if (inventoryQuantity !== undefined) {
    await supabaseAdmin
      .from('inventory')
      .upsert({ product_id: id, quantity: inventoryQuantity }, { onConflict: 'product_id' })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await deleteProduct(id)
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
