import { anthropic } from '../anthropic.ts'
import { supabaseAdmin } from '../supabase.ts'
import { emailDomain } from '../outreach.ts'
import { verifyEmail } from '../emailVerifier.ts'
import { findPublishedEmail, patternCandidates } from '../pipeline/prospector.ts'
import { getBlockedDomains, isBlockedEmail, bumpDailyStats, pipelineEnabled, getDailySendCap } from '../pipeline/config.ts'
import { CITIES, INDUSTRIES, comboForDate, type WeekCombo } from './targeting.ts'
import { qualifyProspects, type QualifyInput, type QualifyResult, type QualifyStats } from './qualify.ts'
import { apiBudgetRemaining, logApiCall } from './api-ledger.ts'

// Targeting-v2 prospector: ONE combo (city × industry set) per WEEK — every
// day's 25 sends come from that combo, combos never mix in a day. Two API
// calls max per run, both ledgered against the 3/day cap:
//   1. candidate search (Sonnet + web_search — finding real companies/people
//      is judgment; everything after is plain code)
//   2. batch qualification (Haiku, lib/outreach/qualify.ts) — SKIPPED entirely
//      when the week's combo has a single industry (industry unambiguous from
//      the scrape source → tagged from source).
// Email discovery/verification is unchanged from v1 (published grade A /
// pattern+verifier grade B) and never touches the Anthropic API.

const SEARCH_MODEL = 'claude-sonnet-4-6'

export interface CandidateV2 {
  company: string
  domain: string
  person_name: string
  title: string
  linkedin_url?: string | null
  company_description: string
  source_url: string | null
}

export interface ProspectorV2Stats {
  combo: WeekCombo
  found: number
  dedupRejected: number
  disqualified: number
  personaMiss: number
  gradeA: number
  gradeB: number
  gradeC: number
  gradeD: number
  parked: number
  deferredQualification: number
  qualify: QualifyStats | null
  searchTokens: { input: number; output: number }
  dry: boolean
  paused?: boolean
  budgetExhausted?: boolean
}

// Web-search transcripts contain stray brackets, so a greedy [.*] regex is not
// reliable. Scan each text block (last first — the answer comes after the
// searches) for a balanced top-level JSON array and return the first that parses.
export const extractJsonArray = (blocks: string[]): unknown => {
  for (let b = blocks.length - 1; b >= 0; b--) {
    const text = blocks[b]
    for (let start = text.indexOf('['); start !== -1; start = text.indexOf('[', start + 1)) {
      let depth = 0, inStr = false, esc = false
      for (let i = start; i < text.length; i++) {
        const ch = text[i]
        if (esc) { esc = false; continue }
        if (inStr) {
          if (ch === '\\') esc = true
          else if (ch === '"') inStr = false
          continue
        }
        if (ch === '"') inStr = true
        else if (ch === '[' || ch === '{') depth++
        else if (ch === ']' || ch === '}') {
          depth--
          if (depth === 0) {
            try {
              const parsed = JSON.parse(text.slice(start, i + 1))
              if (Array.isArray(parsed) && parsed.length) return parsed
            } catch { /* not valid JSON — keep scanning */ }
            break
          }
        }
      }
    }
  }
  return null
}

