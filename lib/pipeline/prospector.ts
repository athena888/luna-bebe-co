import { anthropic } from '../anthropic.ts'
import { supabaseAdmin } from '../supabase.ts'
import { emailDomain } from '../outreach.ts'
import { verifyEmail } from '../emailVerifier.ts'
import {
  getRotation, comboForCursor, advanceRotation, getBlockedDomains, isBlockedEmail,
  getDailySendCap, bumpDailyStats, pipelineEnabled, type Combo,
} from './config.ts'

// Stage 1 — nightly prospector. A Claude agent (web_search tool) finds ~40
// candidates for tonight's metro×category combo; we dedup hard, discover an
// email per survivor (grade A published / grade B pattern+verified), and write
// A/B prospects as 'discovered' for the drafter. C → needs_manual_check,
// D → discarded (kept as rows so they're never re-discovered), verifier
// exhausted → awaiting_verification (retried next cycle).
// LinkedIn URLs are stored for MANUAL review only — never scraped.

const MODEL = 'claude-sonnet-4-6'

export interface Candidate {
  company: string
  domain: string
  person_name: string
  title: string
  linkedin_url?: string | null
  fit_reason: string
}

export interface ProspectorStats {
  combo: Combo
  combosWorked: number
  found: number
  dedupRejected: number
  gradeA: number
  gradeB: number
  gradeC: number
  gradeD: number
  parked: number
  reverified: number
  dry: boolean
}

const extractJson = (text: string): unknown => {
  const m = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/)
  if (!m) return null
  try { return JSON.parse(m[0]) } catch { return null }
}

// ── Candidate search (Claude + web_search server tool) ───────────────────────
const CATEGORY_LABEL: Record<string, string> = {
  tech_people_ops: 'tech companies (target the People Ops / HR team)',
  law: 'law firms (family, estate, corporate — firms with long client relationships)',
  vc_platform: 'venture capital firms (target the platform/community team)',
  wealth_mgmt: 'wealth management and financial advisory firms',
  luxury_real_estate: 'luxury residential real estate brokerages and top-producing teams',
  agencies_pr: 'creative, marketing and PR agencies',
  interior_events: 'interior design studios and high-end event planning firms',
  beauty_fertility_health: "beauty/wellness studios and fertility or women's-health clinics",
}

async function searchCandidates(combo: Combo, want: number): Promise<Candidate[]> {
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8000,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 12 }],
    system: `You are a B2B prospect researcher for Petite Lavande, a Seattle maker of organic newborn & postpartum gift boxes sold to companies as client/employee gifts.

Rules:
- Use web search to find REAL, currently-operating companies and REAL people who work there now. Never invent a company or a person.
- Do NOT open or scrape linkedin.com pages. If a search RESULT snippet surfaces a LinkedIn URL you may record it, nothing more.
- fit_reason must be ONE specific, verifiable sentence about the company (recent award, growth, clientele, culture page mention of family benefits, etc.). If you can't find anything specific, write a plain factual sentence about what they do — never speculate.
- Prefer companies plausibly senior enough to send client or employee gifts (10+ people, established).
- Output ONLY a JSON array, no prose.`,
    messages: [{
      role: 'user',
      content: `Find up to ${want} prospect candidates: ${CATEGORY_LABEL[combo.category] ?? combo.category} in the ${combo.metro} metro area. For each, identify one person holding (or closest to) one of these titles: ${combo.titles.join(', ')}.

Return a JSON array of objects with exactly these keys:
{"company": string, "domain": string (bare domain like "acme.com"), "person_name": string, "title": string, "linkedin_url": string|null, "fit_reason": string}`,
    }],
  })

  const text = res.content.filter(b => b.type === 'text').map(b => (b as { text: string }).text).join('\n')
  const parsed = extractJson(text)
  if (!Array.isArray(parsed)) return []
  return parsed
    .filter((c): c is Record<string, unknown> => Boolean(c && typeof c === 'object'))
    .map(c => ({
      company: String(c.company ?? '').trim(),
      domain: String(c.domain ?? '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0],
      person_name: String(c.person_name ?? '').trim(),
      title: String(c.title ?? '').trim(),
      linkedin_url: c.linkedin_url ? String(c.linkedin_url).trim() : null,
      fit_reason: String(c.fit_reason ?? '').trim(),
    }))
    .filter(c => c.company && c.domain && c.domain.includes('.') && c.person_name)
}

