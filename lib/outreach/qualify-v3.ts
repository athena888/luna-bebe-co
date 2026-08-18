// Qualification orchestration — turns research prose into structured, scorable
// evidence, then scores it deterministically.
//
// The audit found the system already gathered good research into `fit_reason`
// and then threw it away after writing one opening sentence. This module fixes
// that: the same text now drives segment classification, size confidence,
// intent signals and drafting eligibility (§13), while the original prose is
// preserved verbatim for auditability.
//
// Extraction is deterministic pattern-matching, NOT a model call. That matters
// for three reasons: it is free, it is reproducible in tests, and it cannot
// hallucinate a signal that is not literally present in the source text.
// "No evidence found" is a valid, common, and honest outcome.

import type { Segment, SignalType, SizeBand } from './icp.ts'
import { bandForRange, roleFamilyForTitle } from './icp.ts'
import type { Confidence, ScoringSignal } from './scoring.ts'

// ── Segment classification ───────────────────────────────────────────────────
// Ordered: first match wins, most specific first. Driven by company category,
// company description and the research text — never by the person's title.
const SEGMENT_RULES: Array<{ segment: Segment; re: RegExp }> = [
  // Partnership motion is separated BEFORE anything else so a fertility clinic
  // can never fall through into corporate employee gifting (§7).
  { segment: 'PARTNERSHIP', re: /\b(fertility|ivf|reproductive|obgyn|ob-gyn|midwif|doula|birth center|prenatal|postpartum (clinic|care center)|pediatric|lactation|women'?s health clinic)\b/i },
  // Explicitly non-core (§6).
  { segment: 'LOW_PRIORITY', re: /\b(interior design|interior designer|design studio|event (planning|planner|production)|event producer|florist|spa\b|medspa|med spa|aesthetic|esthetic|salon|wellness studio|photograph)/i },
  { segment: 'VC_PLATFORM', re: /\b(venture capital|venture fund|\bvc\b|private equity|\bpe firm\b|growth equity|startup studio|venture studio|investment (firm|fund)|portfolio compan|limited partner)\b/i },
  { segment: 'WEALTH_CLIENT', re: /\b(wealth management|wealth advisor|family office|multi-family office|\bria\b|registered investment advis|private bank|private client|asset management|financial advisory|financial planning|investment advis)\b/i },
  { segment: 'LAW_PROFESSIONAL', re: /\b(law firm|\bllp\b|attorney|lawyer|legal counsel|\bp\.?a\.?\b law|counsel|litigation|estate planning|family law|accounting firm|\bcpa\b|tax advisory|consulting firm|management consult)\b/i },
  { segment: 'EMPLOYEE_GIFTING', re: /\b(software|saas|technology compan|tech compan|platform|app\b|cloud|cybersecurity|biotech|pharma|life sciences|agency|marketing agency|creative agency|\bpr\b agency|communications agency|manufactur|logistics|healthcare (technology|software))\b/i },
]

/** Classify from the company's own description + category, never from a title. */
export function classifySegment(opts: {
  category?: string | null
  companyDescription?: string | null
  companyName?: string | null
}): Segment {
  // A legacy v1 category is a strong prior when one exists.
  const legacy: Record<string, Segment> = {
    tech_people_ops: 'EMPLOYEE_GIFTING',
    vc_platform: 'VC_PLATFORM',
    wealth_mgmt: 'WEALTH_CLIENT',
    law: 'LAW_PROFESSIONAL',
    agencies_pr: 'EMPLOYEE_GIFTING',
    interior_events: 'LOW_PRIORITY',
    luxury_real_estate: 'LOW_PRIORITY',
    beauty_fertility_health: 'PARTNERSHIP',
  }
  const cat = (opts.category ?? '').trim()
  if (cat && legacy[cat]) return legacy[cat]

  const text = `${opts.companyName ?? ''} ${opts.companyDescription ?? ''}`
  for (const { segment, re } of SEGMENT_RULES) if (re.test(text)) return segment
  return 'LOW_PRIORITY'
}

// ── Signal extraction from research prose (§13) ──────────────────────────────
// Each pattern must match language that genuinely evidences the signal. These
// are intentionally conservative — a false positive here inflates the score and
// corrupts the whole quality gate.
const SIGNAL_PATTERNS: Array<{ type: SignalType; re: RegExp; confidence: Confidence }> = [
  { type: 'parental_leave_benefit', re: /\b(parental leave|maternity leave|paternity leave|family leave|new parent leave)\b/i, confidence: 'HIGH' },
  { type: 'new_parent_support', re: /\b(new[- ]parent (support|program|benefit)|baby bonus|fertility benefit|family[- ]forming benefit|childcare (benefit|stipend|support))\b/i, confidence: 'HIGH' },
  { type: 'employee_benefits_page', re: /\b(benefits (package|program|page)|comprehensive benefits|employee benefits|total rewards)\b/i, confidence: 'MEDIUM' },
  { type: 'employee_recognition', re: /\b(employee recognition|recognition program|service award|milestone (recognition|award)|peer recognition|employee appreciation)\b/i, confidence: 'MEDIUM' },
  { type: 'milestone_gifting', re: /\b(milestone gift|life event gift|celebrat\w+ milestones|employee gift)\b/i, confidence: 'HIGH' },
  { type: 'people_hr_function', re: /\b(people team|people ops|people operations|human resources (team|department)|hr team|chief people|head of people|people & culture|people and culture)\b/i, confidence: 'HIGH' },
  { type: 'employee_experience_team', re: /\b(employee experience|people experience|employee engagement)\b/i, confidence: 'HIGH' },
  { type: 'workplace_experience', re: /\b(workplace experience|workplace team|office experience)\b/i, confidence: 'MEDIUM' },
  { type: 'careers_page', re: /\b(careers page|we'?re hiring|open roles|join our team|best places to work|great place to work|built in (seattle|sf|nyc|boston|austin|chicago)|top workplace)\b/i, confidence: 'LOW' },

  { type: 'corporate_gifting_page', re: /\b(corporate gifting|client gifting|gifting program|gift program)\b/i, confidence: 'HIGH' },
  { type: 'client_gifting_program', re: /\b(client (gift|appreciation)|closing gift|thank[- ]you gift(s)? (to|for) clients)\b/i, confidence: 'HIGH' },
  { type: 'client_experience_positioning', re: /\b(client experience|white[- ]glove|high[- ]touch|personalized service|bespoke service|client[- ]first)\b/i, confidence: 'MEDIUM' },
  { type: 'concierge_service', re: /\b(concierge)\b/i, confidence: 'MEDIUM' },
  { type: 'hnw_family_model', re: /\b(high[- ]net[- ]worth|\bhnw\b|\buhnw\b|ultra[- ]high[- ]net[- ]worth|multigenerational|generational wealth|families across generations|life events)\b/i, confidence: 'HIGH' },
  { type: 'family_office', re: /\b(family office|multi[- ]family office|\bmfo\b)\b/i, confidence: 'HIGH' },

  { type: 'platform_team', re: /\b(platform team|platform function|head of platform|platform & community|value creation team)\b/i, confidence: 'HIGH' },
  { type: 'portfolio_services', re: /\b(portfolio (support|services|operations|success)|operational support (to|for) (portfolio|founders)|value[- ]add)\b/i, confidence: 'HIGH' },
  { type: 'founder_community', re: /\b(founder community|founder network|founder experience|community (of|for) founders)\b/i, confidence: 'MEDIUM' },
  { type: 'talent_network', re: /\b(talent (network|services|team)|recruiting support for portfolio|executive network)\b/i, confidence: 'MEDIUM' },

  { type: 'family_law_practice', re: /\b(family law|divorce|matrimonial|child custody)\b/i, confidence: 'HIGH' },
  { type: 'private_client_practice', re: /\b(private client|private wealth (group|practice)|trusts? (and|&) estates?)\b/i, confidence: 'HIGH' },
  { type: 'estate_planning_practice', re: /\b(estate planning|wealth transfer|succession planning)\b/i, confidence: 'HIGH' },
  { type: 'fertility_adoption_practice', re: /\b(adoption|surrogacy|assisted reproduction|reproductive law)\b/i, confidence: 'HIGH' },

  { type: 'office_locations', re: /\b(offices in|locations in|\d+ offices)\b/i, confidence: 'LOW' },
]

export interface ExtractedEvidence {
  signals: ScoringSignal[]
  employeeMin: number | null
  employeeMax: number | null
  sizeBand: SizeBand | null
  sizeConfidence: Confidence
  officialSource: boolean
}

/**
 * Pull structured evidence out of research prose.
 *
 * `sourceUrl` is attached to every extracted signal so a human can verify it.
 * Nothing is inferred beyond what the text literally says.
 */
export function extractEvidence(text: string | null | undefined, sourceUrl?: string | null): ExtractedEvidence {
  const t = (text ?? '').trim()
  const signals: ScoringSignal[] = []
  if (t) {
    const seen = new Set<string>()
    for (const { type, re, confidence } of SIGNAL_PATTERNS) {
      const m = t.match(re)
      if (m && !seen.has(type)) {
        seen.add(type)
        signals.push({
          signal_type: type,
          signal_value: m[0].slice(0, 120),
          confidence,
          source_url: sourceUrl ?? null,
          source_title: null,
        })
      }
    }
  }
  const size = extractHeadcount(t)
  return {
    signals,
    employeeMin: size.min,
    employeeMax: size.max,
    sizeBand: bandForRange(size.min, size.max),
    sizeConfidence: size.confidence,
    officialSource: Boolean(sourceUrl && !/linkedin\.com/i.test(sourceUrl)),
  }
}

/**
 * Headcount from research prose. Returns a RANGE — never an invented exact
 * figure. Weak qualitative wording yields LOW confidence, which the scorer
 * penalizes rather than trusting.
 */
export function extractHeadcount(text: string): { min: number | null; max: number | null; confidence: Confidence } {
  const t = (text || '').replace(/,/g, '')
  if (!t) return { min: null, max: null, confidence: 'LOW' }

  // "between 200 and 500 employees" / "200-500 employees"
  const range = t.match(/\b(\d{1,6})\s*(?:-|–|to|and)\s*(\d{1,6})\s*(?:\+\s*)?(?:employees|people|staff|professionals|attorneys|advisors)\b/i)
  if (range) {
    const a = Number(range[1]); const b = Number(range[2])
    if (a > 0 && b >= a && b < 1_000_000) return { min: a, max: b, confidence: 'HIGH' }
  }

  // "a 185-person agency" / "185 person firm"
  const person = t.match(/\b(\d{1,6})[- ]person\b/i)
  if (person) {
    const n = Number(person[1])
    if (n > 0) return { min: n, max: n, confidence: 'HIGH' }
  }

  // "~25 employees" / "over 500 employees" / "more than 1000 staff"
  const approx = t.match(/\b(?:approximately|approx\.?|about|around|~|over|more than|nearly|upwards of)\s*(\d{1,6})\s*(?:\+\s*)?(?:employees|people|staff|professionals|attorneys|advisors)\b/i)
  if (approx) {
    const n = Number(approx[1])
    if (n > 0) return { min: Math.floor(n * 0.8), max: Math.ceil(n * 1.25), confidence: 'MEDIUM' }
  }

  // Bare "500 employees"
  const bare = t.match(/\b(\d{1,6})\s*(?:\+\s*)?(?:employees|people on staff|team members)\b/i)
  if (bare) {
    const n = Number(bare[1])
    if (n > 0) return { min: Math.floor(n * 0.9), max: Math.ceil(n * 1.1), confidence: 'MEDIUM' }
  }

  // Qualitative only — a real but weak hint. LOW confidence on purpose.
  if (/\b(fortune 500|publicly traded|nasdaq|nyse:|thousands of employees|global (workforce|offices))\b/i.test(t)) {
    return { min: 1000, max: 10000, confidence: 'LOW' }
  }
  if (/\b(boutique|solo practitioner|small (team|studio|practice)|two-person|husband and wife)\b/i.test(t)) {
    return { min: 1, max: 20, confidence: 'LOW' }
  }
  return { min: null, max: null, confidence: 'LOW' }
}

// ── Human-readable qualification explanation (§19) ───────────────────────────
import type { ScoringResult } from './scoring.ts'
import { SEGMENTS } from './icp.ts'

export interface ExplainInput {
  company: string
  personName: string | null
  email: string | null
  sizeBand: SizeBand | null
  sizeConfidence: Confidence
  signals: ScoringSignal[]
  result: ScoringResult
  segment: Segment
}

/**
 * The review card. Emily should never have to read raw research to decide
 * whether a lead is worth an email.
 */
export function explainQualification(i: ExplainInput): string {
  const r = i.result
  const lines: string[] = []
  lines.push(`QUALIFICATION SCORE: ${r.score}/100`)
  lines.push(`TIER: ${r.tier}`)
  lines.push(`SEGMENT: ${SEGMENTS[i.segment].label}`)
  lines.push('')
  lines.push(`COMPANY: ${i.company}`)
  lines.push(`EMPLOYEE SIZE: ${i.sizeBand ?? 'unknown'}`)
  lines.push(`SIZE CONFIDENCE: ${i.sizeConfidence}`)
  lines.push('')
  lines.push(`TARGET PERSON: ${i.personName ?? '(none)'}`)
  lines.push(`TITLE: ${r.titleClean || '(none)'}`)
  if (r.titleInterpretation) lines.push(`  (researcher note, excluded from title: ${r.titleInterpretation})`)
  lines.push(`CONTACT CONFIDENCE: ${r.contactConfidence}`)
  lines.push(`EMAIL: ${r.emailIsGeneric ? 'GENERIC INBOX' : 'direct named'}`)
  lines.push('')
  lines.push('WHY THIS COMPANY COULD BUY:')
  const companyReasons = r.reasons.filter(x => !x.startsWith('Buying signal:'))
  if (companyReasons.length) companyReasons.forEach(x => lines.push(`  - ${x}`))
  else lines.push('  - (none recorded)')
  lines.push('')
  lines.push('BUYING SIGNALS:')
  if (i.signals.length) {
    for (const s of i.signals) {
      lines.push(`  - ${String(s.signal_type).replace(/_/g, ' ')}: "${s.signal_value ?? ''}"`)
      lines.push(`      source: ${s.source_url ?? 'research text'} (${s.confidence ?? 'MEDIUM'})`)
    }
  } else {
    lines.push('  - none found')
  }
  lines.push('')
  lines.push('RISKS:')
  if (r.disqualifiers.length) r.disqualifiers.forEach(x => lines.push(`  - ${x}`))
  else lines.push('  - none identified')
  lines.push('')
  lines.push(`WHY THIS PERSON: ${roleExplanation(r)}`)
  lines.push(`EXPECTED USE CASE: ${useCaseFor(i.segment)}`)
  lines.push(`RECURRING POTENTIAL: ${r.recurring}`)
  lines.push('')
  lines.push(`RECOMMENDATION: ${recommendation(r)}`)
  return lines.join('\n')
}

function roleExplanation(r: ScoringResult): string {
  if (r.roleGrade === 'EXACT') return `${r.titleClean} is the exact budget owner for this motion (${r.roleFamily}).`
  if (r.roleGrade === 'INFLUENCER') return `${r.titleClean} plausibly influences this purchase (${r.roleFamily}).`
  return `${r.titleClean || 'unknown role'} does not own or influence this purchase (${r.roleFamily}).`
}

function useCaseFor(s: Segment): string {
  switch (s) {
    case 'EMPLOYEE_GIFTING': return 'employee gifting'
    case 'WEALTH_CLIENT': return 'client gifting'
    case 'VC_PLATFORM': return 'portfolio / founder gifting'
    case 'LAW_PROFESSIONAL': return 'client or employee gifting'
    case 'PARTNERSHIP': return 'partnership / patient gifting'
    default: return 'other'
  }
}

function recommendation(r: ScoringResult): 'SEND' | 'MANUAL REVIEW' | 'REJECT' {
  if (r.draftEligible) return 'SEND'
  if (r.status === 'REJECTED' || r.hardFail) return 'REJECT'
  return 'MANUAL REVIEW'
}

// ── Convenience: full qualification of one prospect-shaped record ────────────
import { scoreProspect } from './scoring.ts'

export interface QualifyRecord {
  company: string
  domain: string
  category?: string | null
  title?: string | null
  personName?: string | null
  email?: string | null
  emailGrade?: 'A' | 'B' | 'C' | 'D' | null
  fitReason?: string | null
  sourceUrl?: string | null
  researchAgeDays?: number | null
  genericOverrideApproved?: boolean
  /** Firmographics already researched for this domain, when available. */
  known?: { sizeBand?: SizeBand | null; sizeConfidence?: Confidence } | null
  /** Sourced signals from the enrichment stage. These are stronger than
   *  text-extracted ones because each carries a verifiable source URL. */
  extraSignals?: ScoringSignal[]
}

export interface QualifyOutcome {
  segment: Segment
  evidence: ExtractedEvidence
  result: ScoringResult
  explanation: string
  /** The size band actually used for scoring (researched beats extracted). */
  sizeBand: SizeBand | null
  sizeConfidence: Confidence
  /** Every signal considered, researched and extracted combined. */
  signals: ScoringSignal[]
}

export function qualifyRecord(rec: QualifyRecord): QualifyOutcome {
  const segment = classifySegment({
    category: rec.category,
    companyDescription: rec.fitReason,
    companyName: rec.company,
  })
  const evidence = extractEvidence(rec.fitReason, rec.sourceUrl)

  // Researched firmographics beat text extraction when present.
  const sizeBand = rec.known?.sizeBand ?? evidence.sizeBand
  const sizeConfidence = rec.known?.sizeConfidence ?? evidence.sizeConfidence

  // Merge researched signals with text-extracted ones, de-duplicated by type.
  // Researched signals win because they carry a verifiable source URL.
  const byType = new Map<string, ScoringSignal>()
  for (const s of evidence.signals) byType.set(String(s.signal_type), s)
  for (const s of rec.extraSignals ?? []) byType.set(String(s.signal_type), s)
  const signals = [...byType.values()]

  const result = scoreProspect({
    segment,
    company: rec.company,
    domain: rec.domain,
    title: rec.title ?? null,
    personName: rec.personName ?? null,
    email: rec.email ?? null,
    emailGrade: rec.emailGrade ?? null,
    sizeBand,
    sizeConfidence,
    officialSourceEvidence: evidence.officialSource || (rec.extraSignals ?? []).length > 0,
    researchAgeDays: rec.researchAgeDays ?? null,
    signals,
    genericOverrideApproved: rec.genericOverrideApproved,
  })

  const explanation = explainQualification({
    company: rec.company,
    personName: rec.personName ?? null,
    email: rec.email ?? null,
    sizeBand, sizeConfidence,
    signals,
    result, segment,
  })

  return { segment, evidence, result, explanation, sizeBand, sizeConfidence, signals }
}

/** Exposed for tests and the review UI. */
export { roleFamilyForTitle }
