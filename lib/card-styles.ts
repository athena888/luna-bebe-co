import { supabaseAdmin } from './supabase'

export interface CardStyle {
  id: string
  name: string
  image_url: string
  alt_text: string
  size_label: string
  word_limit: number
  sort_order: number
  active: boolean
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
