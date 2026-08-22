// node --test lib/outreach/scoring.test.ts   (npm test)
// Deterministic fixtures only — no network, no database, no model calls.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  scoreProspect, checkHardGates, rankForSend, applySegmentQuota,
  tierForScore, distinctSignalGroups, AUTOMATED_DRAFT_MIN,
  type ScoringInput, type SelectableProspect,
} from './scoring.ts'
import {
  isGenericEmail, isHedgedTitle, splitTitle, roleFamilyForTitle, gradeRole,
  bandForRange, recurringPotential,
} from './icp.ts'
import { followupDecision, classifyReply, looksLikeBounce, isHardBounce, extractReferredContact, stripQuoted } from './reply-rules.ts'
import { extractHeadcount, classifySegment, extractEvidence, qualifyRecord } from './qualify-v3.ts'
import { renderTemplateV3, templateFor, findBannedContent } from './templates-v3.ts'

// ── Fixture builder ──────────────────────────────────────────────────────────
const base = (over: Partial<ScoringInput> = {}): ScoringInput => ({
  segment: 'EMPLOYEE_GIFTING',
  company: 'Acme Software',
  domain: 'acme.com',
  title: 'Head of People',
  personName: 'Dana Reed',
  email: 'dana.reed@acme.com',
  emailGrade: 'A',
  sizeBand: '201-500',
  sizeConfidence: 'HIGH',
  officialSourceEvidence: true,
  researchAgeDays: 10,
  signals: [
    { signal_type: 'parental_leave_benefit', confidence: 'HIGH', source_url: 'https://acme.com/careers' },
    { signal_type: 'people_hr_function', confidence: 'HIGH', source_url: 'https://acme.com/about' },
  ],
  ...over,
})

// ── Generic inbox (§8) ───────────────────────────────────────────────────────
test('generic inbox detection covers role accounts and separator variants', () => {
  for (const e of [
    'info@x.com', 'hello@x.com', 'contact@x.com', 'office@x.com', 'admin@x.com',
    'team@x.com', 'support@x.com', 'sales@x.com', 'marketing@x.com', 'studio@x.com',
    'reception@x.com', 'appointments@x.com', 'general@x.com', 'new-business@x.com',
    'client.services@x.com', 'info2@x.com', 'INFO@X.COM',
  ]) assert.equal(isGenericEmail(e), true, `${e} should be generic`)

  for (const e of [
    'dana.reed@x.com', 'dreed@x.com', 'dana@x.com', 'sarah.chen@x.com', 'j.smith@x.com',
  ]) assert.equal(isGenericEmail(e), false, `${e} should NOT be generic`)
})

test('generic inbox is a hard fail and never draft-eligible', () => {
  const r = scoreProspect(base({ email: 'info@acme.com' }))
  assert.equal(r.emailIsGeneric, true)
  assert.equal(r.hardFail, true)
  assert.equal(r.tier, 'BAD')
  assert.equal(r.draftEligible, false)
  assert.ok(r.disqualifiers.some(d => /generic inbox/i.test(d)))
})

test('an otherwise-excellent company on a generic inbox goes to NEEDS_CONTACT_RESEARCH, not REJECTED', () => {
  // §21: do not lose good companies just because discovery found only info@.
  const r = scoreProspect(base({ email: 'info@acme.com' }))
  assert.equal(r.status, 'NEEDS_CONTACT_RESEARCH')
})

test('a weak company on a generic inbox is rejected outright', () => {
  const r = scoreProspect(base({
    email: 'info@acme.com', sizeBand: '11-25', signals: [], sizeConfidence: 'LOW',
  }))
  assert.equal(r.status, 'REJECTED')
})

test('generic inbox may pass only with an explicit approved override', () => {
  const r = scoreProspect(base({ email: 'info@acme.com', genericOverrideApproved: true }))
  assert.equal(r.hardFail, false)
  assert.equal(r.status, 'QUALIFIED')
})

