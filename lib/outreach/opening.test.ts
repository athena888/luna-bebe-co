// node --test lib/outreach/opening.test.ts   (npm test)
// The researched opening is the only sentence that proves we looked at a
// company. These tests enforce that it can never be fabricated.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildOpening, openingSource, NON_JUSTIFYING_SIGNALS } from './opening.ts'
import { templateFor, renderTemplateV3, findBannedContent } from './templates-v3.ts'

const sig = (t: string) => ({ signal_type: t, confidence: 'HIGH' as const })

test('no evidence produces no opening — and therefore no first touch', () => {
  assert.equal(buildOpening({ company: 'Acme', segment: 'EMPLOYEE_GIFTING', signals: [] }), null)
  assert.equal(openingSource({ company: 'Acme', segment: 'EMPLOYEE_GIFTING', signals: [] }), null)
})

test('generic corroboration alone never justifies an email', () => {
  // A careers page or an office list says nothing about gifting.
  for (const weak of NON_JUSTIFYING_SIGNALS) {
    const got = buildOpening({ company: 'Acme', segment: 'EMPLOYEE_GIFTING', signals: [sig(weak)] })
    assert.equal(got, null, `${weak} must not justify an opening`)
  }
})

test('the strongest signal wins regardless of input order', () => {
  const strongFirst = buildOpening({
    company: 'Acme', segment: 'EMPLOYEE_GIFTING',
    signals: [sig('corporate_gifting_page'), sig('people_hr_function')],
  })
  const strongLast = buildOpening({
    company: 'Acme', segment: 'EMPLOYEE_GIFTING',
    signals: [sig('people_hr_function'), sig('corporate_gifting_page')],
  })
  assert.equal(strongFirst, strongLast)
  assert.match(strongFirst ?? '', /corporate gifting programme/)
})

test('every opening names the real company and states only the observed fact', () => {
  const cases: Array<[string, RegExp]> = [
    ['parental_leave_benefit', /paid parental leave policy/],
    ['family_office', /family office/],
    ['platform_team', /platform team/],
    ['family_law_practice', /family law practice/],
    ['concierge_service', /concierge/],
  ]
  for (const [type, expect] of cases) {
    const out = buildOpening({ company: 'Northgate Systems', segment: 'EMPLOYEE_GIFTING', signals: [sig(type)] })
    assert.ok(out, `${type} should produce an opening`)
    assert.match(out!, /Northgate Systems/)
    assert.match(out!, expect)
    // No numbers, superlatives or claims we cannot back.
    assert.ok(!/\b\d+%|\bbest\b|\bleading\b|\btop \d/i.test(out!), `${type} opening must not editorialize: ${out}`)
  }
})

test('openings survive the banned-content guard', () => {
  const types = ['corporate_gifting_page', 'parental_leave_benefit', 'family_office', 'platform_team', 'estate_planning_practice']
  for (const t of types) {
    const out = buildOpening({ company: 'Acme', segment: 'EMPLOYEE_GIFTING', signals: [sig(t)] })!
    assert.equal(findBannedContent(out), null, `${t}: ${out}`)
  }
})

test('a rendered first touch carries the evidence sentence verbatim', () => {
  const opening = buildOpening({
    company: 'Stackline', segment: 'EMPLOYEE_GIFTING', signals: [sig('parental_leave_benefit')],
  })!
  const tpl = templateFor('EMPLOYEE_GIFTING', 0)!
  const r = renderTemplateV3(tpl, 'A', { first_name: 'Dana', company: 'Stackline', opening })
  assert.equal(r.ok, true)
  if (r.ok) {
    assert.ok(r.body.includes(opening), 'the researched sentence must appear intact')
    assert.equal(findBannedContent(r.body), null)
    assert.match(r.body, /Would it be useful if I sent over our corporate lookbook and pricing\?/)
  }
})

test('follow-ups need no opening — they add operational information instead', () => {
  for (const step of [1, 2] as const) {
    const tpl = templateFor('EMPLOYEE_GIFTING', step)!
    const r = renderTemplateV3(tpl, 'A', { first_name: 'Dana', company: 'Stackline' })
    assert.equal(r.ok, true, `step ${step} must render without an opening`)
    if (r.ok) assert.ok(!r.body.includes('{opening}'))
  }
})

