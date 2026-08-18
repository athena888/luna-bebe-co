// Contact discovery — find the RIGHT NAMED PERSON at a company we already
// qualified, and a direct address that reaches them.
//
// WHY THIS STAGE EXISTS: after enrichment and scoring, the largest bucket is
// NEEDS_CONTACT_RESEARCH — excellent companies (Yext, Justworks, Remitly,
// Gusto, Carta, Highspot) with real parental-leave and People-function
// evidence, blocked only because v1 never found a usable address for the right
// person. Those companies are the most valuable inventory we have, and
// rediscovering them from scratch would waste the research already paid for.
//
// This module never invents a person. If it cannot find a named individual in
// the target persona with a verifiable address, the prospect stays in
// NEEDS_CONTACT_RESEARCH and is simply retried later.
//
// It also never touches a prospect that has already been contacted: a company
// in 'sent' or 'replied' keeps the contact it was emailed as, because
// rewriting that would destroy the record of who we actually wrote to.

import { anthropic } from '../anthropic.ts'
import { supabaseAdmin } from '../supabase.ts'
import { logApiCall } from './api-ledger.ts'
import { findPublishedEmail, patternCandidates } from '../pipeline/prospector.ts'
import { verifyEmail } from '../emailVerifier.ts'
import { getBlockedDomains, isBlockedEmail } from '../pipeline/config.ts'
import { extractJsonObject, textBlocks } from './json-extract.ts'
import { SEGMENTS, isGenericEmail, looksLikeRoleNotName, isHedgedTitle, type Segment } from './icp.ts'

const MODEL = 'claude-sonnet-4-6'
export const MAX_DISCOVERY_BATCH = 5

/** Personas to search for, in priority order, per segment (§5). */
const TARGET_PERSONAS: Record<Segment, string[]> = {
  EMPLOYEE_GIFTING: [
    'Head of People', 'VP People', 'VP Human Resources', 'Chief People Officer',
    'HR Director', 'Director of People Operations', 'People Operations Manager',
    'Employee Experience Manager', 'Workplace Experience Manager',
    'Total Rewards / Benefits Director',
  ],
  WEALTH_CLIENT: [
    'Chief Client Officer', 'Client Experience Director', 'Client Service Director',
    'Director of Client Relations', 'Chief Operating Officer', 'Chief of Staff',
  ],
  VC_PLATFORM: [
    'Head of Platform', 'Platform Director', 'Portfolio Operations',
    'Head of Talent', 'Chief of Staff', 'Community / Founder Experience lead',
  ],
  LAW_PROFESSIONAL: [
    'Director of Client Relations', 'Chief Client Officer', 'Head of People',
    'HR Director', 'Firm Administrator', 'Office Manager',
  ],
  PARTNERSHIP: ['Practice Owner', 'Clinic Director'],
  LOW_PRIORITY: [],
}

export interface DiscoveryTarget {
  prospectId: string
  company: string
  domain: string
  segment: Segment
}

export interface DiscoveredContact {
  domain: string
  person_name: string | null
  title: string | null
  source_url: string | null
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  note: string | null
}

export interface DiscoveryStats {
  attempted: number
  personFound: number
  emailFound: number
  gradeA: number
  gradeB: number
  unresolved: number
  apiCalls: number
  inputTokens: number
  outputTokens: number
  errors: string[]
  dry: boolean
}

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    contacts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          domain: { type: 'string' },
          person_name: { type: ['string', 'null'], description: "The person's real full name, or null if not found." },
          title: { type: ['string', 'null'], description: 'Their exact public job title, verbatim. No commentary.' },
          source_url: { type: ['string', 'null'], description: 'The page where the name and title were seen.' },
          confidence: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
          note: { type: ['string', 'null'] },
        },
        required: ['domain', 'person_name', 'title', 'source_url', 'confidence'],
        additionalProperties: false,
      },
    },
  },
  required: ['contacts'],
  additionalProperties: false,
} as const

const SYSTEM = `You find the specific person at a company who owns or strongly influences its gifting budget, for Petite Lavande (premium organic new-parent gift boxes sold to companies).

For each company you are given a target persona list in priority order. Find ONE real, currently-employed person whose PUBLIC job title matches the highest-priority persona you can actually verify.

RULES — these are absolute:
- person_name must be a REAL person's full name found on a public page. If you cannot find one, return null. Never guess, never invent, never return a placeholder.
- NEVER return a role or department as the name. "People Operations Manager", "HR Team" and "The People Team" are NOT names. If that is all you can find, return null.
- title must be their EXACT public job title, verbatim. Do not add commentary, qualifiers, or phrases like "closest to", "appears to", or "likely". If you are unsure the title is right, lower confidence instead of hedging in the title text.
- source_url must be the page where you actually saw the name and title (team page, leadership page, careers page, press release, conference bio).
- confidence HIGH only when the name and title come from the company's own site or a dated press item. MEDIUM for a credible third-party page. LOW otherwise.
- Do NOT open or scrape linkedin.com pages. A LinkedIn URL appearing in a search snippet is not a source.
- Do not report anything about the person beyond name, public title and source. No personal characteristics of any kind.

Returning person_name: null is a correct and expected answer. A wrong person is far worse than no person.`