// ── Hedged contacts (§9) ─────────────────────────────────────────────────────
test('hedged titles are detected', () => {
  for (const t of [
    'Chief Financial Officer (closest to Platform/Operations lead)',
    'Client Service Director (closest to Client Experience Manager)',
    'Team Lead / Operations (closest identified contact)',
    'Head of People (cited as People/Culture leader)',
    'VP Ops (appears to handle gifting)',
    'Director (likely equivalent role)',
    'Manager (best available contact)',
  ]) assert.equal(isHedgedTitle(t), true, `${t} should be hedged`)

  for (const t of [
    'Head of People', 'Chief People Officer', 'Wealth Advisor (CFP®)',
    'Partner, Wealth Advisor', 'VP, People',
  ]) assert.equal(isHedgedTitle(t), false, `${t} should NOT be hedged`)
})

test('hedged contact is a hard fail regardless of company quality', () => {
  const r = scoreProspect(base({ title: 'Head of People (closest identified contact)' }))
  assert.equal(r.hardFail, true)
  assert.equal(r.contactConfidence, 'LOW')
  assert.equal(r.draftEligible, false)
  assert.equal(r.tier, 'BAD')
})

test('title field is split so AI commentary never contaminates the real title', () => {
  const a = splitTitle('Chief Financial Officer (closest to Platform/Operations lead)')
  assert.equal(a.title, 'Chief Financial Officer')
  assert.equal(a.interpretation, 'closest to Platform/Operations lead')

  // A genuine credential is NOT commentary and must be preserved.
  const b = splitTitle('Wealth Advisor (CFP®)')
  assert.equal(b.title, 'Wealth Advisor (CFP®)')
  assert.equal(b.interpretation, null)
})

// ── Wrong role (§5) ──────────────────────────────────────────────────────────
test('wrong-department roles hard fail even with senior seniority', () => {
  for (const title of [
    'Chief Technology Officer', 'VP of Engineering', 'Software Engineer',
    'Chief Financial Officer', 'Sales Director', 'Account Executive',
    'Technical Recruiter', 'Principal Designer', 'Patient Access Coordinator',
    'Event Producer', 'Marketing Coordinator',
  ]) {
    const r = scoreProspect(base({ title }))
    assert.equal(r.hardFail, true, `${title} should hard fail`)
    assert.equal(r.draftEligible, false)
  }
})

test('exact People roles score the full contact points', () => {
  for (const title of [
    'Head of People', 'Chief People Officer', 'VP, People', 'HR Director',
    'Director of People Operations', 'People Operations Manager',
    'Employee Experience Manager', 'Total Rewards Director',
  ]) {
    const r = scoreProspect(base({ title }))
    assert.equal(r.roleGrade, 'EXACT', `${title} should be EXACT`)
    assert.equal(r.hardFail, false)
  }
})

test('CEO of a large company is wrong; managing partner of a small firm is an influencer', () => {
  const bigCeo = scoreProspect(base({ segment: 'WEALTH_CLIENT', title: 'Chief Executive Officer', sizeBand: '501-1000' }))
  assert.equal(bigCeo.roleGrade, 'WRONG')
  assert.equal(bigCeo.hardFail, true)

  const smallMp = scoreProspect(base({ segment: 'WEALTH_CLIENT', title: 'Managing Partner', sizeBand: '26-50' }))
  assert.equal(smallMp.roleGrade, 'INFLUENCER')
  assert.equal(smallMp.hardFail, false)
})

test('an ordinary wealth advisor qualifies only at a small firm', () => {
  const big = gradeRole('WEALTH_CLIENT', roleFamilyForTitle('Wealth Advisor'), '201-500')
  assert.equal(big, 'WRONG')
  const small = gradeRole('WEALTH_CLIENT', roleFamilyForTitle('Wealth Advisor'), '26-50')
  assert.equal(small, 'INFLUENCER')
  // ...and never in a segment where advisors do not own gifting.
  assert.equal(gradeRole('EMPLOYEE_GIFTING', roleFamilyForTitle('Wealth Advisor'), '26-50'), 'WRONG')
})

// ── Size bands (§14) ─────────────────────────────────────────────────────────
test('band mapping uses the range midpoint and refuses to guess', () => {
  assert.equal(bandForRange(200, 500), '201-500')
  assert.equal(bandForRange(25, 25), '11-25')
  assert.equal(bandForRange(1, 10), '1-10')
  assert.equal(bandForRange(6000, 9000), '5000+')
  assert.equal(bandForRange(null, null), null)
})

