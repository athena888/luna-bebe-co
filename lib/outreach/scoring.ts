// Deterministic lead scoring — PURE functions, no I/O, no model calls.
//
// An LLM may COLLECT evidence; it never decides whether a lead is good. Every
// point below traces to a structured field a human can inspect, which is what
// makes the score auditable and the quality gate meaningful.
//
// Score is 0–100 across four components:
//   COMPANY FIT   max 30
//   CONTACT FIT   max 30
//   INTENT        max 30
//   DATA QUALITY  max 10
// Penalties subtract. Hard fails short-circuit to BAD regardless of score,
// because "high score but wrong person" must never reach the queue.

import {
  type Segment, type SizeBand, type RoleFamily, type RecurringPotential,
  type SignalType, type QualificationStatus,
  SEGMENTS, SIGNAL_WEIGHTS, gradeRole, roleFamilyForTitle,
  isGenericEmail, isHedgedTitle, splitTitle, recurringPotential, bandMidpoint,
  looksLikeRoleNotName,
} from './icp.ts'

export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW'
export type Tier = 'EXCELLENT' | 'GOOD' | 'WEAK' | 'BAD'

export interface ScoringSignal {
  signal_type: SignalType | string
  signal_value?: string | null
  confidence?: Confidence
  source_url?: string | null
  source_title?: string | null
}

export interface ScoringInput {
  segment: Segment
  company: string
  domain: string
  title: string | null
  /** The contact's name. A role string here means we have no named person. */
  personName?: string | null
  email: string | null
  emailGrade: 'A' | 'B' | 'C' | 'D' | null
  sizeBand: SizeBand | null
  sizeConfidence: Confidence
  /** Was the industry classification made from an official/primary source? */
  officialSourceEvidence: boolean
  /** Age of the underlying research, days. */
  researchAgeDays: number | null
  signals: ScoringSignal[]
  /** Set when a human has explicitly approved a generic-inbox exception (§8). */
  genericOverrideApproved?: boolean
  /** Explicit contact confidence when the researcher supplied one. */
  contactConfidenceHint?: Confidence
}

export interface ScoringResult {
  score: number
  tier: Tier
  status: QualificationStatus
  companyFit: number
  contactFit: number
  intent: number
  dataQuality: number
  penalties: number
  roleFamily: RoleFamily
  roleGrade: 'EXACT' | 'INFLUENCER' | 'WRONG'
  contactConfidence: Confidence
  recurring: RecurringPotential
  emailIsGeneric: boolean
  titleClean: string
  titleInterpretation: string | null
  reasons: string[]
  disqualifiers: string[]
  hardFail: boolean
  /** True only when EVERY gate in §11 passes and the score clears threshold. */
  draftEligible: boolean
}

export const AUTOMATED_DRAFT_MIN = 70
export const PREFERRED_SEND_MIN = 75
export const TOP_PRIORITY_MIN = 85

export function tierForScore(score: number): Tier {
  if (score >= 85) return 'EXCELLENT'
  if (score >= 70) return 'GOOD'
  if (score >= 55) return 'WEAK'
  return 'BAD'
}

