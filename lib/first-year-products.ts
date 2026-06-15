import { supabaseAdmin } from './supabase'

// CRUD for "The First Year" product catalog (separate from the main store's
// products). Server-only — used by the portal admin and the public landing page.

export interface FirstYearProductRow {
  id: string
  name: string
  description: string
  price_cents: number | null
  sizes: string | null
  shipment_index: number | null
  images: string[]
  video_url: string | null
  sort_order: number
  published: boolean
}

const COLS = 'id, name, description, price_cents, sizes, shipment_index, images, video_url, sort_order, published'

function normalize(r: Record<string, unknown>): FirstYearProductRow {
  return {
    id: String(r.id),
    name: String(r.name ?? ''),
    description: String(r.description ?? ''),
    price_cents: r.price_cents == null ? null : Number(r.price_cents),
    sizes: (r.sizes as string | null) ?? null,
    shipment_index: r.shipment_index == null ? null : Number(r.shipment_index),
    images: Array.isArray(r.images) ? (r.images as string[]) : [],
    video_url: (r.video_url as string | null) ?? null,
    sort_order: Number(r.sort_order ?? 0),
    published: Boolean(r.published),
  }
}

/** All catalog items (admin), ordered. */
export async function listFirstYearProducts(): Promise<FirstYearProductRow[]> {
  const { data } = await supabaseAdmin
    .from('first_year_products')
    .select(COLS)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  return (data ?? []).map(normalize)
}

/** Published items only (public landing page). */
export async function listPublishedFirstYearProducts(): Promise<FirstYearProductRow[]> {
  try {
    const { data } = await supabaseAdmin
      .from('first_year_products')
      .select(COLS)
      .eq('published', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    return (data ?? []).map(normalize)
  } catch {
    return [] // table not migrated yet — fail soft
  }
}

export async function getFirstYearProductRow(id: string): Promise<FirstYearProductRow | null> {
  const { data } = await supabaseAdmin.from('first_year_products').select(COLS).eq('id', id).maybeSingle()
  return data ? normalize(data) : null
}

export async function createFirstYearProduct(): Promise<FirstYearProductRow> {
  const { data, error } = await supabaseAdmin
    .from('first_year_products')
    .insert({ name: '', description: '', published: false })
    .select(COLS)
    .single()
  if (error) throw error
  return normalize(data)
}

export interface FirstYearProductPatch {
  name?: string
  description?: string
  price_cents?: number | null
  sizes?: string | null
  shipment_index?: number | null
  images?: string[]
  video_url?: string | null
  sort_order?: number
  published?: boolean
}

export async function updateFirstYearProduct(id: string, patch: FirstYearProductPatch): Promise<void> {
  await supabaseAdmin
    .from('first_year_products')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
}

export async function deleteFirstYearProduct(id: string): Promise<void> {
  // Best-effort: remove this item's uploaded media from storage too.
  const row = await getFirstYearProductRow(id)
  const urls = [...(row?.images ?? []), ...(row?.video_url ? [row.video_url] : [])]
  const paths = urls
    .map(u => u.split('/product-images/').pop())
    .filter((p): p is string => Boolean(p))
  if (paths.length) {
    try { await supabaseAdmin.storage.from('product-images').remove(paths) } catch { /* ignore */ }
  }
  await supabaseAdmin.from('first_year_products').delete().eq('id', id)
}