async function searchCandidatesV2(combo: WeekCombo, want: number, dry: boolean): Promise<{ candidates: CandidateV2[]; usage: { input: number; output: number } }> {
  const city = CITIES[combo.city]
  const industries = combo.industries.map(k => INDUSTRIES[k])
  const industryLines = industries.map(i => `- ${i.label} (reach the ${i.persona})`).join('\n')

  const res = await anthropic.messages.create({
    model: SEARCH_MODEL,
    max_tokens: 8000,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 12 }],
    system: `You are a B2B prospect researcher for Petite Lavande, a maker of organic newborn & postpartum gift boxes sold to companies as client/employee gifts.

Rules:
- Use web search to find REAL, currently-operating companies and REAL people who work there now. Never invent a company or a person.
- Do NOT open or scrape linkedin.com pages. If a search RESULT snippet surfaces a LinkedIn URL you may record it, nothing more.
- company_description: one factual sentence about what the company does, from their own site or a directory listing. Never speculate.
- source_url: the page where you found the company (directory listing, award list, their site).
- HEADCOUNT BAND (hard filter): only companies with roughly 100–1000 employees. Skip anything clearly under ~100 people and anything enterprise-scale (1000+). Use the company's own site, directory listings, or "about/careers" pages for size signals.
- The person must plausibly own or influence a gifting budget: Head/Director/VP/Manager of People, HR, Talent, Culture, Operations, Office, Marketing, or a Partner/Principal/Owner. Never an intern or junior individual contributor.
- Output ONLY a JSON array, no prose.`,
    messages: [{
      role: 'user',
      content: `Find up to ${want} prospect candidates in the ${city.label}, ${city.state} metro area, split across these target segments:
${industryLines}

Return a JSON array of objects with exactly these keys:
{"company": string, "domain": string (bare domain like "acme.com"), "person_name": string, "title": string, "linkedin_url": string|null, "company_description": string, "source_url": string|null}`,
    }],
  })

  const usage = { input: res.usage.input_tokens, output: res.usage.output_tokens }
  if (!dry) {
    await logApiCall({
      purpose: 'prospect_search', model: SEARCH_MODEL, batch_size: want,
      input_tokens: usage.input, output_tokens: usage.output, ok: true,
    })
  }

  const blocks = res.content.filter(b => b.type === 'text').map(b => (b as { text: string }).text)
  const parsed = extractJsonArray(blocks)
  if (!Array.isArray(parsed) && dry) {
    // Dry runs save the raw transcript so parser issues can be debugged
    // without paying for another search call.
    const { writeFile, mkdir } = await import('node:fs/promises')
    const path = await import('node:path')
    const dir = path.join(process.cwd(), 'outreach-preview')
    await mkdir(dir, { recursive: true }).catch(() => {})
    await writeFile(path.join(dir, '_debug-search-transcript.txt'), blocks.join('\n\n───── block ─────\n\n'), 'utf8').catch(() => {})
  }
  const candidates = !Array.isArray(parsed) ? [] : parsed
    .filter((c): c is Record<string, unknown> => Boolean(c && typeof c === 'object'))
    .map(c => ({
      company: String(c.company ?? '').trim(),
      domain: String(c.domain ?? '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0],
      person_name: String(c.person_name ?? '').trim(),
      title: String(c.title ?? '').trim(),
      linkedin_url: c.linkedin_url ? String(c.linkedin_url).trim() : null,
      company_description: String(c.company_description ?? '').trim(),
      source_url: c.source_url ? String(c.source_url).trim() : null,
    }))
    .filter(c => c.company && c.domain && c.domain.includes('.') && c.person_name)
  return { candidates, usage }
}

export interface QualifiedCandidate extends CandidateV2 {
  industry_key: string
  persona_match: boolean
  qualification_reason: string
  qualification_via: QualifyResult['via']
}

/**
 * Scrape + qualify one day's batch for the current weekly combo. Pure result —
 * DB writes (prospect rows, email grading) happen in the second half so the
 * dry-run can reuse exactly this path with dry=true.
 */
