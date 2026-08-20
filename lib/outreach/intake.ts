import { promises as fs } from 'fs'
import path from 'path'
import { supabaseAdmin } from '../supabase.ts'
import { getConfig, setConfig } from '../pipeline/config.ts'
import { verifyEmail } from '../emailVerifier.ts'
import { qualifyRecord } from './qualify-v3.ts'
import {
  isGenericEmail, looksLikeMachineAddress, SIZE_BANDS, bandForRange, type SizeBand,
} from './icp.ts'
import { fetchPage, extractEmails, stripTags } from './contact-crawler.ts'

// Research intake — the shared core behind BOTH delivery paths from the daily
// cloud research routine:
//   1. Direct POST to the portal endpoints (works only if the cloud sandbox's
//      egress policy allows petitelavande.com — today it does not), and
//   2. Repo files: the routine commits ops/outreach-intake/YYYY-MM-DD.json to
//      master (github IS reachable from the sandbox); the Vercel deploy that
//      follows bundles the file (next.config outputFileTracingIncludes) and
//      the nightly cron ingests it here.
//
// PRIVACY RULE for path 2: the repo is PUBLIC, so intake files carry NO email
// addresses — only company seeds and person LEADS (name + title + the public
// URL where they are listed). The email is extracted server-side from that
// URL, verified, and only then stored. Names/titles/URLs are facts already
// public at source_url; the compiled emails never touch the repo.

export interface SeedIn {
  company: string; domain: string; metro?: string; industry?: string
  size_band?: string; employee_est?: number
}

export interface LeadIn {
  domain: string
  person_name: string
  title: string
  /** Where the person + title were seen (public page). */
  source_url?: string | null
  /** Page most likely to carry their published email (bio page). */
  bio_url?: string | null
  /** Benefits/gifting evidence quoted from the company's own site. */
  evidence_text?: string | null
  evidence_url?: string | null
  /** Direct-POST path only — repo files must NEVER carry emails. */
  email?: string | null
}

// Directory industry -> legacy category (classifySegment's strong prior).
const CATEGORY_BY_INDUSTRY: Record<string, string> = {
  law: 'law',
  tech: 'tech_people_ops',
  consulting: 'agencies_pr',
  finance: 'wealth_mgmt',
  real_estate: 'luxury_real_estate',
}

// ── Seeds ────────────────────────────────────────────────────────────────────
export async function processSeeds(seeds: SeedIn[]): Promise<{ seeded: string[]; skipped: { domain: string; why: string }[] }> {
  const seeded: string[] = []
  const skipped: { domain: string; why: string }[] = []
  for (const s of seeds) {
    const domain = (s.domain ?? '').trim().toLowerCase()
    const company = (s.company ?? '').trim()
    if (!domain || !company) { skipped.push({ domain: domain || '(none)', why: 'company and domain required' }); continue }
    const { error } = await supabaseAdmin.from('prospects').insert({
      company, domain,
      channel: 'corporate',
      status: 'needs_manual_check',
      qualification_status: 'NEEDS_CONTACT_RESEARCH',
      category: CATEGORY_BY_INDUSTRY[s.industry ?? ''] ?? null,
      industry_key: s.industry ?? null,
      metro: s.metro ?? null,
      company_size_band: (s.size_band && (SIZE_BANDS as readonly string[]).includes(s.size_band))
        ? s.size_band
        : bandForRange(s.employee_est ?? null, s.employee_est ?? null),
      ...(s.employee_est ? { employee_count: s.employee_est, employee_count_source: 'inferred' } : {}),
      fit_reason: `Directory-crawled seed: ${s.metro ?? '?'} ${s.industry ?? '?'} firm, ${s.size_band ?? s.employee_est ?? '?'} employees.`,
    })
    if (error) skipped.push({ domain, why: error.code === '23505' ? 'already a prospect' : error.message })
    else seeded.push(domain)
  }
  return { seeded, skipped }
}


// The cloud researcher's sandbox cannot fetch company sites (egress policy),
// so its leads arrive without benefits evidence — and without evidence the
// scorer rejects even a verified, well-titled contact and the drafter refuses
// an opening. THIS server can fetch freely, so when a lead carries no
// evidence, harvest the careers page here before scoring.
const BENEFITS_PATHS = ['/careers', '/careers/', '/join', '/join-us', '/jobs', '/culture', '/benefits', '/about/careers']
async function harvestBenefits(domain: string): Promise<{ text: string; url: string } | null> {
  for (const host of ['https://' + domain, 'https://www.' + domain]) {
    for (const path of BENEFITS_PATHS) {
      const html = await fetchPage(host + path)
      if (html) return { text: stripTags(html).slice(0, 6000), url: host + path }
    }
    // only try www if the bare host never answered at all
    const home = await fetchPage(host)
    if (home) return null
  }
  return null
}