/** Ask for the right person at each company. Returns raw candidates. */
export async function discoverContacts(
  targets: DiscoveryTarget[],
  opts: { dry?: boolean } = {},
): Promise<{ contacts: DiscoveredContact[]; usage: { input: number; output: number } }> {
  const list = targets.slice(0, MAX_DISCOVERY_BATCH)
  const payload = list.map(t => ({
    domain: t.domain,
    company: t.company,
    target_personas: TARGET_PERSONAS[t.segment] ?? [],
  }))

  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 6000,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 12 }],
    output_config: { format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
    system: SYSTEM,
    messages: [{
      role: 'user',
      content: `Find the best contact at each company. One object per company, same order.\n\n${JSON.stringify(payload, null, 1)}`,
    }],
  })

  const usage = { input: res.usage.input_tokens, output: res.usage.output_tokens }
  if (!opts.dry) {
    await logApiCall({
      purpose: 'contact_discovery', model: MODEL, batch_size: list.length,
      input_tokens: usage.input, output_tokens: usage.output, ok: true,
    }).catch(() => {})
  }

  // Web-search responses interleave commentary with the payload; see
  // ./json-extract.ts for why a plain join+parse silently loses whole batches.
  const parsed = (extractJsonObject(textBlocks(res.content), 'contacts') ?? {}) as { contacts?: DiscoveredContact[] }

  const wanted = new Set(list.map(t => t.domain.toLowerCase()))
  const contacts: DiscoveredContact[] = []
  for (const c of parsed.contacts ?? []) {
    const domain = (c.domain ?? '').toLowerCase().trim()
    if (!wanted.has(domain)) continue
    // Reject anything the scorer would reject anyway, at the source.
    if (c.person_name && looksLikeRoleNotName(c.person_name)) continue
    if (c.title && isHedgedTitle(c.title)) continue
    contacts.push({
      domain,
      person_name: c.person_name?.trim() || null,
      title: c.title?.trim() || null,
      source_url: c.source_url ?? null,
      confidence: c.confidence ?? 'LOW',
      note: c.note ?? null,
    })
  }
  return { contacts, usage }
}

export interface ResolvedContact extends DiscoveredContact {
  email: string | null
  email_grade: 'A' | 'B' | 'C' | 'D' | null
  verifier_score: number | null
  verifier_provider: string | null
}

/**
 * Find a deliverable address for a discovered person.
 * Grade A = published on the company's own site. Grade B = inferred from a
 * name pattern AND confirmed deliverable by the verifier. Anything else is not
 * sendable, exactly as in v1 — that rule was already correct.
 */
export async function resolveEmail(contact: DiscoveredContact): Promise<ResolvedContact> {
  const out: ResolvedContact = {
    ...contact, email: null, email_grade: null, verifier_score: null, verifier_provider: null,
  }
  if (!contact.person_name) return out

  const blocked = await getBlockedDomains().catch(() => new Set<string>())

  const published = await findPublishedEmail(contact.domain, contact.person_name).catch(() => null)
  if (published && !isGenericEmail(published) && !isBlockedEmail(published, blocked)) {
    out.email = published
    out.email_grade = 'A'
    return out
  }

  for (const guess of patternCandidates(contact.person_name, contact.domain).slice(0, 3)) {
    if (isGenericEmail(guess) || isBlockedEmail(guess, blocked)) continue
    const v = await verifyEmail(guess).catch(() => null)
    if (v === null) break                       // verifier quota exhausted — retry later
    out.verifier_score = v.score
    out.verifier_provider = v.provider
    if (v.verdict === 'deliverable') { out.email = guess; out.email_grade = 'B'; return out }
    if (v.verdict === 'risky') { out.email = guess; out.email_grade = 'C'; return out }
  }
  return out
}

/**
 * Persist a resolved contact onto its prospect.
 *
 * Refuses to overwrite a prospect that has already been contacted — the record
 * of who we actually emailed must survive. Callers should re-run qualification
 * afterwards so the new contact is scored.
 */
export async function saveContact(prospectId: string, r: ResolvedContact): Promise<'saved' | 'skipped_contacted' | 'incomplete'> {
  if (!r.person_name || !r.email || !(r.email_grade === 'A' || r.email_grade === 'B')) return 'incomplete'

  const { data } = await supabaseAdmin.from('prospects').select('status').eq('id', prospectId).maybeSingle()
  const status = (data as { status?: string } | null)?.status
  if (status && ['sent', 'replied', 'bounced', 'suppressed'].includes(status)) return 'skipped_contacted'

  await supabaseAdmin.from('prospects').update({
    person_name: r.person_name,
    title: r.title,
    title_raw: r.title,
    email: r.email,
    email_grade: r.email_grade,
    verifier_score: r.verifier_score,
    verifier_provider: r.verifier_provider,
    source_url: r.source_url,
    contact_confidence: r.confidence,
    email_is_generic: false,
    // Back into the discovery lane so the drafter can pick it up once it
    // re-qualifies as QUALIFIED.
    status: 'discovered',
    account_stage: 'CONTACT_FOUND',
    updated_at: new Date().toISOString(),
  }).eq('id', prospectId)
  return 'saved'
}

/** Companies worth a contact pass: qualified on the company side, blocked on
 *  the contact side, and not already in a conversation. */
export async function loadDiscoveryTargets(limit = 25): Promise<DiscoveryTarget[]> {
  const { data } = await supabaseAdmin.from('prospects')
    .select('id, company, domain, segment, qualification_score, status')
    .eq('qualification_status', 'NEEDS_CONTACT_RESEARCH')
    .not('status', 'in', '("sent","replied","bounced","suppressed")')
    .order('qualification_score', { ascending: false })
    .limit(limit)

  return ((data ?? []) as Array<{ id: string; company: string; domain: string | null; segment: string | null }>)
    .filter(r => r.domain && r.segment && SEGMENTS[r.segment as Segment]?.autoSendable)
    .map(r => ({
      prospectId: r.id, company: r.company, domain: r.domain!.toLowerCase(), segment: r.segment as Segment,
    }))
}
