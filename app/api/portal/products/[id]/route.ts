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

  const inventory = inventoryRes.data ?? { quantity: 0, lead_time_days: 14, safety_stock: 3 }
  const gallery = galleryRes.data ?? []
  const { data: overrideRow } = await supabaseAdmin
    .from('product_overrides').select('hover_video').eq('product_id', id).maybeSingle()
  const videoUrl: string | null = overrideRow?.hover_video ?? null

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
    videoUrl,
    inventory: {
      quantity: inventory.quantity,
      lead_time_days: (inventory as { lead_time_days?: number }).lead_time_days ?? 14,
      safety_stock: (inventory as { safety_stock?: number }).safety_stock ?? 3,
    },
    gallery,
    sales: { units, revenue, lastOrderedAt },
  })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { name, description, price, category, tag, ingredients, inventoryQuantity, leadTimeDays, safetyStock, hasVariants, certifications, active, needsReview, featured, organic, isAddon, addonRank, seoTitle, seoDescription, faqs } = body

  // Save core fields first — never let certifications block a save
  try {
    await updateProduct(id, { name, description, price, category, tag, ingredients, hasVariants, active, needsReview, featured, organic, seoTitle, seoDescription, faqs })
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

  // Add-on flags saved separately too — fail-soft until §31 is run
  if (isAddon !== undefined || addonRank !== undefined) {
    try {
      await updateProduct(id, { isAddon, addonRank })
    } catch {
      console.warn('is_addon/addon_rank columns not ready — run the SQL migration (§31)')
    }
  }

  if (inventoryQuantity !== undefined || leadTimeDays !== undefined || safetyStock !== undefined) {
    const patch: Record<string, number> = {}
    if (inventoryQuantity !== undefined) patch.quantity = Math.max(0, Math.round(Number(inventoryQuantity)) || 0)
    if (leadTimeDays !== undefined) patch.lead_time_days = Math.max(0, Math.round(Number(leadTimeDays)) || 0)
    if (safetyStock !== undefined) patch.safety_stock = Math.max(0, Math.round(Number(safetyStock)) || 0)
    // Manual update-or-insert (no onConflict) + surface errors so a failed
    // stock save no longer silently reports "Saved".
    const { data: existed } = await supabaseAdmin
      .from('inventory').select('product_id').eq('product_id', id).maybeSingle()
    const { error: invErr } = existed
      ? await supabaseAdmin.from('inventory').update(patch).eq('product_id', id)
      : await supabaseAdmin.from('inventory').insert({ product_id: id, quantity: 0, ...patch })
    if (invErr) {
      return NextResponse.json({ error: `Stock didn't save: ${invErr.message}` }, { status: 500 })
    }
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
