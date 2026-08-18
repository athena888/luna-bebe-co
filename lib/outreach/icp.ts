// ICP definition for Petite Lavande B2B outbound — PURE DATA, no model calls,
// no I/O. This is the single source of truth for who we contact and why.
//
// Governing principle: a company consumes outbound reputation only when it has
// a believable reason to send new-parent gifts REPEATEDLY, is structurally
// capable of buying them, and we can reach the person who owns that decision.
//
// Explicitly NOT used as signals: any attribute of individual people —
// age, family status, pregnancy, ethnicity, religion, or whether employees are
// likely to have children. Only business- and role-level facts appear here.

// ── Size bands ───────────────────────────────────────────────────────────────
export const SIZE_BANDS = [
  '1-10', '11-25', '26-50', '51-100', '101-200',
  '201-500', '501-1000', '1001-5000', '5000+',
] as const
export type SizeBand = typeof SIZE_BANDS[number]

const BAND_RANGE: Record<SizeBand, [number, number]> = {
  '1-10': [1, 10], '11-25': [11, 25], '26-50': [26, 50], '51-100': [51, 100],
  '101-200': [101, 200], '201-500': [201, 500], '501-1000': [501, 1000],
  '1001-5000': [1001, 5000], '5000+': [5001, 1_000_000],
}

/** Band for a researched range. Uses the midpoint so a wide range lands in the
 *  band it mostly overlaps. Returns null when there is no usable evidence —
 *  an honest unknown, never a guess. */
export function bandForRange(min: number | null, max: number | null): SizeBand | null {
  if (min == null && max == null) return null
  const lo = min ?? max!
  const hi = max ?? min!
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi < 1) return null
  const mid = (lo + hi) / 2
  for (const b of SIZE_BANDS) {
    const [bl, bh] = BAND_RANGE[b]
    if (mid >= bl && mid <= bh) return b
  }
  return mid > 5000 ? '5000+' : null
}

export function bandMidpoint(band: SizeBand): number {
  const [lo, hi] = BAND_RANGE[band]
  return band === '5000+' ? 7500 : (lo + hi) / 2
}

// ── Segments ─────────────────────────────────────────────────────────────────
export type Segment =
  | 'EMPLOYEE_GIFTING'
  | 'WEALTH_CLIENT'
  | 'VC_PLATFORM'
  | 'LAW_PROFESSIONAL'
  | 'PARTNERSHIP'      // fertility/health — separate motion, never the HR template
  | 'LOW_PRIORITY'     // interior/events/solo realtors/spas — kept, never quota'd

export interface SegmentConfig {
  key: Segment
  label: string
  priority: number              // higher wins when two segments both match
  /** Bands that score full company-fit points. */
  idealBands: SizeBand[]
  /** Bands allowed only with a documented exception (see exceptionRule). */
  conditionalBands: SizeBand[]
  /** Bands that are an automatic company-fit failure. */
  rejectBands: SizeBand[]
  exceptionRule: string
  /** Default quota share of the outbound queue, percent (§24). */
  quotaPercent: number
  /** Whether this segment may be drafted/sent automatically at all. */
  autoSendable: boolean
}