test('tiny companies are penalized out of employee gifting', () => {
  const r = scoreProspect(base({ sizeBand: '1-10' }))
  assert.ok(r.disqualifiers.some(d => /below the floor/i.test(d)))
  assert.ok(r.score < AUTOMATED_DRAFT_MIN)
})

test('enterprise scale without an exact buyer is penalized', () => {
  const withExact = scoreProspect(base({ sizeBand: '1001-5000', title: 'Chief People Officer' }))
  const withInfluencer = scoreProspect(base({ sizeBand: '1001-5000', title: 'Office Manager' }))
  assert.ok(withInfluencer.score < withExact.score)
  assert.ok(withInfluencer.disqualifiers.some(d => /procurement/i.test(d)))
})

test('unknown company size is penalized but no longer blocks the hard gate', () => {
  // Minimum order is one box, so "we could not find a headcount" is a research
  // gap, not a disqualification. It still costs points — it must never be
  // cheaper to leave size unresearched than to find it.
  const r = scoreProspect(base({ sizeBand: null, sizeConfidence: 'LOW' }))
  assert.ok(r.disqualifiers.some(d => /no reliable company-size/i.test(d)))
  assert.ok(r.score < scoreProspect(base()).score, 'unknown size must still cost points')
  const g = checkHardGates(r, base({ sizeBand: null }), {
    suppressed: false, isExistingCustomer: false,
    companyAlreadyContacted: false, hasQualificationEvidence: true,
  })
  assert.ok(!g.failed.some(f => /company-size evidence/i.test(f)), 'size must not be a hard gate')
})

// ── Per-segment scoring ──────────────────────────────────────────────────────
test('employee gifting: ideal company scores EXCELLENT and is draft-eligible', () => {
  const r = scoreProspect(base())
  assert.equal(r.tier, 'EXCELLENT')
  assert.ok(r.score >= 85, `score ${r.score}`)
  assert.equal(r.draftEligible, true)
  assert.equal(r.recurring, 'HIGH')
})

test('wealth: family office with client-experience evidence qualifies', () => {
  const r = scoreProspect(base({
    segment: 'WEALTH_CLIENT',
    company: 'Harbor Family Office',
    title: 'Chief Client Officer',
    sizeBand: '51-100',
    signals: [
      { signal_type: 'family_office', confidence: 'HIGH' },
      { signal_type: 'client_gifting_program', confidence: 'HIGH' },
      { signal_type: 'concierge_service', confidence: 'MEDIUM' },
    ],
  }))
  assert.equal(r.roleGrade, 'EXACT')
  assert.ok(r.score >= 85, `score ${r.score}`)
  assert.equal(r.recurring, 'HIGH')
})

test('VC: platform lead with portfolio evidence qualifies; a GP does not', () => {
  const platform = scoreProspect(base({
    segment: 'VC_PLATFORM', title: 'Head of Platform', sizeBand: '11-25',
    signals: [
      { signal_type: 'platform_team', confidence: 'HIGH' },
      { signal_type: 'founder_community', confidence: 'MEDIUM' },
    ],
  }))
  assert.equal(platform.roleGrade, 'EXACT')
  assert.ok(platform.draftEligible)

  const gp = scoreProspect(base({
    segment: 'VC_PLATFORM', title: 'General Partner', sizeBand: '11-25',
    signals: [{ signal_type: 'platform_team', confidence: 'HIGH' }],
  }))
  assert.equal(gp.hardFail, true)
})

test('law: family-law practice with a client-relations buyer qualifies', () => {
  const r = scoreProspect(base({
    segment: 'LAW_PROFESSIONAL', title: 'Director of Client Relations', sizeBand: '51-100',
    signals: [
      { signal_type: 'family_law_practice', confidence: 'HIGH' },
      { signal_type: 'private_client_practice', confidence: 'HIGH' },
    ],
  }))
  assert.equal(r.roleGrade, 'EXACT')
  assert.ok(r.score >= 70, `score ${r.score}`)
})

