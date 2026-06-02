import { supabaseAdmin } from './supabase'
import { getAllProducts } from './products'
import { PROTECTED_PRODUCT_IDS } from './prebuilt-boxes'
import type { ProductCert } from './certifications'
import type { Product, ProductCategory } from '@/types'

export interface DbProduct extends Product {
  active: boolean
  is_custom: boolean
  sort_order: number
  has_variants: boolean
  certifications: ProductCert[]
}

interface ProductRow {
  id: string
  name: string
  description: string
  price: number
  category: string
  image_emoji: string
  image: string | null
  tag: string | null
  ingredients: string | null
  active: boolean
  is_custom: boolean
  sort_order: number
  has_variants: boolean | null
  certifications: ProductCert[] | null
}

function rowToProduct(r: ProductRow): DbProduct {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    price: r.price,
    category: r.category as ProductCategory,
    imageEmoji: r.image_emoji,
    image: r.image ?? undefined,
    tag: r.tag ?? undefined,
    ingredients: r.ingredients ?? undefined,
    active: r.active,
    is_custom: r.is_custom,
    sort_order: r.sort_order,
    has_variants: r.has_variants ?? false,
    certifications: r.certifications ?? [],
  }
}

/**
 * Seeds the products table from the static built-in catalog the first time
 * it's read. Pulls any already-uploaded primary image from product_overrides.
 * Idempotent — only inserts rows that don't exist yet.
 */
async function ensureSeeded(): Promise<void> {
  const { count, error } = await supabaseAdmin
    .from('products')
    .select('id', { count: 'exact', head: true })

  if (error) throw error
  if ((count ?? 0) > 0) return

  // Pull any prior portal edits (name/description/price/tag/ingredients/image)
  // so seeded rows preserve changes made via the old override-based editor.
  const { data: overrides } = await supabaseAdmin
    .from('product_overrides')
    .select('product_id, name, description, price, tag, ingredients, image')
  const overrideById = new Map<string, Record<string, unknown>>()
  ;(overrides ?? []).forEach((o: Record<string, unknown>) => {
    overrideById.set(o.product_id as string, o)
  })

  const builtins = getAllProducts()
  const rows = builtins.map((p, idx) => {
    const o = overrideById.get(p.id) ?? {}
    const pick = <T>(key: string, fallback: T): T => (o[key] != null ? (o[key] as T) : fallback)
    return {
      id: p.id,
      name: pick('name', p.name),
      description: pick('description', p.description),
      price: pick('price', p.price),
      category: p.category,
      image_emoji: p.imageEmoji,
      image: (o.image as string | undefined) ?? null,
      tag: pick<string | null>('tag', p.tag ?? null),
      ingredients: pick<string | null>('ingredients', p.ingredients ?? null),
      active: true,
      is_custom: false,
      sort_order: idx,
    }
  })

  await supabaseAdmin.from('products').upsert(rows, { onConflict: 'id' })
}

/** All products in the live catalog (optionally only active). */
export async function getCatalog(opts: { activeOnly?: boolean } = {}): Promise<DbProduct[]> {
  await ensureSeeded()
  let query = supabaseAdmin.from('products').select('*').order('sort_order')
  if (opts.activeOnly) query = query.eq('active', true)
  const { data, error } = await query
  if (error) throw error
  return (data as ProductRow[]).map(rowToProduct)
}

export async function getCatalogProduct(id: string): Promise<DbProduct | null> {
  await ensureSeeded()
  const { data } = await supabaseAdmin.from('products').select('*').eq('id', id).maybeSingle()
  return data ? rowToProduct(data as ProductRow) : null
}

export interface CreateProductInput {
  name: string
  description?: string
  price: number
  category: ProductCategory
  imageEmoji?: string
  image?: string | null
  tag?: string | null
  ingredients?: string | null
  active?: boolean          // false = unpublished draft (hidden from customers)
}

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
}

/** Creates a brand-new custom product. Generates a unique id from category + name. */
export async function createProduct(input: CreateProductInput): Promise<DbProduct> {
  await ensureSeeded()
  const base = `${input.category}-${slugify(input.name)}`
  let id = base
  // Ensure uniqueness
  for (let i = 2; ; i++) {
    const { data: exists } = await supabaseAdmin.from('products').select('id').eq('id', id).maybeSingle()
    if (!exists) break
    id = `${base}-${i}`
  }

  const { data: maxRow } = await supabaseAdmin
    .from('products')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextOrder = ((maxRow as { sort_order: number } | null)?.sort_order ?? 0) + 1

  const { data, error } = await supabaseAdmin
    .from('products')
    .insert({
      id,
      name: input.name,
      description: input.description ?? '',
      price: input.price,
      category: input.category,
      image_emoji: input.imageEmoji ?? '🎁',
      image: input.image ?? null,
      tag: input.tag ?? null,
      ingredients: input.ingredients ?? null,
      active: input.active ?? true,
      is_custom: true,
    })
    .select()
    .single()

  if (error) throw error
  return rowToProduct(data as ProductRow)
}