// ── Component: company fit (max 30) ──────────────────────────────────────────
function scoreCompanyFit(
  input: ScoringInput,
  reasons: string[],
  disq: string[],
): { points: number; penalty: number } {
  const cfg = SEGMENTS[input.segment]
  let points = 0
  let penalty = 0

  // Being in a target segment at all is worth the industry component.
  if (input.segment !== 'LOW_PRIORITY') {
    points += 10
    reasons.push(`Target segment: ${cfg.label}`)
  } else {
    disq.push('Non-core segment (interior/events/solo agent/spa) — no outbound quota')
  }

  const band = input.sizeBand
  if (band == null) {
    penalty += 10
    disq.push('No reliable company-size evidence')
  } else if (cfg.rejectBands.includes(band)) {
    penalty += 25
    disq.push(`Company size ${band} is below the floor for ${cfg.label}`)
  } else if (cfg.idealBands.includes(band)) {
    points += 10
    reasons.push(`Company size ${band} sits in the ideal band for this segment`)
  } else if (cfg.conditionalBands.includes(band)) {
    points += 5
    reasons.push(`Company size ${band} is workable with a documented exception`)
    // 5000+ without a direct exact buyer is a structural cold-outbound problem.
    if (band === '5000+' || band === '1001-5000') {
      const fam = roleFamilyForTitle(input.title ?? '')
      const grade = gradeRole(input.segment, fam, band)
      if (grade !== 'EXACT') {
        penalty += 20
        disq.push(`Enterprise-scale (${band}) without an exact named buyer — procurement barrier`)
      }
    }
  } else if (band === '5000+') {
    penalty += 20
    disq.push('5,000+ employees — deprioritized for cold outbound')
  }

  // Recurring use case: does the occasion actually repeat here?
  const groups = distinctSignalGroups(input.segment, input.signals)
  const rec = recurringPotential(input.segment, band, groups)
  if (rec === 'HIGH') {
    points += 10
    reasons.push('Strong recurring gifting use case')
  } else if (rec === 'MEDIUM') {
    points += 5
    reasons.push('Plausible but not yet proven recurring use case')
  } else {
    penalty += 20
    disq.push('Weak or unclear recurring gifting use case')
  }

  return { points: Math.min(points, 30), penalty }
}

// ── Component: contact fit (max 30) ──────────────────────────────────────────
function scoreContactFit(
  input: ScoringInput,
  reasons: string[],
  disq: string[],
): {
  points: number
  penalty: number
  hardFail: boolean
  roleFamily: RoleFamily
  roleGrade: 'EXACT' | 'INFLUENCER' | 'WRONG'
  contactConfidence: Confidence
  emailIsGeneric: boolean
  titleClean: string
  titleInterpretation: string | null
} {
  let points = 0
  let penalty = 0
  let hardFail = false

  const { title: titleClean, interpretation } = splitTitle(input.title)
  const hedged = isHedgedTitle(input.title)
  const roleFamily = roleFamilyForTitle(titleClean)
  const roleGrade = gradeRole(input.segment, roleFamily, input.sizeBand)

  // HARD FAIL — wrong department or unrecognizable role.
  if (roleGrade === 'WRONG') {
    hardFail = true
    disq.push(
      roleFamily === 'WRONG_DEPARTMENT'
        ? `Wrong department for this motion: "${titleClean}"`
        : `Role does not own or influence gifting for this segment: "${titleClean}"`,
    )
  } else if (roleGrade === 'EXACT') {
    points += 20
    reasons.push(`Exact buyer role for ${SEGMENTS[input.segment].label}: ${titleClean}`)
  } else {
    points += 12
    reasons.push(`Strong influencer role: ${titleClean}`)
  }

  // HARD FAIL — hedged contact (§9).
  let contactConfidence: Confidence = input.contactConfidenceHint ?? 'HIGH'
  if (hedged) {
    hardFail = true
    contactConfidence = 'LOW'
    disq.push('Hedged contact — the researcher could not confirm this is the right person')
  } else if (!titleClean) {
    hardFail = true
    contactConfidence = 'LOW'
    disq.push('No public title on record')
  } else if (looksLikeRoleNotName(input.personName)) {
    // A role string stored where a name belongs means we do not know who we
    // are writing to. The greeting degrades to "Hi there" and the named
    // decision-maker claim is false, so this belongs in contact research.
    hardFail = true
    contactConfidence = 'LOW'
    const stored = (input.personName ?? '').trim() || '(empty)'
    disq.push(`No named person on record — stored name "${stored}" is a role, not a person`)
  }
  if (contactConfidence === 'LOW' && !hedged) {
    penalty += 20
    disq.push('Low contact confidence')
  }

  // HARD FAIL — generic inbox, unless a human approved the exception (§8).
  const emailIsGeneric = isGenericEmail(input.email)
  if (emailIsGeneric) {
    if (input.genericOverrideApproved) {
      reasons.push('Generic inbox accepted under an explicit manual override')
    } else {
      hardFail = true
      disq.push(`Generic inbox (${(input.email || '').split('@')[0]}@) — no direct path to the named person`)
    }
  } else if (input.email) {
    points += 10
    reasons.push('Direct named business email')
  }

  return {
    points: Math.min(points, 30), penalty, hardFail,
    roleFamily, roleGrade, contactConfidence, emailIsGeneric,
    titleClean, titleInterpretation: interpretation,
  }
}