// ── Grade A: an address published on the company's own site ─────────────────
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi
const PAGES = ['', '/contact', '/contact-us', '/about', '/about-us', '/press', '/team']

export async function findPublishedEmail(domain: string, personName: string): Promise<string | null> {
  const first = personName.split(/\s+/)[0]?.toLowerCase() ?? ''
  const found = new Set<string>()
  for (const path of PAGES) {
    try {
      const res = await fetch(`https://${domain}${path}`, {
        signal: AbortSignal.timeout(8000),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PetiteLavande/1.0)' },
        redirect: 'follow',
      })
      if (!res.ok) continue
      const html = (await res.text()).slice(0, 500_000)
      for (const m of html.matchAll(EMAIL_RE)) {
        const e = m[0].toLowerCase()
        // Only addresses on the company's own domain count as "published by company".
        if (emailDomain(e).endsWith(domain)) found.add(e)
      }
      if (found.size >= 8) break
    } catch { /* page unreachable — try the next */ }
  }
  if (!found.size) return null
  const all = [...found].filter(e => !/\.(png|jpg|jpeg|gif|webp|svg)$/.test(e))
  if (!all.length) return null
  // Prefer an address that looks like the person; else any published address.
  return all.find(e => first && e.split('@')[0].includes(first)) ?? all[0]
}

// ── Grade B: pattern inference (verified before it can ever queue) ──────────
export function patternCandidates(personName: string, domain: string): string[] {
  const parts = personName.toLowerCase().replace(/[^a-z\s-]/g, '').split(/\s+/).filter(Boolean)
  const first = parts[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1] : ''
  if (!first) return []
  const locals = last
    ? [`${first}.${last}`, first, `${first[0]}${last}`, `${first}${last}`, `${first}_${last}`]
    : [first]
  return [...new Set(locals)].map(l => `${l}@${domain}`)
}