export interface UpdateProductInput {
  name?: string
  description?: string
  price?: number
  tag?: string | null
  ingredients?: string | null
  imageEmoji?: string
  active?: boolean
  hasVariants?: boolean
  certifications?: ProductCert[]
}

/** Updates editable fields on an existing product. */
export async function updateProduct(id: string, input: UpdateProductInput): Promise<void> {
  await ensureSeeded()
  const patch: Record<string, unknown> = {}
  if (input.name !== undefined) patch.name = input.name
  if (input.description !== undefined) patch.description = input.description
  if (input.price !== undefined) patch.price = input.price
  if (input.tag !== undefined) patch.tag = input.tag
  if (input.ingredients !== undefined) patch.ingredients = input.ingredients
  if (input.imageEmoji !== undefined) patch.image_emoji = input.imageEmoji
  if (input.active !== undefined) patch.active = input.active
  if (input.hasVariants !== undefined) patch.has_variants = input.hasVariants
  if (input.certifications !== undefined) patch.certifications = input.certifications
  if (Object.keys(patch).length === 0) return
  const { error } = await supabaseAdmin.from('products').update(patch).eq('id', id)
  if (error) throw error
}

/** Sets the primary image URL for a product (called after an upload). */
export async function setProductImage(id: string, imageUrl: string): Promise<void> {
  await supabaseAdmin.from('products').update({ image: imageUrl }).eq('id', id)
}

/** Permanently deletes a product unless it's used by a prebuilt box. */
export async function deleteProduct(id: string): Promise<{ ok: boolean; reason?: string }> {
  // Check the editable boxes (prebuilt_boxes table) for any slot referencing this id.
  // Falls back to the static set if the table isn't seeded yet.
  let usedByBoxes: string[] = []
  try {
    const { data } = await supabaseAdmin.from('prebuilt_boxes').select('name, selection')
    for (const row of (data ?? []) as Array<{ name: string; selection: Record<string, { product_id?: string } | null> | null }>) {
      const refs = Object.values(row.selection ?? {})
      if (refs.some(r => r?.product_id === id)) usedByBoxes.push(row.name)
    }
  } catch {
    if (PROTECTED_PRODUCT_IDS.has(id)) usedByBoxes = ['a prebuilt box']
  }

  if (usedByBoxes.length) {
    return {
      ok: false,
      reason: `Used in ${usedByBoxes.join(', ')}. Swap it out in the box editor (Portal → Boxes) first, then delete.`,
    }
  }

  const { error } = await supabaseAdmin.from('products').delete().eq('id', id)
  if (error) return { ok: false, reason: error.message }
  return { ok: true }
}

/**
 * Returns ids of products that have a real image — from the products.image column,
 * the product_overrides.image field, any product_gallery row, or a storage file
 * named {id}.{ext} in the product-images bucket.
 */
async function productIdsWithImages(): Promise<Set<string>> {
  const withImages = new Set<string>()

  const [{ data: prods }, { data: overrides }, { data: gallery }, storageList] = await Promise.all([
    supabaseAdmin.from('products').select('id, image'),
    supabaseAdmin.from('product_overrides').select('product_id, image'),
    supabaseAdmin.from('product_gallery').select('product_id'),
    supabaseAdmin.storage.from('product-images').list('', { limit: 1000 }),
  ])

  ;(prods ?? []).forEach((p: { id: string; image: string | null }) => { if (p.image) withImages.add(p.id) })
  ;(overrides ?? []).forEach((o: { product_id: string; image: string | null }) => { if (o.image) withImages.add(o.product_id) })
  ;(gallery ?? []).forEach((g: { product_id: string }) => withImages.add(g.product_id))
  // Storage file named "{id}.jpg" → strip extension to recover the product id
  ;(storageList.data ?? []).forEach((f: { name: string }) => {
    const dot = f.name.lastIndexOf('.')
    const idPart = dot > 0 ? f.name.slice(0, dot) : f.name
    withImages.add(idPart)
  })

  return withImages
}

/** Lists active products that have NO image and are not protected by a prebuilt box. */
export async function productsWithoutImages(): Promise<DbProduct[]> {
  const [catalog, withImages] = await Promise.all([getCatalog(), productIdsWithImages()])
  return catalog.filter(p => !withImages.has(p.id) && !PROTECTED_PRODUCT_IDS.has(p.id))
}
