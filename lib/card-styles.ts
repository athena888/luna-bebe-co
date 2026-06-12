import { supabaseAdmin } from './supabase'

// Auto-detected placement/styling for the personal message printed on the card.
export interface CardMeta {
  theme?: string                                   // printed sub-label / sentiment, e.g. "for baby & mama"
  font?: 'serif' | 'script'                        // how the message should be set
  textZone?: { x: number; y: number; w: number; align: 'left' | 'center' | 'right' }  // % coords of the empty area
}

export interface CardStyle {
  id: string
  name: string
  image_url: string
  alt_text: string
  size_label: string
  word_limit: number
  sort_order: number
  active: boolean
  meta?: CardMeta | null
}

// Sensible fallback zone when a card has no detected meta (e.g. before the
// card_styles.meta migration has run) — centered in the middle of the card.
export const DEFAULT_CARD_META: CardMeta = {
  font: 'serif',
  textZone: { x: 15, y: 42, w: 70, align: 'center' },
}

// Active card styles for the storefront (the card picker). Fails soft to [].
export async function getCardStyles(activeOnly = true): Promise<CardStyle[]> {
  try {
    let q = supabaseAdmin.from('card_styles').select('*').order('sort_order')
    if (activeOnly) q = q.eq('active', true)
    const { data } = await q
    return (data ?? []) as CardStyle[]
  } catch {
    return []
  }
}