test('non-core segments are never auto-sendable', () => {
  const interior = scoreProspect(base({ segment: 'LOW_PRIORITY', title: 'Principal Designer', sizeBand: '1-10' }))
  assert.equal(interior.status, 'LOW_PRIORITY')
  assert.equal(interior.draftEligible, false)

  const fertility = scoreProspect(base({ segment: 'PARTNERSHIP', title: 'Clinic Director', sizeBand: '11-25' }))
  assert.equal(fertility.status, 'PARTNERSHIP')
  assert.equal(fertility.draftEligible, false)
})

// ── Intent signals ───────────────────────────────────────────────────────────
test('logically identical evidence is never double-counted', () => {
  // Both signals live in the "benefits" group — only the best one counts.
  const one = scoreProspect(base({
    signals: [{ signal_type: 'parental_leave_benefit', confidence: 'HIGH' }],
  }))
  const two = scoreProspect(base({
    signals: [
      { signal_type: 'parental_leave_benefit', confidence: 'HIGH' },
      { signal_type: 'new_parent_support', confidence: 'HIGH' },
      { signal_type: 'employee_benefits_page', confidence: 'MEDIUM' },
    ],
  }))
  assert.equal(distinctSignalGroups('EMPLOYEE_GIFTING', two.reasons.length ? [
    { signal_type: 'parental_leave_benefit' }, { signal_type: 'new_parent_support' },
  ] : []), 1)
  assert.equal(one.intent, two.intent, 'same group must not stack')
})

test('no intent signal at all is penalized', () => {
  const r = scoreProspect(base({ signals: [] }))
  assert.ok(r.disqualifiers.some(d => /no meaningful buying-intent/i.test(d)))
})

// ── Thresholds and gates (§10, §11) ──────────────────────────────────────────
test('tier thresholds match the specification', () => {
  // GOOD starts at 62 (was 70): a one-box minimum makes smaller, lower-scoring
  // accounts genuinely worth opening. EXCELLENT and the BAD floor are unchanged
  // — this lowers the bar a little, it does not remove it.
  assert.equal(tierForScore(100), 'EXCELLENT')
  assert.equal(tierForScore(85), 'EXCELLENT')
  assert.equal(tierForScore(84), 'GOOD')
  assert.equal(tierForScore(62), 'GOOD')
  assert.equal(tierForScore(61), 'WEAK')
  assert.equal(tierForScore(55), 'WEAK')
  assert.equal(tierForScore(54), 'BAD')
})

test('every mandatory gate can independently block a perfect-scoring lead', () => {
  const input = base()
  const r = scoreProspect(input)
  assert.equal(r.tier, 'EXCELLENT')

  const ok = checkHardGates(r, input, {
    suppressed: false, isExistingCustomer: false,
    companyAlreadyContacted: false, hasQualificationEvidence: true,
  })
  assert.equal(ok.pass, true, ok.failed.join('; '))

  for (const ctx of [
    { suppressed: true, isExistingCustomer: false, companyAlreadyContacted: false, hasQualificationEvidence: true },
    { suppressed: false, isExistingCustomer: true, companyAlreadyContacted: false, hasQualificationEvidence: true },
    { suppressed: false, isExistingCustomer: false, companyAlreadyContacted: true, hasQualificationEvidence: true },
    { suppressed: false, isExistingCustomer: false, companyAlreadyContacted: false, hasQualificationEvidence: false },
  ]) {
    assert.equal(checkHardGates(r, input, ctx).pass, false)
  }
})

test('deliverability grade C or D blocks drafting', () => {
  for (const g of ['C', 'D', null] as const) {
    const r = scoreProspect(base({ emailGrade: g }))
    assert.equal(r.draftEligible, false, `grade ${g} must not draft`)
  }
})

test('lowering the bar never re-opens the generic-inbox gate', () => {
  // The bar moved for COMPANY grade only. Contact identity is untouched: a
  // generic inbox still cannot draft without an approved override, whatever
  // the company scores.
  const r = scoreProspect(base({ email: 'info@northgatesystems.com' }))
  const g = checkHardGates(r, base({ email: 'info@northgatesystems.com' }), {
    suppressed: false, isExistingCustomer: false,
    companyAlreadyContacted: false, hasQualificationEvidence: true,
  })
  assert.equal(g.pass, false)
  assert.ok(g.failed.some(f => /generic inbox/i.test(f)), g.failed.join('; '))
})