// ── Component: intent (max 30) ───────────────────────────────────────────────
/** Count of distinct evidence GROUPS — prevents double-counting two phrasings
 *  of the same underlying fact. */
export function distinctSignalGroups(segment: Segment, signals: ScoringSignal[]): number {
  const weights = SIGNAL_WEIGHTS[segment]
  const groups = new Set<string>()
  for (const s of signals) {
    const w = weights[s.signal_type as SignalType]
    if (w) groups.add(w.group)
  }
  return groups.size
}

function scoreIntent(
  input: ScoringInput,
  reasons: string[],
  disq: string[],
): { points: number; penalty: number } {
  const weights = SIGNAL_WEIGHTS[input.segment]
  // Best signal per group only — logically identical evidence counts once.
  const bestByGroup = new Map<string, { points: number; type: string }>()
  for (const s of input.signals) {
    const w = weights[s.signal_type as SignalType]
    if (!w) continue
    const prev = bestByGroup.get(w.group)
    if (!prev || w.points > prev.points) bestByGroup.set(w.group, { points: w.points, type: s.signal_type })
  }

  let points = 0
  for (const [, v] of bestByGroup) {
    points += v.points
    reasons.push(`Buying signal: ${v.type.replace(/_/g, ' ')}`)
  }

  let penalty = 0
  if (bestByGroup.size === 0) {
    penalty += 10
    disq.push('No meaningful buying-intent signal found')
  }
  return { points: Math.min(points, 30), penalty }
}

// ── Component: data quality (max 10) ─────────────────────────────────────────
function scoreDataQuality(input: ScoringInput, reasons: string[]): number {
  let points = 0
  if (input.sizeConfidence === 'HIGH') { points += 3; reasons.push('High-confidence firmographics') }
  if ((input.contactConfidenceHint ?? 'HIGH') === 'HIGH' && !isHedgedTitle(input.title)) points += 3
  if (input.officialSourceEvidence) { points += 2; reasons.push('Evidence from an official company source') }
  if (input.researchAgeDays != null && input.researchAgeDays <= 90) { points += 2; reasons.push('Research is fresh') }
  return Math.min(points, 10)
}

// ── Main ─────────────────────────────────────────────────────────────────────
export function scoreProspect(input: ScoringInput): ScoringResult {
  const reasons: string[] = []
  const disqualifiers: string[] = []

  const company = scoreCompanyFit(input, reasons, disqualifiers)
  const contact = scoreContactFit(input, reasons, disqualifiers)
  const intent = scoreIntent(input, reasons, disqualifiers)
  const dataQuality = scoreDataQuality(input, reasons)

  const gross = company.points + contact.points + intent.points + dataQuality
  const penalties = company.penalty + contact.penalty + intent.penalty
  const raw = gross - penalties
  const score = Math.max(0, Math.min(100, raw))

  const hardFail = contact.hardFail
  const tier: Tier = hardFail ? 'BAD' : tierForScore(score)

  const groups = distinctSignalGroups(input.segment, input.signals)
  const recurring = recurringPotential(input.segment, input.sizeBand, groups)

  // Deliverability gate — C/D grades never draft (existing rule, preserved).
  const grade = input.emailGrade
  const gradeOk = grade === 'A' || grade === 'B'
  if (!gradeOk && input.email) disqualifiers.push(`Email grade ${grade ?? 'unverified'} — not send-eligible`)

  // A missing NAME is a research task, not a rejection — unlike a wrong role,
  // which no amount of research will fix.
  const unnamedContact = contact.roleGrade !== 'WRONG' && looksLikeRoleNotName(input.personName)
  const status = deriveStatus(input, {
    hardFail, tier, emailIsGeneric: contact.emailIsGeneric, score, unnamedContact,
  })

  const draftEligible =
    !hardFail &&
    score >= AUTOMATED_DRAFT_MIN &&
    !contact.emailIsGeneric &&
    contact.contactConfidence === 'HIGH' &&
    gradeOk &&
    SEGMENTS[input.segment].autoSendable &&
    status === 'QUALIFIED'

  return {
    score, tier, status,
    companyFit: company.points,
    contactFit: contact.points,
    intent: intent.points,
    dataQuality,
    penalties,
    roleFamily: contact.roleFamily,
    roleGrade: contact.roleGrade,
    contactConfidence: contact.contactConfidence,
    recurring,
    emailIsGeneric: contact.emailIsGeneric,
    titleClean: contact.titleClean,
    titleInterpretation: contact.titleInterpretation,
    reasons,
    disqualifiers,
    hardFail,
    draftEligible,
  }
}

