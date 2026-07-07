import { supabaseAdmin } from '../supabase'

// The one integration point the outreach worker uses: the stable public route
// of the currently-published lookbook, or null when nothing is published yet
// (callers must degrade gracefully — fallback copy links /corporate instead).

const BASE = (process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com').replace(/\/$/, '')

export interface CurrentLookbook { url: string; version: number }

export async function getCurrentLookbook(): Promise<CurrentLookbook | null> {
  try {
    const { data } = await supabaseAdmin.from('lookbook_versions')
      .select('version').eq('is_current', true).maybeSingle()
    if (!data) return null
    // Stable route — 302s to a signed URL of the current version, so the link
    // in already-sent emails never rots. UTM-tagged per docs/utm-conventions.md
    // (note: a PDF can't run analytics itself — the tags matter for server logs
    // and consistency; on-site attribution rides the /corporate + /press links).
    return {
      url: `${BASE}/corporate/lookbook.pdf?utm_source=outreach&utm_medium=email&utm_campaign=lookbook`,
      version: (data as { version: number }).version,
    }
  } catch {
    return null   // table not migrated yet — behave as "not published"
  }
}