export const SEGMENTS: Record<Segment, SegmentConfig> = {
  EMPLOYEE_GIFTING: {
    key: 'EMPLOYEE_GIFTING',
    label: 'Employee new-parent gifting',
    priority: 100,
    idealBands: ['51-100', '101-200', '201-500', '501-1000'],
    conditionalBands: ['26-50', '1001-5000'],
    rejectBands: ['1-10', '11-25'],
    exceptionRule:
      '26-50 allowed with evidence of a real People/HR function. 1001-5000 allowed only with an exact named buyer, a direct inbox, and benefits/employee-experience evidence. 5000+ deprioritized: procurement complexity and incumbent vendors sink cold outbound.',
    quotaPercent: 45,
    autoSendable: true,
  },
  WEALTH_CLIENT: {
    key: 'WEALTH_CLIENT',
    label: 'Private wealth / family office client gifting',
    priority: 90,
    idealBands: ['26-50', '51-100', '101-200', '201-500'],
    conditionalBands: ['11-25', '501-1000'],
    rejectBands: ['1-10'],
    exceptionRule:
      '11-25 allowed when client value is very high (family office / UHNW) AND the decision-maker is directly reachable.',
    quotaPercent: 25,
    autoSendable: true,
  },
  VC_PLATFORM: {
    key: 'VC_PLATFORM',
    label: 'VC / PE investment platform',
    priority: 85,
    // Size matters less than whether a real platform function exists.
    idealBands: ['11-25', '26-50', '51-100', '101-200', '201-500'],
    conditionalBands: ['1-10', '501-1000'],
    rejectBands: [],
    exceptionRule:
      'Headcount is weakly predictive for funds. Company fit is driven by evidence of an actual platform/portfolio-operations function, not size.',
    quotaPercent: 15,
    autoSendable: true,
  },
  LAW_PROFESSIONAL: {
    key: 'LAW_PROFESSIONAL',
    label: 'Select law / professional services',
    priority: 80,
    idealBands: ['26-50', '51-100', '101-200', '201-500', '501-1000'],
    conditionalBands: ['11-25', '1001-5000'],
    rejectBands: ['1-10'],
    exceptionRule:
      'Two distinct motions: EMPLOYEE (larger firm, People/HR buyer) or CLIENT (family/estate/private-client/fertility-adjacent practice). A general commercial firm with neither is not a prospect.',
    quotaPercent: 15,
    autoSendable: true,
  },
  PARTNERSHIP: {
    key: 'PARTNERSHIP',
    label: 'Fertility / health partnership & patient gifting',
    priority: 40,
    idealBands: ['11-25', '26-50', '51-100', '101-200'],
    conditionalBands: ['1-10', '201-500'],
    rejectBands: [],
    exceptionRule:
      'Qualified and stored only. Never receives the employee-HR template and never auto-sends — its messaging is a separate motion that does not exist yet (§7).',
    quotaPercent: 0,
    autoSendable: false,
  },
  LOW_PRIORITY: {
    key: 'LOW_PRIORITY',
    label: 'Low priority / non-core',
    priority: 0,
    idealBands: [],
    conditionalBands: [],
    rejectBands: [],
    exceptionRule:
      'Interior design, events, solo realtors, spas, small creative studios. Retained for the record, never given outbound quota. Luxury real estate escapes only with a sizable team, systematic client gifting, an ops/client-experience buyer, and a direct email.',
    quotaPercent: 0,
    autoSendable: false,
  },
}

// ── Role families ────────────────────────────────────────────────────────────
export type RoleFamily =
  | 'PEOPLE_HR'            // exact buyer for employee gifting
  | 'EMPLOYEE_EXPERIENCE'
  | 'WORKPLACE_OFFICE'
  | 'CLIENT_EXPERIENCE'    // exact buyer for wealth/client gifting
  | 'PLATFORM_PORTFOLIO'   // exact buyer for VC
  | 'CHIEF_OF_STAFF'
  | 'OPS_LEADERSHIP'
  | 'FIRM_LEADERSHIP'      // managing partner / owner — good only at small firms
  | 'ADVISOR'              // individual wealth advisor — conditional
  | 'PRACTICE_OWNER'       // partnership segment
  | 'WRONG_DEPARTMENT'     // hard fail
  | 'UNKNOWN'

/** Ordered: FIRST match wins, so put the most specific patterns first. */
const ROLE_PATTERNS: Array<{ family: RoleFamily; re: RegExp }> = [
  // Wrong department — checked FIRST so "VP of Engineering" can never be read
  // as leadership. These are hard fails regardless of seniority.
  { family: 'WRONG_DEPARTMENT', re: /\b(engineer|engineering|developer|cto|chief technology|architect|devops|data scientist|designer|design director|principal designer|recruit(er|ing)|talent acquisition|sales|account executive|business development|bizdev|cfo|chief financial|controller|chief investment|portfolio manager|counsel|paralegal|attorney at law|associate attorney|intern|coordinator|assistant to|receptionist|patient access|scheduler|nurse|physician|clinical|esthetician|stylist|photographer|event producer|producer)\b/i },
  { family: 'PEOPLE_HR', re: /\b(chief people|head of people|vp,? (of )?people|vice president,? (of )?people|people operations|head of hr|hr director|director of (people|hr|human resources)|vp,? (of )?(hr|human resources)|human resources (director|manager|lead|business partner)|chro|people business partner|head of talent(?! acquisition)|total rewards|benefits (director|manager|lead))\b/i },
  { family: 'EMPLOYEE_EXPERIENCE', re: /\b(employee experience|people experience|employee engagement|culture (director|manager|lead)|head of culture)\b/i },
  { family: 'WORKPLACE_OFFICE', re: /\b(workplace experience|workplace (director|manager)|office manager|head of workplace|facilities (director|manager)|studio manager|practice manager|firm administrator|office administrator)\b/i },
  { family: 'CLIENT_EXPERIENCE', re: /\b(chief client|client experience|client service(s)? (director|manager|lead)|director of client|head of client|client relations|client engagement|chief marketing.*client)\b/i },
  { family: 'PLATFORM_PORTFOLIO', re: /\b(head of platform|platform (director|manager|lead|partner)|portfolio (operations|services|talent|development)|founder experience|community (director|manager|lead)|head of community|talent partner|operating partner)\b/i },
  { family: 'CHIEF_OF_STAFF', re: /\bchief of staff\b/i },
  { family: 'OPS_LEADERSHIP', re: /\b(chief operating officer|\bcoo\b|head of operations|director of operations|operations director|vp,? (of )?operations)\b/i },
  { family: 'FIRM_LEADERSHIP', re: /\b(managing partner|managing shareholder|managing director|founding partner|named partner|firm chair|owner|founder|president|chief executive|\bceo\b|principal(?!\s*(designer|interior)))\b/i },
  { family: 'ADVISOR', re: /\b(wealth advisor|financial advisor|private wealth|senior advisor|relationship manager|general partner|\bgp\b|broker|realtor|real estate agent)\b/i },
  { family: 'PRACTICE_OWNER', re: /\b(clinic director|practice owner|medical director|doula|midwife)\b/i },
]