/**
 * Where does this prospect belong in the pool?
 *
 * The important case is NEEDS_CONTACT_RESEARCH: an excellent company whose only
 * published address is info@ is NOT discarded (§21). It is preserved so a later
 * pass can look for the real buyer, rather than being rediscovered from scratch.
 */
function deriveStatus(
  input: ScoringInput,
  ctx: {
    hardFail: boolean; tier: Tier; emailIsGeneric: boolean; score: number
    unnamedContact?: boolean
  },
): QualificationStatus {
  const cfg = SEGMENTS[input.segment]
  if (input.segment === 'LOW_PRIORITY') return 'LOW_PRIORITY'
  if (input.segment === 'PARTNERSHIP') return 'PARTNERSHIP'

  // A good company reachable only at a generic inbox is a research task, not a
  // rejection — provided the ONLY problem is the inbox.
  if (ctx.emailIsGeneric && !input.genericOverrideApproved) {
    const wouldBeStrong = ctx.score + 10 >= AUTOMATED_DRAFT_MIN
    return wouldBeStrong ? 'NEEDS_CONTACT_RESEARCH' : 'REJECTED'
  }

  // Right kind of role, but we never captured WHO holds it. Another contact
  // pass can find the person; the company itself is not disqualified.
  if (ctx.unnamedContact) {
    const wouldBeStrong = ctx.score + 20 >= AUTOMATED_DRAFT_MIN
    return wouldBeStrong ? 'NEEDS_CONTACT_RESEARCH' : 'REJECTED'
  }

  // No deliverable address. QUALIFIED must mean "ready for the outbound
  // queue", and a grade C/D or unverified address is not sendable — the v1
  // pipeline discarded these for exactly that reason. A strong company here is
  // a contact-research task, not a qualified lead.
  const gradeOk = input.emailGrade === 'A' || input.emailGrade === 'B'
  if (!gradeOk) {
    return ctx.score >= AUTOMATED_DRAFT_MIN ? 'NEEDS_CONTACT_RESEARCH' : 'REJECTED'
  }
  if (ctx.hardFail) return 'REJECTED'
  if (!cfg.autoSendable) return 'MANUAL_REVIEW'
  if (ctx.score >= AUTOMATED_DRAFT_MIN) return 'QUALIFIED'
  if (ctx.score >= 55) return 'MANUAL_REVIEW'
  return 'REJECTED'
}

// ── Hard qualification gates (§11) ───────────────────────────────────────────
export interface GateContext {
  suppressed: boolean
  isExistingCustomer: boolean
  companyAlreadyContacted: boolean
  hasQualificationEvidence: boolean
}

export interface GateResult { pass: boolean; failed: string[] }

/**
 * Every gate is mandatory. A high score cannot buy its way past any of these —
 * that is the whole point of separating gates from the score.
 */
