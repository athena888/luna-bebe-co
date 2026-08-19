// Free contact crawler — the zero-API-cost discovery path (Emily 2026-08-19:
// "everyday 30 qualified emails sit in my morning review").
//
// WHY THIS EXISTS: the AI discovery path costs ~$0.10+ per company in Sonnet
// web-search calls, while ~20-40% of ICP companies simply PUBLISH their team's
// emails and their benefits language on their own site. Reading those pages is
// mechanical: fetch /team and /careers, extract published addresses + titles,
// extract benefits sentences, verify the one best address against the existing
// verifier cascade, then score with the SAME deterministic v3 scorer
// (qualifyRecord) every other path uses. No model call anywhere.
//
// Pipeline position: consumes the NEEDS_CONTACT_RESEARCH backlog (good company,
// no usable contact) that qualification keeps producing, plus directory-crawled
// seed companies inserted via the portal crawl endpoint. On success the row
// becomes status='discovered' with qualification per the scorer, which is
// exactly what runDrafterV3 selects from — so a crawler hit this morning is a
// Morning Review draft the same day.
//
// HARD RULES:
//  - Only addresses PUBLISHED on the company's own site (incl. decoding
//    Cloudflare's email obfuscation). No pattern guessing — inferred addresses
//    are what bounced the first batch.
//  - Every address verified through lib/emailVerifier before it is written.
//  - Generic inboxes (info@, hello@) are never candidates (isGenericEmail).
//  - This module never drafts and never sends; it only upgrades prospects.

import { supabaseAdmin } from '../supabase.ts'
import { getConfig, setConfig, pipelineEnabled } from '../pipeline/config.ts'
import { verifyEmail } from '../emailVerifier.ts'
import { qualifyRecord } from './qualify-v3.ts'
import {
  roleFamilyForTitle, gradeRole, isGenericEmail, looksLikeMachineAddress,
  bandForRange, type SizeBand, type Segment,
} from './icp.ts'

// ── Tunables ─────────────────────────────────────────────────────────────────
const FETCH_TIMEOUT_MS = 8_000
const MAX_PAGES_PER_DOMAIN = 7
const MAX_VERIFIES_PER_DOMAIN = 2
const DEFAULT_VERIFY_BUDGET = 8          // verifier calls per run (quota guard)
const RETRY_AFTER_DAYS = 30              // a fully-failed domain rests this long
const MIN_HOURS_BETWEEN_ATTEMPTS = 48

// Team INDEX pages usually link to per-person bio pages that carry the email
// (law firms almost always). When an index yields no addresses, follow a few
// same-site bio links and extract there instead.
const BIO_LINK_RE = /href="([^"#?]*\/(?:people|team|attorneys?|our-team|profiles?|staff|bio)\/[a-z0-9-]{3,60}\/?)"/gi
const MAX_BIO_PAGES = 5

const TEAM_PATHS = ['/team', '/people', '/our-team', '/about/team', '/our-people', '/staff', '/about-us', '/about', '/leadership']
const CAREERS_PATHS = ['/careers', '/careers/', '/join', '/join-us', '/jobs', '/culture', '/benefits', '/about/careers']

// Ordered title patterns — first match wins as the candidate's title. Ordering
// mirrors the ICP: buyers first (office/people ops), then influencers.
const TITLE_PATTERNS: RegExp[] = [
  /\b(?:senior\s+)?office\s+(?:manager|coordinator|administrator)\b/i,
  /\b(?:people\s*ops|people\s+operations)\s*(?:manager|coordinator|specialist|director|lead)?\b/i,
  /\bworkplace\s+experience\s*(?:manager|coordinator|lead)?\b/i,
  /\bemployee\s+experience\s*(?:manager|coordinator|lead)?\b/i,
  /\bexecutive\s+assistant\b/i,
  /\bpeople\s*(?:&|and)\s*culture\s*(?:manager|director|lead)?\b/i,
  /\b(?:hr|human\s+resources)\s+(?:manager|director|coordinator|generalist)\b/i,
  /\bdirector\s+of\s+(?:administration|operations|people)\b/i,
  /\bfirm\s+administrator\b/i,
  /\bchief\s+of\s+staff\b/i,
  /\b(?:practice|operations)\s+manager\b/i,
  /\bclient\s+(?:experience|relations)\s*(?:manager|director|coordinator)?\b/i,
  /\bchief\s+(?:people|operating)\s+officer\b/i,
  /\bexecutive\s+director\b/i,
  /\bhead\s+of\s+people\b/i,
]