export function roleFamilyForTitle(title: string): RoleFamily {
  const t = (title || '').trim()
  if (!t) return 'UNKNOWN'
  for (const { family, re } of ROLE_PATTERNS) if (re.test(t)) return family
  return 'UNKNOWN'
}

/** Per-segment role scoring. EXACT = the person who owns the budget line;
 *  INFLUENCER = plausibly shapes it; WRONG = hard fail. */
export type RoleGrade = 'EXACT' | 'INFLUENCER' | 'WRONG'

const SEGMENT_ROLES: Record<Segment, { exact: RoleFamily[]; influencer: RoleFamily[] }> = {
  EMPLOYEE_GIFTING: {
    exact: ['PEOPLE_HR', 'EMPLOYEE_EXPERIENCE'],
    influencer: ['WORKPLACE_OFFICE', 'CHIEF_OF_STAFF'],
  },
  WEALTH_CLIENT: {
    exact: ['CLIENT_EXPERIENCE'],
    influencer: ['CHIEF_OF_STAFF', 'OPS_LEADERSHIP', 'FIRM_LEADERSHIP'],
  },
  VC_PLATFORM: {
    exact: ['PLATFORM_PORTFOLIO'],
    influencer: ['CHIEF_OF_STAFF', 'PEOPLE_HR', 'OPS_LEADERSHIP'],
  },
  LAW_PROFESSIONAL: {
    exact: ['PEOPLE_HR', 'CLIENT_EXPERIENCE'],
    influencer: ['WORKPLACE_OFFICE', 'OPS_LEADERSHIP', 'FIRM_LEADERSHIP'],
  },
  PARTNERSHIP: {
    exact: ['PRACTICE_OWNER'],
    influencer: ['FIRM_LEADERSHIP', 'OPS_LEADERSHIP'],
  },
  LOW_PRIORITY: { exact: [], influencer: [] },
}

/**
 * Grade a role for a segment.
 *
 * FIRM_LEADERSHIP is deliberately size-sensitive: a Managing Partner at a
 * 30-person firm genuinely signs off on client gifts; the CEO of a 900-person
 * company does not read cold email about baby boxes. ADVISOR is conditional in
 * exactly the same way (§5 Segment B).
 */
export function gradeRole(
  segment: Segment,
  family: RoleFamily,
  band: SizeBand | null,
): RoleGrade {
  if (family === 'WRONG_DEPARTMENT' || family === 'UNKNOWN') return 'WRONG'
  const cfg = SEGMENT_ROLES[segment]
  if (cfg.exact.includes(family)) return 'EXACT'

  const smallFirm = band != null && bandMidpoint(band) <= 100

  if (family === 'FIRM_LEADERSHIP') {
    if (!cfg.influencer.includes(family)) return 'WRONG'
    return smallFirm ? 'INFLUENCER' : 'WRONG'
  }
  if (family === 'ADVISOR') {
    // Only ever conditional, only in wealth, only at a genuinely small firm.
    return segment === 'WEALTH_CLIENT' && smallFirm ? 'INFLUENCER' : 'WRONG'
  }
  if (cfg.influencer.includes(family)) return 'INFLUENCER'
  return 'WRONG'
}