export function checkHardGates(result: ScoringResult, input: ScoringInput, ctx: GateContext): GateResult {
  const failed: string[] = []

  if (result.hardFail) failed.push('Hard-fail condition on contact (wrong role, hedged, or generic inbox)')
  if (!SEGMENTS[input.segment].autoSendable) failed.push('Segment is not auto-sendable')
  if (result.recurring === 'LOW') failed.push('Recurring potential is LOW')
  if (input.sizeBand == null && input.segment !== 'VC_PLATFORM') {
    failed.push('No company-size evidence and no documented exception')
  }
  if (result.roleGrade === 'WRONG') failed.push('No relevant buyer or influencer identified')
  if (!input.email) failed.push('No business email')
  if (result.emailIsGeneric && !input.genericOverrideApproved) failed.push('Generic inbox without approved override')
  if (!(input.emailGrade === 'A' || input.emailGrade === 'B')) failed.push('Deliverability grade is not A or B')
  if (ctx.suppressed) failed.push('Address is suppressed')
  if (ctx.isExistingCustomer) failed.push('Already a customer')
  if (ctx.companyAlreadyContacted) failed.push('Company already contacted')
  if (!ctx.hasQualificationEvidence) failed.push('No stored qualification evidence')
  if (result.contactConfidence !== 'HIGH') failed.push('Contact confidence below HIGH')
  if (result.score < AUTOMATED_DRAFT_MIN) failed.push(`Score ${result.score} below threshold ${AUTOMATED_DRAFT_MIN}`)

  return { pass: failed.length === 0, failed }
}

// ── Ranked selection (§35) — replaces created_at FIFO ────────────────────────
export interface SelectableProspect {
  id: string
  qualification_tier: Tier | null
  qualification_score: number | null
  recurring_potential: RecurringPotential | null
  contact_fit_score: number | null
  intent_score: number | null
  data_quality_score: number | null
  qualified_at: string | null
  segment: Segment | null
}

const TIER_RANK: Record<Tier, number> = { EXCELLENT: 0, GOOD: 1, WEAK: 2, BAD: 3 }
const RECUR_RANK: Record<RecurringPotential, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 }

/**
 * Deterministic and auditable: identical input always produces identical order.
 * Excellent strictly before Good; Weak/Bad are never returned at all.
 */
export function rankForSend(rows: SelectableProspect[]): SelectableProspect[] {
  return rows
    .filter(r => r.qualification_tier === 'EXCELLENT' || r.qualification_tier === 'GOOD')
    .slice()
    .sort((a, b) => {
      const t = TIER_RANK[a.qualification_tier!] - TIER_RANK[b.qualification_tier!]
      if (t) return t
      const s = (b.qualification_score ?? 0) - (a.qualification_score ?? 0)
      if (s) return s
      const r = RECUR_RANK[a.recurring_potential ?? 'LOW'] - RECUR_RANK[b.recurring_potential ?? 'LOW']
      if (r) return r
      const c = (b.contact_fit_score ?? 0) - (a.contact_fit_score ?? 0)
      if (c) return c
      const i = (b.intent_score ?? 0) - (a.intent_score ?? 0)
      if (i) return i
      const d = (b.data_quality_score ?? 0) - (a.data_quality_score ?? 0)
      if (d) return d
      // Freshest qualification last-resort tiebreak, then id for total order.
      const q = (b.qualified_at ?? '').localeCompare(a.qualified_at ?? '')
      if (q) return q
      return a.id.localeCompare(b.id)
    })
}

/**
 * Apply segment quota to a ranked list without ever admitting a weaker lead to
 * fill a quota slot (§46). Under-filled segments simply yield their slots to
 * the next-best qualified prospect from any segment.
 */
export function applySegmentQuota(
  ranked: SelectableProspect[],
  quota: Partial<Record<Segment, number>>,
  limit: number,
): SelectableProspect[] {
  if (limit <= 0) return []
  const caps = new Map<string, number>()
  for (const [seg, pct] of Object.entries(quota)) {
    caps.set(seg, Math.max(0, Math.round((limit * (pct as number)) / 100)))
  }
  const picked: SelectableProspect[] = []
  const overflow: SelectableProspect[] = []
  const used = new Map<string, number>()

  for (const r of ranked) {
    if (picked.length >= limit) break
    const seg = r.segment ?? 'UNKNOWN'
    const cap = caps.get(seg)
    const u = used.get(seg) ?? 0
    if (cap == null || u < cap) {
      picked.push(r)
      used.set(seg, u + 1)
    } else {
      overflow.push(r)
    }
  }
  // Backfill from the best remaining, preserving rank order — quality first.
  for (const r of overflow) {
    if (picked.length >= limit) break
    picked.push(r)
  }
  return picked.slice(0, limit)
}