// Words that immediately disqualify a "First Last" guess as a person name.
const NAME_STOPWORDS = new Set(['team', 'group', 'office', 'manager', 'contact', 'about', 'staff', 'firm', 'legal', 'email', 'phone', 'suite', 'street', 'avenue', 'seattle', 'main'])

export interface CrawlStats {
  attempted: number
  pagesFetched: number
  contactsFound: number
  verified: number
  qualified: number
  upgraded: { company: string; person: string; title: string; email: string; tier: string; status: string }[]
  skipped: { domain: string; why: string }[]
  verifyBudgetLeft: number
  dry: boolean
  disabled?: boolean
  paused?: boolean
}

interface CrawlTarget {
  id: string; company: string; domain: string; category: string | null
  metro: string | null; industry_key: string | null
  employee_count: number | null; company_size_band: string | null
  fit_reason: string | null
}

interface Candidate { email: string; name: string | null; title: string | null; sourceUrl: string }

// ── Attempt ledger (outreach_config.crawl_state) ────────────────────────────
// { [domain]: { a: attempts, t: lastAttemptIso } } — config JSON, no migration.
type CrawlState = Record<string, { a: number; t: string }>

function eligible(state: CrawlState, domain: string): boolean {
  const s = state[domain.toLowerCase()]
  if (!s) return true
  const ageH = (Date.now() - new Date(s.t).getTime()) / 3_600_000
  if (s.a >= 2) return ageH > RETRY_AFTER_DAYS * 24
  return ageH > MIN_HOURS_BETWEEN_ATTEMPTS
}

// ── Page fetching ────────────────────────────────────────────────────────────
async function fetchPage(url: string): Promise<string | null> {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: ctl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PetiteLavandeResearch/1.0; +https://petitelavande.com)',
        'Accept': 'text/html',
      },
    })
    if (!res.ok) return null
    const type = res.headers.get('content-type') ?? ''
    if (!type.includes('html')) return null
    return (await res.text()).slice(0, 400_000)
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

const stripTags = (html: string) => html
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#39;|&rsquo;/g, "'")
  .replace(/\s+/g, ' ')

/** Cloudflare email obfuscation (data-cfemail / email-protection#hex). */
function decodeCf(hex: string): string | null {
  if (!/^[0-9a-f]{8,}$/i.test(hex)) return null
  const key = parseInt(hex.slice(0, 2), 16)
  let out = ''
  for (let i = 2; i < hex.length; i += 2) out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key)
  return /@/.test(out) ? out.toLowerCase() : null
}