// ── Generic inbox detection (§8, hard gate) ──────────────────────────────────
export const GENERIC_LOCAL_PARTS = [
  'info', 'hello', 'contact', 'contactus', 'office', 'admin', 'team', 'support',
  'sales', 'marketing', 'studio', 'reception', 'appointments', 'general',
  'enquiries', 'inquiries', 'help', 'mail', 'email', 'careers', 'jobs', 'hr',
  'press', 'media', 'newbusiness', 'new-business', 'clientservices', 'client',
  'welcome', 'ask', 'connect', 'talk', 'frontdesk', 'front-desk', 'hi',
  'contacto', 'service', 'services', 'booking', 'bookings', 'orders', 'billing',
  'accounts', 'accounting', 'legal', 'privacy', 'webmaster', 'postmaster',
  'noreply', 'no-reply', 'donotreply',
] as const

const GENERIC_SET = new Set<string>(GENERIC_LOCAL_PARTS)

export function isGenericEmail(email: string | null | undefined): boolean {
  const local = (email || '').toLowerCase().split('@')[0]?.trim()
  if (!local) return false
  // Strip common separators so "info.us" / "hello-team" are still generic.
  const normalized = local.replace(/[._-]/g, '')
  if (GENERIC_SET.has(local) || GENERIC_SET.has(normalized)) return true
  // A local part that is ONLY a role word plus digits, e.g. "info2".
  return /^(info|hello|contact|office|admin|team|sales|support)\d*$/.test(normalized)
}

// ── Machine-generated addresses (hard gate) ─────────────────────────────────
// The published-email scraper grades any address found on a company's own site
// as A, including machine addresses that reach no human. A real example:
//   015d5ce7dd3142cd8fca094a50adbf69@d.dropbox.com
// picked up for a Chief People Officer. It is not a role account, so the
// generic-inbox check misses it entirely — it is a relay/tracking hash.
export function looksLikeMachineAddress(email: string | null | undefined): boolean {
  const e = (email || '').toLowerCase().trim()
  const [local, domain] = e.split('@')
  if (!local || !domain) return false

  // A long hex run is the classic generated-identifier shape.
  if (/^[0-9a-f]{16,}$/.test(local)) return true
  // UUID, with or without dashes.
  if (/^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/.test(local)) return true
  // Long, vowel-free and unpronounceable — no human picks this.
  if (local.length >= 14 && !/[aeiou]/.test(local.replace(/[._-]/g, ''))) return true
  // Mostly digits.
  if (local.length >= 10 && (local.replace(/\D/g, '').length / local.length) > 0.6) return true
  // Bounce/relay subdomains used by transactional infrastructure.
  if (/^(d|em|mail|bounce|bounces|reply|replies|mailer|smtp|notifications?|no-?reply)\./.test(domain)) return true

  return false
}

// ── Hedged-contact detection (§9, hard gate) ─────────────────────────────────
// The old prospector wrote its own uncertainty into the title field, e.g.
// "CFO (closest to Platform/Operations lead)". Those must never auto-draft.
const HEDGE_PATTERNS = [
  /closest\s+(to|identified|available|senior|match)/i,
  /\bclosest\b/i,
  /appears?\s+to\s+(handle|manage|own|lead)/i,
  /likely\s+(equivalent|responsible|handles|the)/i,
  /best\s+(available|guess|match)\s+contact/i,
  /\bbest available\b/i,
  /probabl[ey]/i,
  /\bassumed\b/i,
  /\bunconfirmed\b/i,
  /\bpossibly\b/i,
  /\bcited as\b/i,
  /\bor equivalent\b/i,
  /\bmay handle\b/i,
  /\bcould be\b/i,
]

export function isHedgedTitle(title: string | null | undefined): boolean {
  const t = (title || '').trim()
  if (!t) return false
  return HEDGE_PATTERNS.some(re => re.test(t))
}

/**
 * Split a stored title into the person's real public title and any AI
 * commentary. The parenthetical is only treated as commentary when it actually
 * reads like a hedge — "Partner, Wealth Advisor (CFP)" keeps its credential.
 */
export function splitTitle(raw: string | null | undefined): { title: string; interpretation: string | null } {
  const t = (raw || '').trim()
  if (!t) return { title: '', interpretation: null }
  const m = t.match(/^(.*?)\s*\(([^)]*)\)\s*$/)
  if (!m) return { title: t, interpretation: null }
  const [, head, inner] = m
  const innerIsHedge = HEDGE_PATTERNS.some(re => re.test(inner))
  if (!innerIsHedge) return { title: t, interpretation: null }
  return { title: head.trim(), interpretation: inner.trim() }
}

