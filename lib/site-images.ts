import { supabaseAdmin } from './supabase.ts'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
function legacyHomeUrl(slot: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/home-images/${slot}.jpg`
}

export interface SiteImage { public_url: string; alt_text: string }

// Read a managed slot image. Returns null when unset (caller falls back).
// Used server-side; fails soft if the table isn't there yet.
export async function getSiteImage(slotKey: string): Promise<SiteImage | null> {
  try {
    const { data } = await supabaseAdmin
      .from('site_images')
      .select('public_url, alt_text')
      .eq('slot_key', slotKey)
      .order('sort_order')
      .limit(1)
      .maybeSingle()
    return data ?? null
  } catch {
    return null
  }
}

// Fetch many slots at once (one query) → map of slotKey -> SiteImage.
export async function getSiteImages(slotKeys: string[]): Promise<Record<string, SiteImage>> {
  try {
    const { data } = await supabaseAdmin
      .from('site_images')
      .select('slot_key, public_url, alt_text')
      .in('slot_key', slotKeys)
      .order('sort_order')
    const out: Record<string, SiteImage> = {}
    for (const r of data ?? []) {
      if (!out[r.slot_key]) out[r.slot_key] = { public_url: r.public_url, alt_text: r.alt_text }
    }
    return out
  } catch {
    return {}
  }
}

// Ordered gallery (1..n) for rotating homepage slots, keyed `home.<slot>` in
// site_images. Falls back to the legacy single home-images/<slot>.jpg when a
// slot has no gallery rows, so existing single images keep showing.
export async function getHomeGalleries(slots: string[]): Promise<Record<string, string[]>> {
  const out: Record<string, string[]> = {}
  try {
    const keys = slots.map(s => `home.${s}`)
    const { data } = await supabaseAdmin
      .from('site_images')
      .select('slot_key, public_url, sort_order')
      .in('slot_key', keys)
      .order('sort_order')
    for (const r of data ?? []) {
      const slot = (r.slot_key as string).replace(/^home\./, '')
      ;(out[slot] ??= []).push(r.public_url as string)
    }
  } catch {
    // fall through to legacy fallbacks
  }
  for (const s of slots) {
    // Legacy single-file fallback applies only to base slots. Variant slots
    // like 'hero.mobile' stay empty when unset — callers then fall back to
    // the desktop gallery instead of requesting a file that never existed.
    if (!out[s]?.length) out[s] = s.includes('.') ? [] : [legacyHomeUrl(s)]
  }
  return out
}
