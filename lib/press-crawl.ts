import { supabaseAdmin } from './supabase'
import { anthropic } from './anthropic'
import type { PressContact } from './press-pitch'

// Press-contact crawler — the same Claude + web_search approach as the B2B
// prospector (lib/pipeline/prospector.ts), pointed at ONE outlet at a time to
// find the right gift-guide/commerce journalist. Fills ONLY empty fields on
// the press_contacts row (never overwrites Emily's edits) and never invents
// an email: only addresses published on the outlet/author page (or a public
// press/masthead page) are recorded — otherwise email stays blank for Emily.

const MODEL = 'claude-sonnet-4-6'

const CRAWL_SYSTEM = `You are a press-contact researcher for Petite Lavande (organic newborn & postpartum gift boxes, petitelavande.com). Given ONE media outlet, find the most relevant CURRENT journalist/editor for pitching a baby & new-mother gift brand — the person who writes or edits baby gift guides, baby-shower roundups, nursery/registry commerce content, or new-parent product coverage.

Rules:
- Use web search. Find a REAL person with a CURRENT byline at this outlet (article within the last ~18 months). Never invent a person.
- EMAIL: record one ONLY if it is published somewhere verifiable (outlet author page, masthead, their own site, a public press page). If you cannot find a published address, return null — do NOT guess patterns like first.last@.
- Do NOT open or scrape linkedin.com pages. If a search-result snippet surfaces a LinkedIn URL you may record it in source notes, nothing more.
- RECENT ARTICLE: pick their most relevant recent piece (baby gifts / registry / new-mom content preferred) with its real URL.
- WHY-RELEVANT: one specific sentence connecting THAT article to a French-countryside-inspired organic baby & postpartum gift box brand ($65–165, gifts for the mother too).
- Spanish-market outlets: the article and why-note may be in Spanish; contact info rules are the same.

Respond with ONLY JSON:
{"contact_name": string|null, "role": string|null, "email": string|null,
 "email_source_url": string|null, "recent_article_title": string|null,
 "recent_article_url": string|null, "why_relevant_note": string|null,
 "notes": string}
notes = one line: how you found them + any caveat (e.g. "byline on 3 gift guides; email from author page" or "no published email — try the outlet's pitch form").`

export interface CrawlResult {
  id: string
  outlet: string
  found: { name?: boolean; email?: boolean; article?: boolean }
  note: string
}

/** Crawl ONE contact row (called sequentially from the portal so each request
 *  stays inside the function time budget). */
export async function crawlPressContact(id: string): Promise<CrawlResult> {
  const { data } = await supabaseAdmin.from('press_contacts').select('*').eq('id', id).maybeSingle()
  const c = data as PressContact | null
  if (!c) throw new Error('contact not found')

  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4000,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 8 }],
    system: CRAWL_SYSTEM,
    messages: [{
      role: 'user',
      content: `OUTLET: ${c.outlet} (tier: ${c.outlet_tier}, language: ${c.language})
${c.contact_name ? `Already known contact name (verify/keep): ${c.contact_name}` : ''}
Find the best press contact for this outlet.`,
    }],
  })
  const text = res.content.filter(b => b.type === 'text').map(b => (b as { text: string }).text).join('')
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) throw new Error('crawler returned no JSON')
  const found = JSON.parse(m[0]) as {
    contact_name?: string | null; role?: string | null; email?: string | null
    email_source_url?: string | null; recent_article_title?: string | null
    recent_article_url?: string | null; why_relevant_note?: string | null; notes?: string
  }

  // Fill ONLY empty fields — Emily's manual entries always win.
  const patch: Record<string, unknown> = {}
  if (!c.contact_name?.trim() && found.contact_name) patch.contact_name = found.contact_name
  if (!c.role?.trim() && found.role) patch.role = found.role
  if (!c.email?.trim() && found.email) patch.email = found.email
  if (!c.recent_article_title?.trim() && found.recent_article_title) patch.recent_article_title = found.recent_article_title
  if (!c.recent_article_url?.trim() && found.recent_article_url) patch.recent_article_url = found.recent_article_url
  if (!c.why_relevant_note?.trim() && found.why_relevant_note) patch.why_relevant_note = found.why_relevant_note

  const provenance = `auto-crawled ${new Date().toISOString().slice(0, 10)} — VERIFY before drafting. ${found.notes ?? ''}${found.email_source_url ? ` email source: ${found.email_source_url}` : ''}`.trim()
  patch.notes = c.notes ? `${c.notes}\n${provenance}` : provenance
  patch.updated_at = new Date().toISOString()

  const { error } = await supabaseAdmin.from('press_contacts').update(patch).eq('id', id)
  if (error) throw error

  return {
    id, outlet: c.outlet,
    found: {
      name: Boolean(patch.contact_name || c.contact_name),
      email: Boolean(patch.email || c.email),
      article: Boolean(patch.recent_article_url || c.recent_article_url),
    },
    note: found.notes ?? '',
  }
}