// ── Is this actually a person's name? (§8 named decision-maker) ─────────────
// The v1 prospector sometimes stored a ROLE where a name belongs — real rows
// include person_name = "People Operations Manager" and "People Ops Lead".
// Those are not named contacts: we do not know who we are writing to, the
// greeting degrades to "Hi there", and the "named decision-maker" claim is
// false. Treated as an unnamed contact, which fails the contact gate.
const ROLE_WORDS = /\b(manager|director|head|lead|officer|president|partner|founder|owner|chief|vp|vice|coordinator|administrator|specialist|associate|analyst|operations|people|talent|human|resources|marketing|sales|client|office|studio|team|staff|department|admin|contact|info|group|firm|company|llc|inc)\b/i

/**
 * True when the stored "name" reads as a role/company rather than a person.
 * Conservative: a real name containing a role word (e.g. "Bill Partner") is
 * rare, and erring toward manual research is the safer failure.
 */
export function looksLikeRoleNotName(name: string | null | undefined): boolean {
  const n = (name || '').trim()
  if (!n) return true
  if (ROLE_WORDS.test(n)) return true
  // A single token is not a full name we can verify.
  if (n.split(/\s+/).length < 2) return true
  // Must read as words, not an address or identifier.
  if (/[@\d_]/.test(n)) return true
  return false
}

// ── Signal taxonomy (§12) ────────────────────────────────────────────────────
export const SIGNAL_TYPES = [
  // Employee-gifting evidence
  'parental_leave_benefit', 'new_parent_support', 'employee_benefits_page',
  'people_hr_function', 'employee_recognition', 'milestone_gifting',
  'employee_experience_team', 'workplace_experience',
  // Client-gifting evidence
  'corporate_gifting_page', 'client_gifting_program', 'client_experience_positioning',
  'concierge_service', 'hnw_family_model', 'family_office',
  // VC evidence
  'platform_team', 'portfolio_services', 'founder_community', 'talent_network',
  // Law evidence
  'family_law_practice', 'private_client_practice', 'estate_planning_practice',
  'fertility_adoption_practice',
  // Neutral firmographic corroboration
  'headcount_evidence', 'careers_page', 'office_locations',
] as const
export type SignalType = typeof SIGNAL_TYPES[number]

/** Points per signal type, per segment. Logically identical evidence shares a
 *  group so it can never be double-counted (§10). */
export interface SignalWeight { points: number; group: string }

export const SIGNAL_WEIGHTS: Record<Segment, Partial<Record<SignalType, SignalWeight>>> = {
  EMPLOYEE_GIFTING: {
    // A company already running a gifting programme has the budget line and
    // the habit — that is directly relevant to employee gifting, not only to
    // the client motion. (Remitly is a real example.)
    corporate_gifting_page:   { points: 10, group: 'gifting_program' },
    parental_leave_benefit:   { points: 10, group: 'benefits' },
    new_parent_support:       { points: 10, group: 'benefits' },
    employee_benefits_page:   { points: 6,  group: 'benefits' },
    employee_recognition:     { points: 8,  group: 'recognition' },
    milestone_gifting:        { points: 8,  group: 'recognition' },
    people_hr_function:       { points: 6,  group: 'people_infra' },
    employee_experience_team: { points: 6,  group: 'people_infra' },
    workplace_experience:     { points: 4,  group: 'people_infra' },
  },
  WEALTH_CLIENT: {
    client_gifting_program:        { points: 10, group: 'client_gifting' },
    corporate_gifting_page:        { points: 10, group: 'client_gifting' },
    hnw_family_model:              { points: 8,  group: 'hnw' },
    family_office:                 { points: 8,  group: 'hnw' },
    client_experience_positioning: { points: 6,  group: 'cx' },
    concierge_service:             { points: 6,  group: 'cx' },
  },
  VC_PLATFORM: {
    platform_team:      { points: 8, group: 'platform' },
    portfolio_services: { points: 8, group: 'platform' },
    founder_community:  { points: 6, group: 'community' },
    talent_network:     { points: 6, group: 'community' },
    people_hr_function: { points: 6, group: 'people_infra' },
  },
  LAW_PROFESSIONAL: {
    family_law_practice:         { points: 10, group: 'family_practice' },
    private_client_practice:     { points: 8,  group: 'family_practice' },
    estate_planning_practice:    { points: 8,  group: 'family_practice' },
    fertility_adoption_practice: { points: 10, group: 'family_practice' },
    client_gifting_program:      { points: 10, group: 'client_gifting' },
    people_hr_function:          { points: 6,  group: 'people_infra' },
    parental_leave_benefit:      { points: 8,  group: 'benefits' },
    employee_recognition:        { points: 6,  group: 'recognition' },
  },
  PARTNERSHIP: {
    client_experience_positioning: { points: 6, group: 'cx' },
    concierge_service:             { points: 6, group: 'cx' },
  },
  LOW_PRIORITY: {},
}