export async function scrapeAndQualify(opts: { dry?: boolean; date?: Date; want?: number } = {}): Promise<{
  combo: WeekCombo
  candidates: CandidateV2[]
  qualified: QualifiedCandidate[]
  qualify: QualifyStats | null
  searchTokens: { input: number; output: number }
  budgetExhausted?: boolean
}> {
  const dry = Boolean(opts.dry)
  const combo = comboForDate(opts.date ?? new Date())

  // The search itself is an API call — it must fit the daily budget too.
  if (!dry && (await apiBudgetRemaining()) < 1) {
    return { combo, candidates: [], qualified: [], qualify: null, searchTokens: { input: 0, output: 0 }, budgetExhausted: true }
  }

  const { candidates, usage } = await searchCandidatesV2(combo, opts.want ?? 30, dry)

  // Single-industry week → industry is unambiguous from the scrape source; the
  // qualification call is skipped entirely (tagged from source, cached).
  const sourceIndustry = combo.industries.length === 1 ? combo.industries[0] : null

  const inputs: QualifyInput[] = candidates.map((c, i) => ({
    id: String(i), name: c.person_name, title: c.title, company: c.company,
    domain: c.domain, company_description: c.company_description, source_url: c.source_url,
  }))
  const { results, stats } = await qualifyProspects(inputs, { sourceIndustry, dry })
  const byId = new Map(results.map(r => [r.id, r]))

  const qualified: QualifiedCandidate[] = []
  for (let i = 0; i < candidates.length; i++) {
    const r = byId.get(String(i))
    if (!r) continue   // deferred — re-scraped/qualified another day; never blocks the rest
    if (!r.qualified || r.industry_key === 'none') continue
    if (!combo.industries.includes(r.industry_key as WeekCombo['industries'][number])) continue // outside this week's combo
    qualified.push({
      ...candidates[i],
      industry_key: r.industry_key,
      persona_match: r.persona_match,
      qualification_reason: r.reason,
      qualification_via: r.via,
    })
  }
  return { combo, candidates, qualified, qualify: stats, searchTokens: usage }
}

