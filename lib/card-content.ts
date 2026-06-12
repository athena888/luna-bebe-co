import { supabaseAdmin } from './supabase'

export interface CardLine { k: string; v: string }
export interface CardItemContent {
  title: string
  lines: CardLine[]
  note?: string
}
export type CardItemMap = Record<string, CardItemContent>

const CONTENT_KEY = 'card.items'

export async function getCardItemContents(): Promise<CardItemMap> {
  try {
    const { data } = await supabaseAdmin
      .from('site_content')
      .select('value')
      .eq('key', CONTENT_KEY)
      .maybeSingle()
    if (data?.value) {
      const raw = typeof data.value === 'string' ? data.value : JSON.stringify(data.value)
      return JSON.parse(raw) as CardItemMap
    }
  } catch { /* fall through to empty */ }
  return {}
}

export async function saveCardItemContents(map: CardItemMap): Promise<void> {
  await supabaseAdmin
    .from('site_content')
    .upsert({ key: CONTENT_KEY, value: JSON.stringify(map) }, { onConflict: 'key' })
}