// ── Geography (§25, §47) ─────────────────────────────────────────────────────
// Priority markets, not a permanent boundary. The system is designed to expand
// nationally; a metro not listed here is allowed, it simply gets no priority
// bonus. Nothing in the pipeline restricts discovery to this list.
export const PRIORITY_METROS = [
  'Seattle', 'San Francisco', 'New York', 'Boston', 'San Diego', 'Miami',
  'Los Angeles', 'Austin', 'Chicago', 'Denver', 'Atlanta',
  'Washington DC', 'Dallas', 'Philadelphia', 'Minneapolis',
] as const

/** Metros are a discovery convenience, never a qualification gate. */
export function isPriorityMetro(metro: string | null | undefined): boolean {
  const m = (metro || '').trim().toLowerCase()
  return PRIORITY_METROS.some(p => p.toLowerCase() === m)
}

// ── Recurring potential (§37) ────────────────────────────────────────────────
export type RecurringPotential = 'HIGH' | 'MEDIUM' | 'LOW'

/**
 * How likely is this account to buy AGAIN, rather than once?
 * Driven by structural capacity (headcount / model) plus evidence that the
 * gifting occasion actually recurs at this company.
 */
export function recurringPotential(
  segment: Segment,
  band: SizeBand | null,
  signalGroups: number,
): RecurringPotential {
  if (segment === 'LOW_PRIORITY') return 'LOW'
  const mid = band ? bandMidpoint(band) : null

  if (segment === 'EMPLOYEE_GIFTING') {
    // Births scale with headcount; below ~50 people the occasion is too rare
    // to build a standing account on.
    if (mid != null && mid >= 200 && signalGroups >= 1) return 'HIGH'
    if (mid != null && mid >= 50) return signalGroups >= 1 ? 'HIGH' : 'MEDIUM'
    if (mid != null && mid >= 26) return 'MEDIUM'
    return 'LOW'
  }
  if (segment === 'WEALTH_CLIENT') {
    if (signalGroups >= 2 && mid != null && mid >= 26) return 'HIGH'
    if (signalGroups >= 1) return 'MEDIUM'
    return 'LOW'
  }
  if (segment === 'VC_PLATFORM') {
    // A fund with a real platform team gifts across the whole portfolio.
    if (signalGroups >= 2) return 'HIGH'
    if (signalGroups >= 1) return 'MEDIUM'
    return 'LOW'
  }
  if (segment === 'LAW_PROFESSIONAL') {
    if (signalGroups >= 2 && mid != null && mid >= 50) return 'HIGH'
    if (signalGroups >= 1) return 'MEDIUM'
    return 'LOW'
  }
  if (segment === 'PARTNERSHIP') return signalGroups >= 1 ? 'MEDIUM' : 'LOW'
  return 'LOW'
}

// ── Qualification status taxonomy (§49) ──────────────────────────────────────
export const QUALIFICATION_STATUSES = [
  'UNRESEARCHED', 'RESEARCHING', 'QUALIFIED', 'NEEDS_CONTACT_RESEARCH',
  'MANUAL_REVIEW', 'LOW_PRIORITY', 'PARTNERSHIP', 'REJECTED',
] as const
export type QualificationStatus = typeof QUALIFICATION_STATUSES[number]

export const ACCOUNT_STAGES = [
  'DISCOVERED', 'QUALIFIED', 'CONTACT_FOUND', 'DRAFTED', 'APPROVED', 'SENT',
  'DELIVERED', 'REPLIED', 'POSITIVE_REPLY', 'LOOKBOOK_REQUESTED',
  'SAMPLE_REQUESTED', 'QUOTE_REQUESTED', 'FIRST_ORDER', 'REPEAT_ORDER',
  'LOST', 'SUPPRESSED',
] as const
export type AccountStage = typeof ACCOUNT_STAGES[number]