test('a small firm with a real signal is now workable, an empty one is not', () => {
  // The point of the change: 12-person practice, named buyer, real signal.
  assert.equal(recurringPotential('LAW_PROFESSIONAL', '11-25', 1), 'MEDIUM')
  assert.equal(recurringPotential('EMPLOYEE_GIFTING', '11-25', 1), 'MEDIUM')
  // Unknown headcount plus a signal is "plausible", not "no".
  assert.equal(recurringPotential('EMPLOYEE_GIFTING', null, 1), 'MEDIUM')
  // But no signal at all is still LOW — the bar moved, it did not vanish.
  assert.equal(recurringPotential('EMPLOYEE_GIFTING', null, 0), 'LOW')
  assert.equal(recurringPotential('LOW_PRIORITY', '201-500', 5), 'LOW')
})

// ── Selection ordering (§35) ─────────────────────────────────────────────────
const sel = (over: Partial<SelectableProspect>): SelectableProspect => ({
  id: 'a', qualification_tier: 'GOOD', qualification_score: 70,
  recurring_potential: 'MEDIUM', contact_fit_score: 20, intent_score: 10,
  data_quality_score: 5, qualified_at: '2026-08-01', segment: 'EMPLOYEE_GIFTING', ...over,
})

test('Excellent always precedes Good regardless of insertion order', () => {
  const rows = [
    sel({ id: 'good-new', qualification_tier: 'GOOD', qualification_score: 84, qualified_at: '2026-08-18' }),
    sel({ id: 'exc-old', qualification_tier: 'EXCELLENT', qualification_score: 85, qualified_at: '2026-01-01' }),
  ]
  const ranked = rankForSend(rows)
  assert.equal(ranked[0].id, 'exc-old')
  assert.equal(ranked[1].id, 'good-new')
})

test('Weak and Bad are never selectable', () => {
  const ranked = rankForSend([
    sel({ id: 'w', qualification_tier: 'WEAK', qualification_score: 68 }),
    sel({ id: 'b', qualification_tier: 'BAD', qualification_score: 10 }),
  ])
  assert.equal(ranked.length, 0)
})

test('ranking is deterministic and never FIFO', () => {
  const rows = [
    sel({ id: 'c', qualification_score: 72, qualified_at: '2026-01-01' }),
    sel({ id: 'a', qualification_score: 80, qualified_at: '2026-08-01' }),
    sel({ id: 'b', qualification_score: 76, qualified_at: '2026-05-01' }),
  ]
  const once = rankForSend(rows).map(r => r.id)
  const twice = rankForSend(rows.slice().reverse()).map(r => r.id)
  assert.deepEqual(once, ['a', 'b', 'c'])
  assert.deepEqual(once, twice, 'order must not depend on input order')
})

test('segment quota never admits a weaker lead to fill a slot', () => {
  const rows = [
    ...Array.from({ length: 8 }, (_, i) => sel({
      id: `emp${i}`, qualification_tier: 'EXCELLENT', qualification_score: 90 - i, segment: 'EMPLOYEE_GIFTING',
    })),
    sel({ id: 'wealth1', qualification_tier: 'GOOD', qualification_score: 71, segment: 'WEALTH_CLIENT' }),
  ]
  const picked = applySegmentQuota(rankForSend(rows), { EMPLOYEE_GIFTING: 45, WEALTH_CLIENT: 25 }, 4)
  assert.equal(picked.length, 4)
  // Employee cap is 2 of 4; the remaining slots backfill with the next best
  // QUALIFIED leads, never with a Weak one.
  assert.ok(picked.every(p => p.qualification_tier === 'EXCELLENT' || p.qualification_tier === 'GOOD'))
})

// ── Follow-up suppression (§15) ──────────────────────────────────────────────
const now = new Date('2026-08-18T17:00:00Z')
const fu = (over: Partial<Parameters<typeof followupDecision>[0]> = {}) => followupDecision({
  prospectStatus: 'sent', sequenceStep: 0, lastSentAt: '2026-08-01T17:00:00Z',
  followupPausedReason: null, suppressed: false, isCustomer: false, ...over,
}, now)

