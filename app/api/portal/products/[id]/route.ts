import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getCatalogProduct, updateProduct, deleteProduct } from '@/lib/products-db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await getCatalogProduct(id)
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  const [inventoryRes, galleryRes, ordersRes] = await Promise.all([
    supabaseAdmin.from('inventory').select('*').eq('product_id', id).single(),
    supabaseAdmin.from('product_gallery').select('*').eq('product_id', id).order('sort_order'),
    supabaseAdmin.from('orders').select('selected_items, created_at, status').neq('status', 'pending'),
  ])

  const inventory = inventoryRes.data ?? { quantity: 0 }
  const gallery = galleryRes.data ?? []

  // If the gallery table has no rows but the product already has a storefront
  // photo (uploaded via the products list / bulk import, which only writes
  // product-images/{id}.jpg without a gallery row), seed a real gallery row
  // from it so the editor shows and can manage it.
  if (gallery.length === 0) {
    let imageUrl: string | null = product.image ?? null
    if (!imageUrl) {
      const { data: files } = await supabaseAdmin.storage
        .from('product-images')
        .list('', { search: `${id}.jpg` })
      if (files?.some(f => f.name === `${id}.jpg`)) {
        imageUrl = supabaseAdmin.storage.from('product-images').getPublicUrl(`${id}.jpg`).data.publicUrl
      }
    }
    if (imageUrl) {
      const { data: seeded } = await supabaseAdmin
        .from('product_gallery')
        .insert({ product_id: id, image_url: imageUrl, label: null, is_primary: true, sort_order: 0 })
        .select()
        .single()
      if (seeded) gallery.push(seeded)
    }
  }

  // Aggregate units sold + revenue for this product across paid orders
  let units = 0
  let revenue = 0
  let lastOrderedAt: string | null = null
  for (const order of ordersRes.data ?? []) {
    const items = (order.selected_items ?? []) as Array<{ id: string; price: number }>
    const matches = items.filter(it => it?.id === id)
    if (matches.length) {
      units += matches.length
      revenue += matches.reduce((s, it) => s + (it.price ?? 0), 0)
      if (!lastOrderedAt || order.created_at > lastOrderedAt) lastOrderedAt = order.created_at
    }
  }

  return NextResponse.json({
    product,
    inventory: { quantity: inventory.quantity },
    gallery,
    sales: { units, revenue, lastOrderedAt },
  })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { name, description, price, category, tag, ingredients, inventoryQuantity, hasVariants, certifications, active, needsReview, seoTitle, seoDescription, faqs } = body

  // Save core fields first — never let certifications block a save
  try {
    await updateProduct(id, { name, description, price, category, tag, ingredients, hasVariants, active, needsReview, seoTitle, seoDescription, faqs })
  } catch {
    return NextResponse.json({ error: 'Failed to save product details' }, { status: 500 })
  }

  // Certifications saved separately — if the column doesn't exist yet it fails
  // silently so the rest of the save still succeeds
  if (certifications !== undefined) {
    try {
      await updateProduct(id, { certifications })
    } catch {
      console.warn('certifications column not ready — run the SQL migration')
    }
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
