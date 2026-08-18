import { anthropic } from '../anthropic.ts'
import { supabaseAdmin } from '../supabase.ts'
import { emailDomain, getSuppressedSet } from '../outreach.ts'
import { verifyEmail } from '../emailVerifier.ts'
import { getConfig, setConfig, bumpDailyStats, pipelineEnabled } from './config.ts'
import { patternCandidates } from './prospector.ts'

// Press-channel prospector — the byline method. For each outlet in tonight's
// rotation slice, a web-search agent finds the byline author of the outlet's
// most recent gift guide (+ guide URL/title, freelancer signal), then contact
// discovery: (a) an address the writer publishes on their own site / X bio →
// grade A (freemail allowed here — writers publish gmail addresses); (b) the
// outlet's email pattern, which MUST pass the verifier cascade → grade B.
// Editors closed_this_cycle become eligible again after closed_until (90 days):
// their existing row is re-opened with the NEW guide, never duplicated.
// LinkedIn is never opened or scraped.

const MODEL = 'claude-sonnet-4-6'

export interface PressOutlet { name: string; domain: string }
export interface PressConfig {
  cursor: number
  outlets_per_night: number
  rotation_order: number[]
  daily_cap: number
  founder_story_enabled: boolean
  brand_one_liner?: string
  tiers: Record<string, PressOutlet[]>
}

export async function getPressConfig(): Promise<PressConfig | null> {
  return getConfig<PressConfig>('press')
}

/** Outlets in rotation order (tier 3 → 1 → 2 → 4 by default), flattened. */
export function rotationOutlets(cfg: PressConfig): { outlet: PressOutlet; tier: number }[] {
  const order = cfg.rotation_order?.length ? cfg.rotation_order : [3, 1, 2, 4]
  return order.flatMap(t => (cfg.tiers?.[String(t)] ?? []).map(outlet => ({ outlet, tier: t })))
}

/** Tonight's slice: outlets_per_night entries starting at cursor, wrapping. */
export function pressSlice(cfg: PressConfig): { outlet: PressOutlet; tier: number }[] {
  const all = rotationOutlets(cfg)
  if (!all.length) return []
  const n = Math.max(1, cfg.outlets_per_night || 3)
  return Array.from({ length: Math.min(n, all.length) }, (_, i) => all[(cfg.cursor + i) % all.length])
}

interface BylineResult {
  found: boolean
  writer_name: string
  writer_title: string | null
  guide_url: string | null
  guide_title: string | null
  published_email: string | null
  personal_site: string | null
  linkedin_url: string | null
  freelancer: boolean
}

const extractJson = (text: string): Record<string, unknown> | null => {
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) return null
  try { return JSON.parse(m[0]) as Record<string, unknown> } catch { return null }
}

async function bylineSearch(outlet: PressOutlet): Promise<BylineResult | null> {
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 8 }],
    system: `You research gift-guide bylines for a baby-gift brand's press outreach.

Method: web-search "${outlet.name} best gifts for new moms", "${outlet.name} holiday gift guide", "${outlet.name} baby shower gifts". Find the MOST RECENT gift guide published on ${outlet.domain} and extract its byline author.

Then look for the writer's contact: their personal website or X bio (search "<writer name> ${outlet.name} contact OR email"). Record an email ONLY if it is actually published by the writer themselves. Note whether their bio shows bylines at multiple outlets (freelancer).

Rules: never open or scrape linkedin.com (recording a URL from search-result snippets is fine). Never invent a person, URL, title, or email — use null when not found. Output ONLY a JSON object:
{"found": boolean, "writer_name": string, "writer_title": string|null, "guide_url": string|null, "guide_title": string|null, "published_email": string|null, "personal_site": string|null, "linkedin_url": string|null, "freelancer": boolean}`,
    messages: [{ role: 'user', content: `Outlet: ${outlet.name} (${outlet.domain}). Run the byline method.` }],
  })
  const text = res.content.filter(b => b.type === 'text').map(b => (b as { text: string }).text).join('\n')
  const raw = extractJson(text)
  if (!raw || !raw.found || !raw.writer_name) return null
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
  return {
    found: true,
    writer_name: String(raw.writer_name).trim(),
    writer_title: str(raw.writer_title),
    guide_url: str(raw.guide_url),
    guide_title: str(raw.guide_title),
    published_email: str(raw.published_email)?.toLowerCase() ?? null,
    personal_site: str(raw.personal_site),
    linkedin_url: str(raw.linkedin_url),
    freelancer: Boolean(raw.freelancer),
  }
}

