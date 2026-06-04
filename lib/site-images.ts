import { supabaseAdmin } from './supabase'

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