// ── Researched contacts / leads ──────────────────────────────────────────────
export interface ContactOutcome {
  domain: string
  status: string
  why?: string
  tier?: string
  emailStored?: boolean
  drafterVisible?: boolean
}

/**
 * Process one researched lead. If no email was supplied (repo path), fetch the
 * lead's bio/source page and extract a PUBLISHED address matching the person.
 * Every address is verified before it is written; generic and machine
 * addresses are refused; rows that already carry an email are never
 * overwritten (a drafted email must keep pointing at the person it named).
 */
export async function processResearchedContact(c: LeadIn, budget: { verifies: number }): Promise<ContactOutcome> {
  const domain = (c.domain ?? '').trim().toLowerCase()
  const name = (c.person_name ?? '').trim()
  const title = (c.title ?? '').trim()
  if (!domain || !name || !title) return { domain, status: 'rejected', why: 'domain, person_name and title are required' }

  const { data: p } = await supabaseAdmin.from('prospects')
    .select('id, company, category, fit_reason, employee_count, company_size_band, status, email')
    .eq('channel', 'corporate').ilike('domain', domain).maybeSingle()
  if (!p) return { domain, status: 'rejected', why: 'no prospect with this domain — seed the company first' }
  if (['sent', 'replied', 'bounced', 'suppressed'].includes(String(p.status))) {
    return { domain, status: 'rejected', why: `prospect already ${p.status}` }
  }
  const existingEmail = (p.email as string | null ?? '').toLowerCase()
  if (existingEmail && existingEmail !== (c.email ?? '').trim().toLowerCase()) {
    return { domain, status: 'rejected', why: 'contact already set for this company — edit in the portal instead' }
  }

  // ── Resolve the email ───────────────────────────────────────────────────────
  let candidate = (c.email ?? '').trim().toLowerCase()
  if (candidate && !candidate.endsWith('@' + domain)) {
    return { domain, status: 'rejected', why: 'email domain does not match company domain' }
  }
  if (!candidate) {
    // Repo path: extract a published address from the pages the researcher
    // pointed at. Prefer one whose local part matches the person's name.
    const urls = [c.bio_url, c.source_url].filter((u): u is string => Boolean(u))
    const nameTokens = name.toLowerCase().split(/\s+/).filter(t => t.length >= 3)
    for (const url of urls) {
      const html = await fetchPage(url)
      if (!html) continue
      const found = [...extractEmails(html, domain).keys()]
        .filter(e => !isGenericEmail(e) && !looksLikeMachineAddress(e))
      if (!found.length) continue
      candidate = found.find(e => nameTokens.some(t => e.split('@')[0].includes(t))) ?? (found.length === 1 ? found[0] : '')
      if (candidate) break
    }
    if (!candidate) {
      // Keep the research: the person is real and titled even if their firm
      // publishes no address. Future paths (portal edit, allowlisted direct
      // POST, a later crawl) start from this instead of zero.
      await supabaseAdmin.from('prospects').update({
        person_name: name, title,
        source_url: c.source_url ?? c.bio_url ?? null,
        qualification_via: 'cloud_research',
        updated_at: new Date().toISOString(),
      }).eq('id', String(p.id))
      return { domain, status: 'parked', why: 'no published address found on the given pages (name/title saved)' }
    }
  }
  if (isGenericEmail(candidate) || looksLikeMachineAddress(candidate)) {
    return { domain, status: 'rejected', why: 'generic or machine address' }
  }

  // ── Verify — never store an unverified address ─────────────────────────────
  if (budget.verifies <= 0) return { domain, status: 'parked', why: 'verify budget spent' }
  budget.verifies--
  const v = await verifyEmail(candidate)
  if (!v) return { domain, status: 'parked', why: 'all verifiers unavailable' }
  if (v.verdict === 'undeliverable') return { domain, status: 'rejected', why: 'verification: undeliverable' }
  const grade: 'A' | 'C' = v.verdict === 'deliverable' ? 'A' : 'C'

  // ── Score through the shared deterministic pipeline ────────────────────────
  const storedBand = p.company_size_band as SizeBand | null
  const band = (storedBand && (SIZE_BANDS as readonly string[]).includes(storedBand))
    ? storedBand
    : bandForRange(p.employee_count as number | null, p.employee_count as number | null)
  let evidenceText = (c.evidence_text ?? '').slice(0, 6000)
  let evidenceUrl = c.evidence_url ?? null
  if (!evidenceText) {
    const harvested = await harvestBenefits(domain)
    if (harvested) { evidenceText = harvested.text; evidenceUrl = harvested.url }
  }

  const q = qualifyRecord({
    company: String(p.company ?? ''),
    domain,
    category: p.category as string | null,
    title,
    personName: name,
    email: candidate,
    emailGrade: grade,
    fitReason: [p.fit_reason as string | null, evidenceText].filter(Boolean).join(' '),
    sourceUrl: evidenceUrl ?? c.source_url ?? null,
    researchAgeDays: 0,
    known: band ? { sizeBand: band, sizeConfidence: 'MEDIUM' } : null,
  })

  await supabaseAdmin.from('prospects').update({
    person_name: name,
    title,
    email: candidate,
    email_grade: grade,
    verifier_provider: v.provider,
    verifier_score: v.score,
    source_url: c.source_url ?? c.bio_url ?? null,
    segment: q.segment,
    qualification_score: q.result.score,
    qualification_tier: q.result.tier,
    qualification_status: q.result.status,
    company_fit_score: q.result.companyFit,
    contact_fit_score: q.result.contactFit,
    intent_score: q.result.intent,
    data_quality_score: q.result.dataQuality,
    recurring_potential: q.result.recurring,
    contact_confidence: q.result.contactConfidence,
    company_size_band: q.sizeBand,
    company_size_confidence: q.sizeConfidence,
    email_is_generic: q.result.emailIsGeneric,
    title_interpretation: q.result.titleInterpretation,
    role_family: q.result.roleFamily,
    qualification_summary: ('[research-intake] ' + q.explanation).slice(0, 4000),
    qualification_reasons: q.result.reasons,
    disqualification_reasons: q.result.disqualifiers,
    qualification_via: 'cloud_research',
    qualified_at: new Date().toISOString(),
    research_version: 3,
    ...(q.result.status === 'QUALIFIED' ? { status: 'discovered' } : {}),
    updated_at: new Date().toISOString(),
  }).eq('id', String(p.id))

  await supabaseAdmin.from('prospect_signals').delete().eq('domain', domain)
  if (q.signals.length) {
    await supabaseAdmin.from('prospect_signals').insert(q.signals.map(s => ({
      prospect_id: p.id, domain,
      signal_type: String(s.signal_type), signal_value: s.signal_value ?? null,
      confidence: s.confidence ?? 'MEDIUM',
      source_url: s.source_url ?? evidenceUrl ?? null, source_title: s.source_title ?? null,
    })))
  }

  return {
    domain, status: q.result.status, tier: q.result.tier,
    emailStored: true, drafterVisible: q.result.status === 'QUALIFIED',
  }
}