export interface PressProspectorStats {
  outletsWorked: number
  found: number
  dedupRejected: number
  reopened: number
  gradeA: number
  gradeB: number
  gradeC: number
  gradeD: number
  parked: number
  dry: boolean
}

export async function runPressProspector(opts: { dry?: boolean; timeBudgetMs?: number; startedAt?: number } = {}): Promise<PressProspectorStats | null> {
  const started = opts.startedAt ?? Date.now()
  const deadline = started + (opts.timeBudgetMs ?? 120_000)
  const dry = Boolean(opts.dry)
  const stats: PressProspectorStats = {
    outletsWorked: 0, found: 0, dedupRejected: 0, reopened: 0,
    gradeA: 0, gradeB: 0, gradeC: 0, gradeD: 0, parked: 0, dry,
  }

  if (!(await pipelineEnabled())) return stats   // paused from Morning Review

  const cfg = await getPressConfig()
  if (!cfg) return null   // press config not migrated/seeded yet — press mode inactive
  // Manual press mode (§52): Emily hand-pitches via Portal → Press; the robot
  // stands down so the same outlet is never double-pitched. Reversible flag.
  if ((cfg as { manual_mode?: boolean }).manual_mode) return stats

  const slice = pressSlice(cfg)
  if (!slice.length) return stats

  const [suppressed, { data: existingRows }] = await Promise.all([
    getSuppressedSet(),
    supabaseAdmin.from('prospects')
      .select('id, email, person_name, outlet, status, closed_until').eq('channel', 'press'),
  ])
  type ExistingPress = { id: string; email: string | null; person_name: string | null; outlet: string | null; status: string; closed_until: string | null }
  const existing = (existingRows ?? []) as ExistingPress[]
  const byEmail = new Map(existing.filter(e => e.email).map(e => [e.email!.toLowerCase(), e]))
  const byPersonOutlet = new Map(existing.filter(e => e.person_name && e.outlet)
    .map(e => [`${e.person_name!.toLowerCase()}|${e.outlet!.toLowerCase()}`, e]))
  const today = new Date().toISOString().slice(0, 10)
  const reopenable = (e: ExistingPress) => e.status === 'closed_this_cycle' && e.closed_until != null && e.closed_until <= today

  let worked = 0
  for (const { outlet, tier } of slice) {
    if (Date.now() > deadline - 30_000) break
    worked++
    stats.outletsWorked++

    const byline = await bylineSearch(outlet).catch(e => { console.error('byline search failed', outlet.name, e); return null })
    if (!byline) continue
    stats.found++

    // Re-pitch path: a known editor whose 90-day window has passed gets their
    // row re-opened with the NEW guide — otherwise known editors are skipped.
    const prior = byPersonOutlet.get(`${byline.writer_name.toLowerCase()}|${outlet.name.toLowerCase()}`)
      ?? (byline.published_email ? byEmail.get(byline.published_email) : undefined)
    if (prior) {
      if (reopenable(prior)) {
        if (!dry) {
          await supabaseAdmin.from('prospects').update({
            status: 'discovered', guide_url: byline.guide_url, guide_title: byline.guide_title,
            freelancer: byline.freelancer, closed_until: null, updated_at: new Date().toISOString(),
          }).eq('id', prior.id)
        }
        stats.reopened++
      } else {
        stats.dedupRejected++
      }
      continue
    }

    // Contact discovery. Grade A: published by the writer (agent-found; also
    // try their personal site directly). Freemail is acceptable for press.
    let email = byline.published_email
    let grade: 'A' | 'B' | 'C' | null = email ? 'A' : null
    let score: number | null = null
    let provider: string | null = null
    let status = 'discovered'

    if (!email && byline.personal_site) {
      email = await findSiteEmail(byline.personal_site)
      if (email) grade = 'A'
    }
    if (email && (suppressed.has(email) || byEmail.has(email))) { stats.dedupRejected++; continue }

    if (!email) {
      // Outlet pattern → MUST verify before it can ever queue.
      let exhausted = false
      for (const guess of patternCandidates(byline.writer_name, outlet.domain).slice(0, 2)) {
        if (suppressed.has(guess) || byEmail.has(guess)) continue
        const v = await verifyEmail(guess)
        if (v === null) { exhausted = true; email = guess; break }
        score = v.score; provider = v.provider
        if (v.verdict === 'deliverable') { email = guess; grade = 'B'; break }
        if (v.verdict === 'risky') { email = guess; grade = 'C'; break }
      }
      if (exhausted) { grade = null; status = 'awaiting_verification'; stats.parked++ }
      else if (!email) { grade = null; status = 'discarded'; stats.gradeD++ }
      else if (grade === 'C') { status = 'needs_manual_check'; stats.gradeC++ }
    }
    if (grade === 'A') stats.gradeA++
    else if (grade === 'B') stats.gradeB++

    if (!dry) {
      const { error } = await supabaseAdmin.from('prospects').insert({
        channel: 'press', company: outlet.name, domain: null,   // domain unique index is corporate-only anyway
        outlet: outlet.name, tier,
        person_name: byline.writer_name, title: byline.writer_title,
        linkedin_url: byline.linkedin_url, email,
        email_grade: grade === null ? (status === 'discarded' ? 'D' : null) : grade,
        verifier_score: score, verifier_provider: provider,
        guide_url: byline.guide_url, guide_title: byline.guide_title,
        freelancer: byline.freelancer,
        fit_reason: byline.guide_title ? `Wrote "${byline.guide_title}" for ${outlet.name}` : null,
        status,
      })
      if (error) { console.error('press insert failed', error.message); stats.dedupRejected++ }
      else if (email) byEmail.set(email, { id: '', email, person_name: byline.writer_name, outlet: outlet.name, status, closed_until: null })
    }
  }

  if (!dry) {
    await setConfig('press', { ...cfg, cursor: (cfg.cursor + worked) % Math.max(1, rotationOutlets(cfg).length) })
    await bumpDailyStats({
      press_found: stats.found, press_dedup: stats.dedupRejected, press_reopened: stats.reopened,
      press_grade_a: stats.gradeA, press_grade_b: stats.gradeB,
    })
  }
  return stats
}

// A writer's personal site: accept the first plausible mailto/text address —
// including freemail (grade A means "published by the writer", not corporate).
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi
async function findSiteEmail(site: string): Promise<string | null> {
  const base = site.startsWith('http') ? site : `https://${site}`
  for (const path of ['', '/contact', '/about']) {
    try {
      const res = await fetch(`${base}${path}`, {
        signal: AbortSignal.timeout(8000), redirect: 'follow',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PetiteLavande/1.0)' },
      })
      if (!res.ok) continue
      const html = (await res.text()).slice(0, 300_000)
      for (const m of html.matchAll(EMAIL_RE)) {
        const e = m[0].toLowerCase()
        if (!/\.(png|jpg|jpeg|gif|webp|svg)$/.test(e) && !/(sentry|example|wixpress|godaddy)\./.test(emailDomain(e))) return e
      }
    } catch { /* try the next page */ }
  }
  return null
}