// ── Main run ─────────────────────────────────────────────────────────────────
export async function runProspector(opts: { dry?: boolean; timeBudgetMs?: number } = {}): Promise<ProspectorStats & { paused?: boolean }> {
  const deadline = Date.now() + (opts.timeBudgetMs ?? 270_000)
  const dry = Boolean(opts.dry)

  if (!(await pipelineEnabled())) {
    return {
      combo: { metro: '', category: '', titles: [] }, combosWorked: 0, found: 0, dedupRejected: 0,
      gradeA: 0, gradeB: 0, gradeC: 0, gradeD: 0, parked: 0, reverified: 0, dry, paused: true,
    }
  }

  const rotation = await getRotation()
  const combo = comboForCursor(rotation, rotation.cursor)
  const cap = await getDailySendCap()
  const target = Math.ceil(cap * 1.2)
  const blocked = await getBlockedDomains()

  const stats: ProspectorStats = {
    combo, combosWorked: 0, found: 0, dedupRejected: 0,
    gradeA: 0, gradeB: 0, gradeC: 0, gradeD: 0, parked: 0, reverified: 0, dry,
  }

  // Retry prospects parked when every verifier was exhausted last cycle.
  if (!dry) stats.reverified = await retryAwaitingVerification(deadline)

  // Existing A/B inventory that hasn't been drafted yet counts toward tonight's target.
  const { count: readyCount } = await supabaseAdmin.from('prospects')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'discovered').in('email_grade', ['A', 'B'])
  let ready = readyCount ?? 0

  // Known domains/emails for dedup (prospects + contacts + suppression + customers).
  const [pRows, cRows, sRows, oRows] = await Promise.all([
    supabaseAdmin.from('prospects').select('domain, email, person_name, company'),
    supabaseAdmin.from('contacts').select('email'),
    supabaseAdmin.from('suppression').select('email, domain'),
    supabaseAdmin.from('orders').select('customer_email').not('customer_email', 'is', null).limit(5000),
  ])
  const knownDomains = new Set<string>()
  const knownEmails = new Set<string>()
  const knownPersonCompany = new Set<string>()
  for (const r of (pRows.data ?? []) as { domain: string | null; email: string | null; person_name: string | null; company: string | null }[]) {
    if (r.domain) knownDomains.add(r.domain.toLowerCase())
    if (r.email) knownEmails.add(r.email.toLowerCase())
    if (r.person_name && r.company) knownPersonCompany.add(`${r.person_name.toLowerCase()}|${r.company.toLowerCase()}`)
  }
  for (const r of (cRows.data ?? []) as { email: string }[]) {
    knownEmails.add(r.email.toLowerCase()); knownDomains.add(emailDomain(r.email))
  }
  for (const r of (sRows.data ?? []) as { email: string; domain: string | null }[]) {
    knownEmails.add(r.email.toLowerCase())
    if (r.domain) knownDomains.add(r.domain.toLowerCase())
  }
  for (const r of (oRows.data ?? []) as { customer_email: string }[]) knownEmails.add(r.customer_email.toLowerCase())

  // Work tonight's combo; if it runs dry and time remains, pull the next one (max 2).
  let cursor = rotation.cursor
  for (let round = 0; round < 2 && ready < target && Date.now() < deadline - 60_000; round++) {
    const c = comboForCursor(rotation, cursor)
    stats.combosWorked++

    const candidates = await searchCandidates(c, 40)
    stats.found += candidates.length

    for (const cand of candidates) {
      if (ready >= target || Date.now() > deadline - 20_000) break

      // Dedup: domain OR person+company OR email already known; blocklist; freemail domains.
      const dom = cand.domain
      if (knownDomains.has(dom) || blocked.has(dom)
        || knownPersonCompany.has(`${cand.person_name.toLowerCase()}|${cand.company.toLowerCase()}`)) {
        stats.dedupRejected++; continue
      }

      // a) published on their own site → grade A, skips verification entirely
      const published = await findPublishedEmail(dom, cand.person_name)
      let email: string | null = published
      let grade: 'A' | 'B' | 'C' | 'D' | null = published ? 'A' : null
      let score: number | null = null
      let provider: string | null = null
      let status = 'discovered'

      if (email && (knownEmails.has(email) || isBlockedEmail(email, blocked))) { stats.dedupRejected++; continue }

      // b) pattern inference → MUST pass verification before it can be queued
      if (!email) {
        let exhausted = false
        for (const guess of patternCandidates(cand.person_name, dom).slice(0, 2)) {
          if (knownEmails.has(guess) || isBlockedEmail(guess, blocked)) continue
          const v = await verifyEmail(guess)
          if (v === null) { exhausted = true; email = guess; break }
          score = v.score; provider = v.provider
          if (v.verdict === 'deliverable') { email = guess; grade = 'B'; break }
          if (v.verdict === 'risky') { email = guess; grade = 'C'; break }
          // undeliverable/unknown → try the next pattern
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
          metro: c.metro, category: c.category, linkedin_url: cand.linkedin_url,
          email, email_grade: grade, verifier_score: score, verifier_provider: provider,
          fit_reason: cand.fit_reason, status: grade === 'D' ? 'discarded' : status,
        })
        if (error) { stats.dedupRejected++; continue }  // unique domain/email index — parallel-safe dedup
      }
      knownDomains.add(dom)
      if (email) knownEmails.add(email)
      if (grade === 'A' || grade === 'B') ready++
    }
    cursor++
  }

  if (!dry) {
    // Nightly advance — lists stay fresh, never the same combo two nights running.
    await advanceRotation({ ...rotation, cursor: Math.max(cursor, rotation.cursor + 1) })
    await bumpDailyStats({
      found: stats.found, dedup_rejected: stats.dedupRejected,
      grade_a: stats.gradeA, grade_b: stats.gradeB, grade_c: stats.gradeC, grade_d: stats.gradeD,
      parked_awaiting_verification: stats.parked,
    })
  }
  return stats
}

/** Re-run verification for prospects parked while every provider was exhausted. */
async function retryAwaitingVerification(deadline: number): Promise<number> {
  const { data } = await supabaseAdmin.from('prospects')
    .select('id, email').eq('status', 'awaiting_verification').not('email', 'is', null).limit(50)
  let done = 0
  for (const p of (data ?? []) as { id: string; email: string }[]) {
    if (Date.now() > deadline - 60_000) break
    const v = await verifyEmail(p.email)
    if (v === null) break  // still exhausted — stop burning time
    const grade = v.verdict === 'deliverable' ? 'B' : v.verdict === 'risky' ? 'C' : 'D'
    await supabaseAdmin.from('prospects').update({
      email_grade: grade, verifier_score: v.score, verifier_provider: v.provider,
      status: grade === 'B' ? 'discovered' : grade === 'C' ? 'needs_manual_check' : 'discarded',
      updated_at: new Date().toISOString(),
    }).eq('id', p.id)
    done++
  }
  return done
}