test('follow-up proceeds only when nothing terminal has happened', () => {
  const d = fu()
  assert.equal(d.send, true)
  assert.equal(d.step, 1)
})

test('follow-ups stop on reply, bounce, unsubscribe, manual reply, suppression and conversion', () => {
  assert.equal(fu({ prospectStatus: 'replied' }).send, false)
  assert.equal(fu({ prospectStatus: 'bounced' }).send, false)
  assert.equal(fu({ prospectStatus: 'suppressed' }).send, false)
  assert.equal(fu({ suppressed: true }).send, false)
  assert.equal(fu({ isCustomer: true }).send, false)
  assert.equal(fu({ followupPausedReason: 'manual_conversation' }).send, false)
  assert.equal(fu({ followupPausedReason: 'reply:NOT_INTERESTED' }).send, false)
})

test('the sequence is capped at three total touches', () => {
  assert.equal(fu({ sequenceStep: 1 }).send, true)   // -> step 2
  assert.equal(fu({ sequenceStep: 2 }).send, false)  // sequence complete
  assert.equal(fu({ sequenceStep: 5 }).send, false)
})

test('follow-up timing is measured from the original send, not from today', () => {
  // §30: the historical 75 resume mid-sequence rather than restarting.
  const tooSoon = followupDecision({
    prospectStatus: 'sent', sequenceStep: 0, lastSentAt: '2026-08-17T17:00:00Z',
    followupPausedReason: null, suppressed: false, isCustomer: false,
  }, now)
  assert.equal(tooSoon.send, false)
  assert.match(tooSoon.reason, /too soon/)

  const due = followupDecision({
    prospectStatus: 'sent', sequenceStep: 0, lastSentAt: '2026-08-10T17:00:00Z',
    followupPausedReason: null, suppressed: false, isCustomer: false,
  }, now)
  assert.equal(due.send, true)
})

// ── Reply classification (§31) ───────────────────────────────────────────────
test('replies classify into the specified categories', () => {
  assert.equal(classifyReply('', 'Please send the lookbook and pricing'), 'POSITIVE')
  assert.equal(classifyReply('', 'Unsubscribe me from this list'), 'UNSUBSCRIBE')
  assert.equal(classifyReply('', 'I am out of the office until Monday'), 'AUTO_REPLY')
  assert.equal(classifyReply('', "I don't handle this — please contact Dana"), 'WRONG_PERSON')
  assert.equal(classifyReply('', 'Not interested, we already have a vendor'), 'NOT_INTERESTED')
  assert.equal(classifyReply('', 'Not right now, maybe next quarter'), 'NOT_NOW')
  assert.equal(classifyReply('', 'What sizes do the boxes come in?'), 'QUESTION')
})

test('an auto-reply outranks other phrasing so a vacation note is never a rejection', () => {
  assert.equal(classifyReply('Automatic reply', 'I am on parental leave and not interested in meetings'), 'AUTO_REPLY')
})

test('wrong-person replies capture the referred contact but never our own address', () => {
  const got = extractReferredContact(
    'Please contact dana@acme.com instead. cc hello@petitelavande.com',
    'petitelavande.com', 'sarah@acme.com',
  )
  assert.equal(got, 'dana@acme.com')
})

// ── Bounces ──────────────────────────────────────────────────────────────────
test('bounce notifications are recognized from sender or subject', () => {
  assert.equal(looksLikeBounce('mailer-daemon@googlemail.com', 'anything'), true)
  assert.equal(looksLikeBounce('someone@acme.com', 'Undeliverable: your message'), true)
  assert.equal(looksLikeBounce('dana@acme.com', 'Re: new-parent gifts'), false)
})

test('only hard bounces earn permanent suppression', () => {
  assert.equal(isHardBounce('550 5.1.1 The email account that you tried to reach does not exist'), true)
  assert.equal(isHardBounce('Address not found'), true)
  assert.equal(isHardBounce('452 4.2.2 Mailbox full, try again later'), false)
  assert.equal(isHardBounce('Your message was delayed'), false)
})

