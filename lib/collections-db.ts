import { supabaseAdmin } from './supabase'

export interface CollectionDef {
  id: string
  label: string
  sub: string
  home_image_slot: string
  product_ids: string[]
  sort_order: number
  active: boolean
}

let _cache: CollectionDef[] | null = null
let _cacheTime = 0
const CACHE_TTL = 30000 // 30s

async function ensureSeeded(): Promise<void> {
  const { count } = await supabaseAdmin
    .from('collections')
    .select('id', { count: 'exact', head: true })
  if ((count ?? 0) > 0) return

  // Seed from defaults if table is empty
  const defaults: CollectionDef[] = [
    {
      id: 'newborn',
      label: 'Newborn Gifts',
      sub: 'Swaddles, garments & keepsakes',
      home_image_slot: 'newborn',
      product_ids: ['swaddle-muslin', 'swaddle-bamboo', 'garment-kimono', 'garment-gown', 'bath-botanical', 'keepsake-bunny', 'keepsake-rattle'],
      sort_order: 0,
      active: true,
    },
    {
      id: 'mama',
      label: 'For Mama',
      sub: 'Because she deserves to be celebrated',
      home_image_slot: 'mama',
      product_ids: ['mom-lavender', 'mom-silk', 'mom-tea', 'mom-journal', 'mom-herbal'],
      sort_order: 1,
      active: true,
    },
    {
      id: 'bundle',
      label: 'Mama & Baby Bundle',
      sub: 'A gift for two hearts at once',
      home_image_slot: 'bundle',
      product_ids: ['swaddle-bamboo', 'garment-kimono', 'bath-botanical', 'mom-lavender', 'keepsake-bunny'],
      sort_order: 2,
      active: true,
    },
    {
      id: 'custom',
      label: 'Custom Box',
      sub: 'Build it your way, item by item',
      home_image_slot: 'custom',
      product_ids: [],
      sort_order: 3,
      active: true,
    },
  ]

  await supabaseAdmin.from('collections').upsert(defaults, { onConflict: 'id' })
}

export async function getCollections(): Promise<CollectionDef[]> {
  await ensureSeeded()

  const now = Date.now()
  if (_cache && now - _cacheTime < CACHE_TTL) {
    return _cache
  }

  let data: CollectionDef[] = []
  try {
    const res = await supabaseAdmin
      .from('collections')
      .select('*')
      .eq('active', true)
      .order('sort_order')
    data = (res.data ?? []) as CollectionDef[]
  } catch (err) {
    console.error('Failed to fetch collections:', err)
    data = []
  }

  _cache = data
  _cacheTime = now
  return data
}

export async function getCollection(id: string): Promise<CollectionDef | null> {
  await ensureSeeded()
  const { data } = await supabaseAdmin
    .from('collections')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  return (data as CollectionDef) ?? null
}

export interface UpdateCollectionInput {
  label?: string
  sub?: string
  product_ids?: string[]
  home_image_slot?: string
  sort_order?: number
  active?: boolean
}

export async function updateCollection(id: string, input: UpdateCollectionInput): Promise<void> {
  await ensureSeeded()
  const patch: Record<string, unknown> = {}
  if (input.label !== undefined) patch.label = input.label
  if (input.sub !== undefined) patch.sub = input.sub
  if (input.product_ids !== undefined) patch.product_ids = input.product_ids
  if (input.home_image_slot !== undefined) patch.home_image_slot = input.home_image_slot
  if (input.sort_order !== undefined) patch.sort_order = input.sort_order
  if (input.active !== undefined) patch.active = input.active
  if (Object.keys(patch).length === 0) return

  patch.updated_at = new Date().toISOString()

  const { error } = await supabaseAdmin
    .from('collections')
    .update(patch)
    .eq('id', id)
  if (error) throw error

  _cache = null
}

export async function invalidateCollectionsCache(): Promise<void> {
  _cache = null
}
