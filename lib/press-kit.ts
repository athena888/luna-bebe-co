import { supabaseAdmin } from './supabase'

// The press channel's one integration point: the public /press kit page URL,
// or null while no image is tagged is_press — callers must degrade (press
// drafting parks prospects as awaiting_press_kit; no pitch may ever point at
// an empty press page). Mirrors lib/lookbook/current.ts.

const BASE = (process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com').replace(/\/$/, '')

export interface PressKit { url: string; imageCount: number }

export async function getCurrentPressKit(): Promise<PressKit | null> {
  try {
    const { count } = await supabaseAdmin.from('brand_images')
      .select('id', { count: 'exact', head: true }).eq('is_press', true)
    if (!count) return null
    return { url: `${BASE}/press`, imageCount: count }
  } catch {
    return null   // is_press column not migrated yet — behave as "no kit"
  }
}