function extractEmails(html: string, domain: string): Map<string, number> {
  const found = new Map<string, number>()   // email -> first index (for context)
  const d = domain.toLowerCase()
  const re = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi
  for (const m of html.matchAll(re)) {
    const e = m[0].toLowerCase()
    if (e.endsWith('@' + d) && !found.has(e)) found.set(e, m.index ?? 0)
  }
  for (const m of html.matchAll(/(?:data-cfemail="([0-9a-f]+)"|email-protection#([0-9a-f]+))/gi)) {
    const e = decodeCf(m[1] ?? m[2] ?? '')
    if (e && e.endsWith('@' + d) && !found.has(e)) found.set(e, m.index ?? 0)
  }
  return found
}

function nameFromContext(text: string, localPart: string): string | null {
  // Closest "First Last" that doesn't look like navigation copy.
  for (const m of text.matchAll(/\b([A-Z][a-z]{2,15})\s+([A-Z][a-zA-Z'-]{2,20})\b/g)) {
    const a = m[1], b = m[2]
    if (NAME_STOPWORDS.has(a.toLowerCase()) || NAME_STOPWORDS.has(b.toLowerCase())) continue
    // Prefer a name that shares a token with the local part (cindy@ -> Cindy X).
    const lp = localPart.toLowerCase()
    if (lp.includes(a.toLowerCase()) || lp.includes(b.toLowerCase())) return a + ' ' + b
  }
  // Fall back to the local part itself when it reads like a human name.
  const parts = localPart.split(/[._-]/).filter(p => /^[a-z]{2,15}$/i.test(p))
  if (parts.length >= 1 && parts.length <= 2 && !isGenericEmail(localPart + '@x.com')) {
    return parts.map(p => p[0].toUpperCase() + p.slice(1)).join(' ')
  }
  return null
}

function titleFromContext(text: string): string | null {
  for (const re of TITLE_PATTERNS) {
    const m = text.match(re)
    if (m) return m[0].replace(/\s+/g, ' ').trim()
  }
  return null
}

// ── Per-domain crawl ─────────────────────────────────────────────────────────
async function crawlDomain(t: CrawlTarget, stats: CrawlStats): Promise<{
  candidates: Candidate[]; benefitsText: string; benefitsUrl: string | null
}> {
  const hosts = ['https://' + t.domain, 'https://www.' + t.domain]
  let host: string | null = null
  const candidates: Candidate[] = []
  let benefitsText = ''
  let benefitsUrl: string | null = null
  let pages = 0

  for (const h of hosts) {
    const html = await fetchPage(h)
    if (html) {
      host = h; pages++; stats.pagesFetched++
      // Home page occasionally carries gifting/benefits language too.
      benefitsText += ' ' + stripTags(html).slice(0, 2500)
      break
    }
  }
  if (!host) return { candidates, benefitsText: '', benefitsUrl: null }

  for (const path of TEAM_PATHS) {
    if (pages >= MAX_PAGES_PER_DOMAIN) break
    const html = await fetchPage(host + path)
    if (!html) continue
    pages++; stats.pagesFetched++
    const emails = extractEmails(html, t.domain)
    for (const [email, idx] of emails) {
      if (isGenericEmail(email) || looksLikeMachineAddress(email)) continue
      if (candidates.some(c => c.email === email)) continue
      const ctx = stripTags(html.slice(Math.max(0, idx - 600), idx + 600))
      candidates.push({
        email,
        name: nameFromContext(ctx, email.split('@')[0]),
        title: titleFromContext(ctx),
        sourceUrl: host + path,
      })
    }
    if (candidates.some(c => c.title)) break   // a titled contact is enough

    // Index page with no published addresses -> follow its bio links. This is
    // how law/consulting sites publish contacts: index lists names, the email
    // (often Cloudflare-obfuscated) lives on the person's own page.
    if (candidates.length === 0) {
      const links = new Set<string>()
      for (const m of html.matchAll(BIO_LINK_RE)) {
        const href = m[1]
        const abs: string = href.startsWith('http') ? href : host + (href.startsWith('/') ? href : '/' + href)
        if (abs.startsWith(host)) links.add(abs)
        if (links.size >= MAX_BIO_PAGES * 3) break
      }
      let followed = 0
      for (const url of links) {
        if (followed >= MAX_BIO_PAGES || pages >= MAX_PAGES_PER_DOMAIN + 4) break
        const bio = await fetchPage(url)
        if (!bio) continue
        followed++; pages++; stats.pagesFetched++
        const bioEmails = extractEmails(bio, t.domain)
        for (const [email, idx] of bioEmails) {
          if (isGenericEmail(email) || looksLikeMachineAddress(email)) continue
          if (candidates.some(c => c.email === email)) continue
          const ctx = stripTags(bio.slice(Math.max(0, idx - 800), idx + 800))
          candidates.push({
            email,
            name: nameFromContext(ctx, email.split('@')[0]),
            title: titleFromContext(ctx) ?? titleFromContext(stripTags(bio).slice(0, 1200)),
            sourceUrl: url,
          })
        }
        if (candidates.some(c => c.title)) break
      }
      if (candidates.length) break   // got contacts via bios; stop trying index paths
    }
  }

  for (const path of CAREERS_PATHS) {
    if (pages >= MAX_PAGES_PER_DOMAIN + 2) break
    const html = await fetchPage(host + path)
    if (!html) continue
    pages++; stats.pagesFetched++
    benefitsText += ' ' + stripTags(html).slice(0, 6000)
    if (!benefitsUrl) benefitsUrl = host + path
    break   // one careers page is plenty of evidence text
  }

  return { candidates, benefitsText: benefitsText.slice(0, 9000), benefitsUrl }
}

// ── Candidate ranking: the ICP's own role grading, buyers first ─────────────
function rankCandidates(cands: Candidate[], segment: Segment, band: SizeBand | null): Candidate[] {
  const grade = (c: Candidate) => {
    if (!c.title) return 2
    const g = gradeRole(segment, roleFamilyForTitle(c.title), band)
    return g === 'EXACT' ? 0 : g === 'INFLUENCER' ? 1 : 3
  }
  return [...cands].sort((a, b) => grade(a) - grade(b) || (a.name ? 0 : 1) - (b.name ? 0 : 1))
}

// ── Main entry ───────────────────────────────────────────────────────────────
export async function runContactCrawler(opts: {
  dry?: boolean; timeBudgetMs?: number; limit?: number; verifyBudget?: number
} = {}): Promise<CrawlStats> {
  const dry = Boolean(opts.dry)
  const deadline = Date.now() + (opts.timeBudgetMs ?? 140_000)
  let verifyBudget = opts.verifyBudget ?? DEFAULT_VERIFY_BUDGET
  const stats: CrawlStats = {
    attempted: 0, pagesFetched: 0, contactsFound: 0, verified: 0, qualified: 0,
    upgraded: [], skipped: [], verifyBudgetLeft: verifyBudget, dry,
  }

  const flags = await getConfig<{ contact_crawler_enabled?: boolean }>('quality_v3')
  if (flags?.contact_crawler_enabled === false) { stats.disabled = true; return stats }
  if (!dry && !(await pipelineEnabled())) { stats.paused = true; return stats }

  const state = (await getConfig<CrawlState>('crawl_state')) ?? {}

  // Backlog: good companies with no usable contact. Seattle first (same-day
  // delivery metro), then oldest first so nothing starves.
  const { data } = await supabaseAdmin.from('prospects')
    .select('id, company, domain, category, metro, industry_key, employee_count, company_size_band, fit_reason')
    .eq('channel', 'corporate')
    .eq('qualification_status', 'NEEDS_CONTACT_RESEARCH')
    .not('domain', 'is', null)
    .order('created_at', { ascending: true })
    .limit(200)
  const targets = ((data ?? []) as CrawlTarget[])
    .filter(t => eligible(state, t.domain))
    .sort((a, b) => (a.metro === 'Seattle' ? 0 : 1) - (b.metro === 'Seattle' ? 0 : 1))
    .slice(0, opts.limit ?? 40)

  for (const t of targets) {
    if (Date.now() > deadline - 15_000) break
    if (verifyBudget <= 0) { stats.skipped.push({ domain: t.domain, why: 'verify budget spent' }); continue }
    stats.attempted++
    const dkey = t.domain.toLowerCase()
    const prev = state[dkey] ?? { a: 0, t: '' }
    if (!dry) {
      state[dkey] = { a: prev.a + 1, t: new Date().toISOString() }
      await setConfig('crawl_state', state)
    }

    const { candidates, benefitsText, benefitsUrl } = await crawlDomain(t, stats)
    stats.contactsFound += candidates.length
    if (!candidates.length) { stats.skipped.push({ domain: t.domain, why: 'no published non-generic address' }); continue }

    const band = (t.company_size_band as SizeBand | null)
      ?? bandForRange(t.employee_count, t.employee_count)
    // Segment comes from the same classifier scoring will use — rank with it.
    const seg = qualifyRecord({ company: t.company, domain: t.domain, category: t.category, fitReason: t.fit_reason }).segment
    const ranked = rankCandidates(candidates, seg, band)

    let chosen: Candidate | null = null
    let grade: 'A' | 'C' | null = null
    let provider: string | null = null
    let score: number | null = null
    for (const c of ranked.slice(0, MAX_VERIFIES_PER_DOMAIN)) {
      if (verifyBudget <= 0) break
      verifyBudget--; stats.verifyBudgetLeft = verifyBudget
      const v = await verifyEmail(c.email)
      if (!v) { stats.skipped.push({ domain: t.domain, why: 'all verifiers unavailable' }); break }
      stats.verified++
      if (v.verdict === 'deliverable') { chosen = c; grade = 'A'; provider = v.provider; score = v.score; break }
      if (v.verdict === 'risky' || v.verdict === 'unknown') { chosen = c; grade = 'C'; provider = v.provider; score = v.score; break }
      // undeliverable -> try the next-ranked published address
    }
    if (!chosen || !grade) {
      if (!stats.skipped.some(s => s.domain === t.domain)) stats.skipped.push({ domain: t.domain, why: 'published addresses failed verification' })
      continue
    }

    // Score through the SAME deterministic path as every other prospect. The
    // careers-page text is the evidence prose; extractEvidence pulls the
    // conservative signal patterns out of it.
    const out = qualifyRecord({
      company: t.company,
      domain: t.domain,
      category: t.category,
      title: chosen.title,
      personName: chosen.name,
      email: chosen.email,
      emailGrade: grade,
      fitReason: [t.fit_reason, benefitsText].filter(Boolean).join(' '),
      sourceUrl: benefitsUrl ?? chosen.sourceUrl,
      researchAgeDays: 0,
      known: t.company_size_band ? { sizeBand: t.company_size_band as SizeBand, sizeConfidence: 'MEDIUM' } : null,
    })

    if (out.result.status === 'QUALIFIED') stats.qualified++
    stats.upgraded.push({
      company: t.company, person: chosen.name ?? '(unnamed)', title: chosen.title ?? '(untitled)',
      email: chosen.email, tier: out.result.tier, status: out.result.status,
    })
    if (dry) continue

    await supabaseAdmin.from('prospects').update({
      person_name: chosen.name,
      title: chosen.title,
      email: chosen.email,
      email_grade: grade,
      verifier_provider: provider,
      verifier_score: score,
      source_url: chosen.sourceUrl,
      segment: out.segment,
      qualification_score: out.result.score,
      qualification_tier: out.result.tier,
      qualification_status: out.result.status,
      company_fit_score: out.result.companyFit,
      contact_fit_score: out.result.contactFit,
      intent_score: out.result.intent,
      data_quality_score: out.result.dataQuality,
      recurring_potential: out.result.recurring,
      contact_confidence: out.result.contactConfidence,
      company_size_band: out.sizeBand,
      company_size_confidence: out.sizeConfidence,
      email_is_generic: out.result.emailIsGeneric,
      title_interpretation: out.result.titleInterpretation,
      role_family: out.result.roleFamily,
      qualification_summary: ('[crawler] ' + out.explanation).slice(0, 4000),
      qualification_reasons: out.result.reasons,
      disqualification_reasons: out.result.disqualifiers,
      qualification_via: 'site_crawler',
      qualified_at: new Date().toISOString(),
      research_version: 3,
      // QUALIFIED rows become drafter-visible; everything else keeps its status.
      ...(out.result.status === 'QUALIFIED' ? { status: 'discovered' } : {}),
      updated_at: new Date().toISOString(),
    }).eq('id', t.id)

    // Refresh this domain's signal rows (crawler is idempotent per domain).
    await supabaseAdmin.from('prospect_signals').delete().eq('domain', dkey)
    if (out.signals.length) {
      await supabaseAdmin.from('prospect_signals').insert(out.signals.map(s => ({
        prospect_id: t.id, domain: dkey,
        signal_type: String(s.signal_type), signal_value: s.signal_value ?? null,
        confidence: s.confidence ?? 'MEDIUM',
        source_url: s.source_url ?? benefitsUrl ?? chosen!.sourceUrl, source_title: s.source_title ?? null,
      })))
    }
  }

  return stats
}