// ── Full nightly run: scrape → qualify → discover/verify emails → insert ─────
export async function runProspectorV2(opts: { dry?: boolean; timeBudgetMs?: number } = {}): Promise<ProspectorV2Stats> {
  const deadline = Date.now() + (opts.timeBudgetMs ?? 200_000)
  const dry = Boolean(opts.dry)
  const emptyCombo = comboForDate(new Date())
  const stats: ProspectorV2Stats = {
    combo: emptyCombo, found: 0, dedupRejected: 0, disqualified: 0, personaMiss: 0,
    gradeA: 0, gradeB: 0, gradeC: 0, gradeD: 0, parked: 0, deferredQualification: 0,
    qualify: null, searchTokens: { input: 0, output: 0 }, dry,
  }

  if (!(await pipelineEnabled())) { stats.paused = true; return stats }

  const cap = await getDailySendCap()
  const target = Math.ceil(cap * 1.2)

  // Existing undrafted A/B inventory for THIS combo counts toward the target.
  const combo = comboForDate(new Date())
  stats.combo = combo
  const { count: readyCount } = await supabaseAdmin.from('prospects')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'discovered').in('email_grade', ['A', 'B'])
    .eq('metro', combo.city).in('category', [...combo.industries])
  let ready = readyCount ?? 0
  if (ready >= target) return stats   // inventory full — no API spend today

  const scraped = await scrapeAndQualify({ dry })
  stats.found = scraped.candidates.length
  stats.qualify = scraped.qualify
  stats.searchTokens = scraped.searchTokens
  stats.budgetExhausted = scraped.budgetExhausted
  stats.deferredQualification = scraped.qualify?.deferred ?? 0
  stats.disqualified = scraped.candidates.length - scraped.qualified.length - stats.deferredQualification
  if (scraped.budgetExhausted) return stats

  const blocked = await getBlockedDomains()

  // Known domains/emails for dedup — same sources as v1 (prospects + contacts +
  // suppression + customers). The permanent unique index on prospects.domain is
  // strictly stronger than the 90-day rule: a domain contacted once is never
  // contacted again, in any combo.
  const [pRows, cRows, sRows, oRows] = await Promise.all([
    supabaseAdmin.from('prospects').select('domain, email, person_name, company'),
    supabaseAdmin.from('contacts').select('email'),
    supabaseAdmin.from('suppression').select('email, domain'),
    supabaseAdmin.from('orders').select('customer_email').not('customer_email', 'is', null).limit(5000),
  ])
  const knownDomains = new Set<string>()
  const knownEmails = new Set<string>()
  for (const r of (pRows.data ?? []) as { domain: string | null; email: string | null }[]) {
    if (r.domain) knownDomains.add(r.domain.toLowerCase())
    if (r.email) knownEmails.add(r.email.toLowerCase())
  }
  for (const r of (cRows.data ?? []) as { email: string }[]) { knownEmails.add(r.email.toLowerCase()); knownDomains.add(emailDomain(r.email)) }
  for (const r of (sRows.data ?? []) as { email: string; domain: string | null }[]) {
    knownEmails.add(r.email.toLowerCase())
    if (r.domain) knownDomains.add(r.domain.toLowerCase())
  }
  for (const r of (oRows.data ?? []) as { customer_email: string }[]) knownEmails.add(r.customer_email.toLowerCase())

  for (const cand of scraped.qualified) {
    if (ready >= target || Date.now() > deadline - 20_000) break
    if (!cand.persona_match) { stats.personaMiss++; continue }   // wrong person — skip, domain stays cached

    const dom = cand.domain
    if (knownDomains.has(dom) || blocked.has(dom)) { stats.dedupRejected++; continue }

    // Email discovery — identical grading to v1, zero model involvement.
    const published = await findPublishedEmail(dom, cand.person_name)
    let email: string | null = published
    let grade: 'A' | 'B' | 'C' | 'D' | null = published ? 'A' : null
    let score: number | null = null
    let provider: string | null = null
    let status = 'discovered'

    if (email && (knownEmails.has(email) || isBlockedEmail(email, blocked))) { stats.dedupRejected++; continue }

    if (!email) {
      let exhausted = false
      for (const guess of patternCandidates(cand.person_name, dom).slice(0, 2)) {
        if (knownEmails.has(guess) || isBlockedEmail(guess, blocked)) continue
        const v = await verifyEmail(guess)
        if (v === null) { exhausted = true; email = guess; break }
        score = v.score; provider = v.provider
        if (v.verdict === 'deliverable') { email = guess; grade = 'B'; break }
        if (v.verdict === 'risky') { email = guess; grade = 'C'; break }
      }
      if (exhausted) { grade = null; status = 'awaiting_verification' }
      else if (!email) { grade = 'D'; status = 'discarded' }
      else if (grade === 'C') status = 'needs_manual_check'
    }

    if (grade === 'A') stats.gradeA++
    else if (grade === 'B') stats.gradeB++
    else if (grade === 'C') stats.gradeC++
    else if (grade === 'D') stats.gradeD++
    if (status === 'awaiting_verification') stats.parked++

    if (!dry) {
      const { error } = await supabaseAdmin.from('prospects').insert({
        company: cand.company, domain: dom, person_name: cand.person_name, title: cand.title,
        metro: combo.city, category: cand.industry_key, linkedin_url: cand.linkedin_url,
        email, email_grade: grade, verifier_score: score, verifier_provider: provider,
        fit_reason: cand.company_description, source_url: cand.source_url,
        industry_key: cand.industry_key, persona_match: cand.persona_match,
        qualification_reason: cand.qualification_reason, qualification_via: cand.qualification_via,
        status: grade === 'D' ? 'discarded' : status,
      })
      if (error) { stats.dedupRejected++; continue }
    }
    knownDomains.add(dom)
    if (email) knownEmails.add(email)
    if (grade === 'A' || grade === 'B') ready++
  }

  if (!dry) {
    await bumpDailyStats({
      found: stats.found, dedup_rejected: stats.dedupRejected,
      grade_a: stats.gradeA, grade_b: stats.gradeB, grade_c: stats.gradeC, grade_d: stats.gradeD,
      parked_awaiting_verification: stats.parked, disqualified: stats.disqualified,
    })
  }
  return stats
}