// ── Research extraction (§13, §14) ───────────────────────────────────────────
test('headcount extraction returns ranges and refuses to invent numbers', () => {
  assert.deepEqual(extractHeadcount('a 185-person SF agency'), { min: 185, max: 185, confidence: 'HIGH' })
  assert.deepEqual(extractHeadcount('between 200 and 500 employees'), { min: 200, max: 500, confidence: 'HIGH' })
  assert.equal(extractHeadcount('with ~25 employees founded in 2009').confidence, 'MEDIUM')
  assert.deepEqual(extractHeadcount('an award-winning studio'), { min: null, max: null, confidence: 'LOW' })
  // Qualitative hints are LOW confidence, never treated as fact.
  assert.equal(extractHeadcount('publicly traded on NASDAQ').confidence, 'LOW')
})

test('segment classification never uses the person title', () => {
  assert.equal(classifySegment({ companyDescription: 'a Seattle venture capital firm' }), 'VC_PLATFORM')
  assert.equal(classifySegment({ companyDescription: 'multi-family office serving UHNW families' }), 'WEALTH_CLIENT')
  assert.equal(classifySegment({ companyDescription: 'luxury interior design studio' }), 'LOW_PRIORITY')
  assert.equal(classifySegment({ companyDescription: 'fertility acupuncture clinic' }), 'PARTNERSHIP')
  assert.equal(classifySegment({ companyDescription: 'a family law firm for high-net-worth individuals' }), 'LAW_PROFESSIONAL')
})

test('fertility and interior businesses can never land in corporate employee gifting', () => {
  assert.equal(classifySegment({ category: 'beauty_fertility_health' }), 'PARTNERSHIP')
  assert.equal(classifySegment({ category: 'interior_events' }), 'LOW_PRIORITY')
})

test('evidence extraction only reports signals literally present in the text', () => {
  const found = extractEvidence('Named a Best Place to Work; offers 16 weeks of parental leave and a dedicated People team.', 'https://x.com/careers')
  const types = found.signals.map(s => s.signal_type)
  assert.ok(types.includes('parental_leave_benefit'))
  assert.ok(types.includes('people_hr_function'))
  assert.ok(!types.includes('family_office'))

  const empty = extractEvidence('An award-winning design studio.', null)
  assert.equal(empty.signals.filter(s => s.signal_type === 'parental_leave_benefit').length, 0)
})

test('end-to-end: a real audit-era record is scored honestly', () => {
  // Verbatim shape of a historical prospect the old system queued.
  const out = qualifyRecord({
    company: 'Hope Pinc Design',
    domain: 'hopepinc.com',
    category: 'interior_events',
    title: 'Principal Designer',
    email: 'hope@hopepinc.com',
    emailGrade: 'A',
    fitReason: 'Hope Pinc Design is a 13-time Best of Houzz winner and a LEED-certified San Diego studio.',
  })
  assert.equal(out.segment, 'LOW_PRIORITY')
  assert.equal(out.result.draftEligible, false)
  assert.equal(out.result.status, 'LOW_PRIORITY')
})

// ── Templates (§16, §18) ─────────────────────────────────────────────────────
test('a first touch without a researched opening cannot render', () => {
  const tpl = templateFor('EMPLOYEE_GIFTING', 0)!
  const bad = renderTemplateV3(tpl, 'A', { company: 'Acme', first_name: 'Dana' })
  assert.equal(bad.ok, false)

  const good = renderTemplateV3(tpl, 'A', {
    company: 'Acme', first_name: 'Dana', opening: 'Acme was named a Best Place to Work in 2025.',
  })
  assert.equal(good.ok, true)
  if (good.ok) {
    assert.match(good.body, /Hi Dana,/)
    assert.match(good.body, /Best Place to Work/)
    assert.ok(!/\{[a-z_]+\}/.test(good.body), 'no unresolved variables')
  }
})

test('role words never become a first name', () => {
  const tpl = templateFor('EMPLOYEE_GIFTING', 0)!
  const r = renderTemplateV3(tpl, 'A', { company: 'Acme', first_name: 'Office', opening: 'x.' })
  assert.equal(r.ok, true)
  if (r.ok) assert.match(r.body, /Hi there,/)
})

