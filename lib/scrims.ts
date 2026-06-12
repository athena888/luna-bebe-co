import { supabaseAdmin } from './supabase'

const KEY = 'site.scrims'

export interface ScrimValue { hex: string; opacity: number }
export type ScrimMap = Record<string, ScrimValue>

export async function getScrims(): Promise<ScrimMap> {
  try {
    const { data } = await supabaseAdmin.from('site_content').select('value').eq('key', KEY).maybeSingle()
    if (!data?.value) return {}
    const raw = typeof data.value === 'string' ? data.value : JSON.stringify(data.value)
    return JSON.parse(raw) as ScrimMap
  } catch { return {} }
}

export async function saveScrims(map: ScrimMap): Promise<void> {
  await supabaseAdmin
    .from('site_content')
    .upsert({ key: KEY, value: JSON.stringify(map) }, { onConflict: 'key' })
}