// ── Repo-file ingestion (the egress-proof delivery path) ─────────────────────
const INTAKE_DIR = 'ops/outreach-intake'
const INGESTED_KEY = 'intake_ingested'   // outreach_config: string[] of filenames

export interface IngestStats {
  files: string[]
  seeded: number
  seedSkipped: number
  leads: number
  qualified: number
  parked: number
  rejected: number
  outcomes: ContactOutcome[]
}

export async function ingestIntakeFiles(opts: { verifyBudget?: number } = {}): Promise<IngestStats> {
  const stats: IngestStats = { files: [], seeded: 0, seedSkipped: 0, leads: 0, qualified: 0, parked: 0, rejected: 0, outcomes: [] }
  const dir = path.join(process.cwd(), INTAKE_DIR)
  let names: string[] = []
  try {
    names = (await fs.readdir(dir)).filter(n => n.endsWith('.json')).sort()
  } catch {
    return stats   // no intake dir bundled — nothing to do
  }
  const ingested = new Set((await getConfig<string[]>(INGESTED_KEY)) ?? [])
  const budget = { verifies: opts.verifyBudget ?? 12 }

  for (const nameFile of names) {
    if (ingested.has(nameFile)) continue
    let parsed: { seeds?: SeedIn[]; leads?: LeadIn[] }
    try {
      parsed = JSON.parse(await fs.readFile(path.join(dir, nameFile), 'utf-8'))
    } catch (e) {
      console.error('intake: unreadable file', nameFile, e)
      ingested.add(nameFile)   // a corrupt file must not wedge ingestion forever
      continue
    }
    stats.files.push(nameFile)

    const seedRes = await processSeeds(parsed.seeds ?? [])
    stats.seeded += seedRes.seeded.length
    stats.seedSkipped += seedRes.skipped.length

    for (const lead of (parsed.leads ?? []).slice(0, 40)) {
      // PUBLIC-REPO GUARD: emails in committed files are discarded unread.
      const out = await processResearchedContact({ ...lead, email: null }, budget)
      stats.leads++
      stats.outcomes.push(out)
      if (out.drafterVisible) stats.qualified++
      else if (out.status === 'parked') stats.parked++
      else if (out.status === 'rejected') stats.rejected++
    }
    ingested.add(nameFile)
  }

  if (stats.files.length) await setConfig(INGESTED_KEY, [...ingested])
  return stats
}
