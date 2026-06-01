import { supabaseAdmin } from './supabase'
import { PREBUILT_BOXES } from './prebuilt-boxes'
import { getCatalog } from './products-db'
import type { BoxSelection, Product } from '@/types'

const SLOTS = ['swaddle', 'garment', 'bath', 'keepsake', 'mom', 'extra1', 'extra2'] as const
type Slot = typeof SLOTS[number]

export type SlotRef = { product_id: string; color?: string | null; size?: string | null }
type SelectionJson = Partial<Record<Slot, SlotRef | null>>

export interface ResolvedBox {
  slug: string
  name: string
  style: string
  variant: 'neutral' | 'girl' | 'boy'
  tagline: string
  description: string
  aesthetic: string
  featured: boolean
  image?: string
  customPrice?: number
  sortOrder: number
  active: boolean
  selection: BoxSelection
  selectionRefs: SelectionJson   // raw refs (product_id + optional color/size) for the editor
}

interface BoxRow {
  slug: string
  name: string
  style: string
  variant: string
  tagline: string
  description: string
  aesthetic: string
  featured: boolean
  image: string | null
  custom_price: number | null
  sort_order: number
  active: boolean
  selection: SelectionJson | null
}

/** Seed the table from the static catalog the first time it's read. */
async function ensureSeeded(): Promise<void> {
  const { count, error } = await supabaseAdmin
    .from('prebuilt_boxes')
    .select('slug', { count: 'exact', head: true })
  if (error) throw error
  if ((count ?? 0) > 0) return

  const rows = PREBUILT_BOXES.map((box, idx) => {
    const selection: SelectionJson = {}
    for (const slot of SLOTS) {
      const p = box.selection[slot] as Product | null | undefined
      selection[slot] = p ? { product_id: p.id } : null
    }
    return {
      slug: box.slug,
      name: box.name,
      style: box.style,
      variant: box.variant,
      tagline: box.tagline,
      description: box.description,
      aesthetic: box.aesthetic,
      featured: box.featured,
      image: box.image ?? null,
      custom_price: box.customPrice ?? null,
      sort_order: idx,
      active: true,
      selection,
    }
  })
  await supabaseAdmin.from('prebuilt_boxes').upsert(rows, { onConflict: 'slug' })
}

function resolveRow(row: BoxRow, productById: Map<string, Product>): ResolvedBox {
  const refs = (row.selection ?? {}) as SelectionJson
  const selection: BoxSelection = {
    swaddle: null, garment: null, bath: null, keepsake: null, mom: null, extra1: null, extra2: null,
  }
  for (const slot of SLOTS) {
    const ref = refs[slot]
    if (ref?.product_id) {
      const product = productById.get(ref.product_id)
      if (product) {
        // attach chosen variant so it flows through "shop this box" → checkout
        selection[slot] = ref.color && ref.size
          ? ({ ...product, selectedColor: ref.color, selectedSize: ref.size } as Product)
          : product
      }
    }
  }
  return {
    slug: row.slug,
    name: row.name,
    style: row.style,
    variant: (row.variant as ResolvedBox['variant']) ?? 'neutral',
    tagline: row.tagline,
    description: row.description,
    aesthetic: row.aesthetic,
    featured: row.featured,
    image: row.image ?? undefined,
    customPrice: row.custom_price ?? undefined,
    sortOrder: row.sort_order,
    active: row.active,
    selection,
    selectionRefs: refs,
  }
}

export async function getBoxes(opts: { featuredOnly?: boolean; activeOnly?: boolean } = {}): Promise<ResolvedBox[]> {
  await ensureSeeded()
  let query = supabaseAdmin.from('prebuilt_boxes').select('*').order('sort_order')
  if (opts.featuredOnly) query = query.eq('featured', true)
  if (opts.activeOnly !== false) query = query.eq('active', true)
  const { data, error } = await query
  if (error) throw error

  const catalog = await getCatalog()
  const productById = new Map<string, Product>(catalog.map(p => [p.id, p]))
  return (data as BoxRow[]).map(row => resolveRow(row, productById))
}

export async function getBox(slug: string): Promise<ResolvedBox | null> {
  await ensureSeeded()
  const { data } = await supabaseAdmin.from('prebuilt_boxes').select('*').eq('slug', slug).maybeSingle()
  if (!data) return null
  const catalog = await getCatalog()
  const productById = new Map<string, Product>(catalog.map(p => [p.id, p]))
  return resolveRow(data as BoxRow, productById)
}

export interface UpdateBoxInput {
  name?: string
  style?: string
  variant?: string
  tagline?: string
  description?: string
  aesthetic?: string
  featured?: boolean
  image?: string | null
  customPrice?: number | null
  selection?: SelectionJson
}

export async function updateBox(slug: string, input: UpdateBoxInput): Promise<void> {
  await ensureSeeded()
  const patch: Record<string, unknown> = {}
  if (input.name !== undefined) patch.name = input.name
  if (input.style !== undefined) patch.style = input.style
  if (input.variant !== undefined) patch.variant = input.variant
  if (input.tagline !== undefined) patch.tagline = input.tagline
  if (input.description !== undefined) patch.description = input.description
  if (input.aesthetic !== undefined) patch.aesthetic = input.aesthetic
  if (input.featured !== undefined) patch.featured = input.featured
  if (input.image !== undefined) patch.image = input.image
  if (input.customPrice !== undefined) patch.custom_price = input.customPrice
  if (input.selection !== undefined) patch.selection = input.selection
  if (Object.keys(patch).length === 0) return
  const { error } = await supabaseAdmin.from('prebuilt_boxes').update(patch).eq('slug', slug)
  if (error) throw error
}

/** Product IDs referenced by any box (used to block deleting them). Returns which boxes use each. */
export async function getProtectedProductIds(): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>()
  const { data } = await supabaseAdmin.from('prebuilt_boxes').select('name, selection')
  for (const row of (data ?? []) as Array<{ name: string; selection: SelectionJson | null }>) {
    for (const slot of SLOTS) {
      const ref = row.selection?.[slot]
      if (ref?.product_id) {
        const boxes = map.get(ref.product_id) ?? []
        if (!boxes.includes(row.name)) boxes.push(row.name)
        map.set(ref.product_id, boxes)
      }
    }
  }
  return map
}