test('follow-ups exist for every auto-sendable segment and add new information', () => {
  for (const seg of ['EMPLOYEE_GIFTING', 'WEALTH_CLIENT', 'VC_PLATFORM', 'LAW_PROFESSIONAL'] as const) {
    for (const step of [0, 1, 2] as const) {
      const tpl = templateFor(seg, step)
      assert.ok(tpl, `${seg} step ${step} must exist`)
    }
    const f1 = templateFor(seg, 1)!
    const f2 = templateFor(seg, 2)!
    // No content-free bumps.
    assert.ok(!/just following up|bumping this|circling back/i.test(f1.body))
    assert.ok(!/just following up|bumping this|circling back/i.test(f2.body))
    // Final touch closes the loop politely.
    assert.match(f2.body, /close the loop/i)
  }
})

test('banned manipulation and unverifiable claims are rejected', () => {
  for (const bad of [
    'Only 3 spots left this month',
    'This offer expires Friday',
    'Trusted by hundreds of companies',
    'We work with Fortune 500 teams',
    '80% of companies see results',
    'As seen in Vogue',
    'Ask about our free sample',
    'finished with a wax seal',
  ]) assert.ok(findBannedContent(bad), `${bad} should be banned`)

  for (const tpl of templateFor('EMPLOYEE_GIFTING', 0) ? [
    templateFor('EMPLOYEE_GIFTING', 0)!, templateFor('WEALTH_CLIENT', 0)!,
    templateFor('VC_PLATFORM', 1)!, templateFor('LAW_PROFESSIONAL', 2)!,
  ] : []) {
    assert.equal(findBannedContent(tpl.body), null, `${tpl.segment} step ${tpl.step} must be clean`)
  }
})

// ── Recurring potential (§37) ────────────────────────────────────────────────
test('recurring potential reflects structural capacity, not prestige', () => {
  assert.equal(recurringPotential('EMPLOYEE_GIFTING', '201-500', 1), 'HIGH')
  assert.equal(recurringPotential('EMPLOYEE_GIFTING', '26-50', 2), 'MEDIUM')
  assert.equal(recurringPotential('EMPLOYEE_GIFTING', '1-10', 3), 'LOW')
  assert.equal(recurringPotential('LOW_PRIORITY', '201-500', 5), 'LOW')
  assert.equal(recurringPotential('VC_PLATFORM', '11-25', 2), 'HIGH')
})

test('fame is worth nothing — two identical profiles score identically', () => {
  // §36: a famous name must not earn points the evidence does not support.
  const famous = scoreProspect(base({ company: 'Stripe', domain: 'stripe.com' }))
  const unknown = scoreProspect(base({ company: 'Northgate Systems', domain: 'northgatesystems.com' }))
  assert.equal(famous.score, unknown.score)
})

// ── Quoted-history stripping (real incident, 2026-08-18) ────────────────────
// A reply reading "Thanks for sharing will reach out if the need arises!" was
// classified UNSUBSCRIBE and the prospect auto-suppressed, because our own
// CAN-SPAM footer ("Unsubscribe: ...") was quoted underneath their text.
test('our own footer quoted in a reply cannot trigger an unsubscribe', () => {
  const realReply = `Thanks for sharing will reach out if the need arises!

On Sat, Aug 15, 2026 at 9:02 AM Petite Lavande <hello@petitelavande.com> wrote:
> Hi Dana,
> ...
> —
> Petite Lavande · 123 Example St
> Unsubscribe: https://petitelavande.com/u?e=x&k=o
> Or just reply STOP and we won't email you again.`
  assert.equal(classifyReply('Re: new-parent gifts', realReply), 'NOT_NOW')
})

test('a genuine unsubscribe is still caught', () => {
  assert.equal(classifyReply('', 'Please unsubscribe me from this list.'), 'UNSUBSCRIBE')
  assert.equal(
    classifyReply('', 'take me off your list\n\nOn Mon, someone wrote:\n> Unsubscribe: http://x'),
    'UNSUBSCRIBE',
  )
})

test('quoted history never supplies the classification', () => {
  const body = `Sounds great, please send pricing.

On Mon, Aug 10, 2026 someone wrote:
> not interested
> unsubscribe`
  assert.equal(classifyReply('', body), 'POSITIVE')
})