test('openings differ across segments so the copy is never one-size-fits-all', () => {
  const employee = buildOpening({ company: 'Acme', segment: 'EMPLOYEE_GIFTING', signals: [sig('parental_leave_benefit')] })
  const wealth = buildOpening({ company: 'Acme', segment: 'WEALTH_CLIENT', signals: [sig('family_office')] })
  const vc = buildOpening({ company: 'Acme', segment: 'VC_PLATFORM', signals: [sig('platform_team')] })
  assert.notEqual(employee, wealth)
  assert.notEqual(wealth, vc)
})

// ── Named-person gate (§8) ───────────────────────────────────────────────────
// The v1 prospector stored real rows with person_name = "People Operations
// Manager". That is a role, not a person: we do not know who we are writing to.
import { scoreProspect, type ScoringInput } from './scoring.ts'
import { looksLikeRoleNotName } from './icp.ts'

test('role strings stored as names are detected', () => {
  for (const bad of [
    'People Operations Manager', 'People Ops Lead', 'Head of People',
    'Office Manager', 'Marketing Team', 'Acme Inc', 'info', 'Dana', '',
  ]) assert.equal(looksLikeRoleNotName(bad), true, `${bad} should not count as a name`)

  for (const good of ['Alexis Martinez', 'Dana Reed', 'Sarah Chen', "Siobhán O'Neill"]) {
    assert.equal(looksLikeRoleNotName(good), false, `${good} should count as a name`)
  }
})

test('an unnamed contact cannot be drafted, but the company is not rejected', () => {
  const base: ScoringInput = {
    segment: 'EMPLOYEE_GIFTING', company: 'Stackline', domain: 'stackline.com',
    title: 'People Operations Manager', email: 'people@stackline.com',
    emailGrade: 'A', sizeBand: '201-500', sizeConfidence: 'HIGH',
    officialSourceEvidence: true, researchAgeDays: 0,
    signals: [
      { signal_type: 'parental_leave_benefit', confidence: 'HIGH' },
      { signal_type: 'people_hr_function', confidence: 'HIGH' },
    ],
  }
  const unnamed = scoreProspect({ ...base, personName: 'People Operations Manager' })
  assert.equal(unnamed.draftEligible, false)
  assert.equal(unnamed.status, 'NEEDS_CONTACT_RESEARCH', 'a good company must be kept for another contact pass')
  assert.ok(unnamed.disqualifiers.some(d => /is a role, not a person/.test(d)))

  const named = scoreProspect({ ...base, personName: 'Alexis Martinez', email: 'alexis.martinez@stackline.com' })
  assert.equal(named.draftEligible, true)
  assert.equal(named.status, 'QUALIFIED')
})

test('a wrong role stays rejected even when a real name is present', () => {
  // Research can find the right person; it cannot make an engineer the buyer.
  const r = scoreProspect({
    segment: 'EMPLOYEE_GIFTING' as const, company: 'Acme', domain: 'acme.com',
    title: 'VP of Engineering', personName: 'Dana Reed', email: 'dana.reed@acme.com',
    emailGrade: 'A', sizeBand: '201-500', sizeConfidence: 'HIGH',
    officialSourceEvidence: true, researchAgeDays: 0,
    signals: [{ signal_type: 'parental_leave_benefit', confidence: 'HIGH' }],
  })
  assert.equal(r.status, 'REJECTED')
})

test('QUALIFIED requires a deliverable address — grade C/D becomes contact research', () => {
  // v1 discarded grade-D prospects because the address was unusable. A great
  // company with no reachable address is a research task, not a qualified lead.
  const base: ScoringInput = {
    segment: 'EMPLOYEE_GIFTING', company: 'Yext', domain: 'yext.com',
    title: 'Head of People', personName: 'Alexis Martinez',
    email: 'alexis.martinez@yext.com', emailGrade: 'A',
    sizeBand: '201-500', sizeConfidence: 'HIGH',
    officialSourceEvidence: true, researchAgeDays: 0,
    signals: [
      { signal_type: 'parental_leave_benefit', confidence: 'HIGH' },
      { signal_type: 'people_hr_function', confidence: 'HIGH' },
    ],
  }
  assert.equal(scoreProspect(base).status, 'QUALIFIED')

  for (const grade of ['C', 'D', null] as const) {
    const r = scoreProspect({ ...base, emailGrade: grade })
    assert.equal(r.status, 'NEEDS_CONTACT_RESEARCH', `grade ${grade} must not be QUALIFIED`)
    assert.equal(r.draftEligible, false)
  }
})
