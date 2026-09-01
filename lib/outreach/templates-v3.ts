// Segment-specific outbound copy — FROZEN, human-written, never AI-modified.
//
// Personalization is variable fill plus ONE researched opening sentence that
// the drafter supplies from stored evidence. The template body itself is fixed
// so length, claim-set and CTA are structural rather than hoped-for.
//
// Hard rules encoded here:
//  * No fake urgency, scarcity, deadlines, client names, or statistics (§18).
//  * Every follow-up ADDS information — no "just bumping this" (§15/§17).
//  * Sample offers are NOT promised in bulk copy (§16) — the business has no
//    defined sample-cost policy, so it surfaces as a manual option instead.
//  * Only factually supported B2B capabilities appear, drawn from the existing
//    `lookbook` config: logo gift tag +$2/box, printed cotton ribbon +$5/box,
//    1–2 week lead time for 25+ boxes, direct-to-recipient shipping.

// Kept free of database and env imports so the copy rules stay unit-testable.
// The CAN-SPAM footer lives in ./footer.ts because it needs the unsubscribe
// signer, which reaches the database.
import type { Segment } from './icp.ts'

export type SequenceStep = 0 | 1 | 2

export interface FrozenTemplateV3 {
  segment: Segment
  step: SequenceStep
  subjectA: string
  subjectB: string
  /** {opening} = researched sentence, {first_name}, {company} */
  body: string
}

const SIGNOFF = `Emily
Founder, Petite Lavande`

// ── Segment A — employee new-parent gifting ──────────────────────────────────
const EMPLOYEE: FrozenTemplateV3[] = [
  {
    segment: 'EMPLOYEE_GIFTING', step: 0,
    subjectA: 'when someone on your team has a baby',
    subjectB: 'new-parent gifts for the {company} team',
    body: `Hi {first_name},

{opening}

I'm Emily — I make organic gift boxes for new parents, and People teams send them when someone on the team has a baby. The part that tends to matter: they're built for the mother as much as the baby, so you're not piecing together a gift from three different places.

We ship directly to each parent with your team's card inside. Boxes run $65–145.

Would it be useful if I sent over our corporate lookbook and pricing?

${SIGNOFF}`,
  },
  {
    segment: 'EMPLOYEE_GIFTING', step: 1,
    subjectA: 're: new-parent gifts',
    subjectB: 'how the logistics actually work',
    body: `Hi {first_name},

Following up with the part most People teams ask about first: we ship directly to each recipient's home and include your personalized card, so there's no internal packing, no storing boxes in a supply closet, and nothing for your team to coordinate on the day.

You send one email with a name and address; we handle the rest. Lead time is 1–2 weeks for orders of 25+.

Happy to send the lookbook and pricing if that's useful.

${SIGNOFF}`,
  },
  {
    segment: 'EMPLOYEE_GIFTING', step: 2,
    subjectA: 'last note — customization options',
    subjectB: 'closing the loop',
    body: `Hi {first_name},

One last note, then I'll leave it be. For standing accounts we can add a company logo gift tag (+$2/box) or a printed cotton ribbon (+$5/box), so the gift reads as coming from {company} rather than from a shop.

If new-parent gifting isn't something you handle, no worries at all — I'll close the loop here and won't follow up again.

${SIGNOFF}`,
  },
]

// ── Segment B — private wealth / family office client gifting ────────────────
const WEALTH: FrozenTemplateV3[] = [
  {
    segment: 'WEALTH_CLIENT', step: 0,
    subjectA: "when a client's family grows",
    subjectB: 'client gifting for family milestones',
    body: `Hi {first_name},

{opening}

I'm Emily — I make organic gift boxes for new parents, and advisory firms send them when a client's family welcomes a baby. They're designed for the mother as much as the baby, which is usually what makes them land differently than the standard basket.

Each ships directly to the family with a handwritten card in your words. Boxes run $85–165.

Would it be useful if I sent you our gifting options and corporate pricing?

${SIGNOFF}`,
  },
  {
    segment: 'WEALTH_CLIENT', step: 1,
    subjectA: 're: client gifting',
    subjectB: 'how firms usually run this',
    body: `Hi {first_name},

Adding the practical piece: most firms keep a standing arrangement rather than ordering one at a time. You send the family's name and address when you hear the news, we ship directly to them with your card, and nothing sits in your office waiting.

That also means the gift arrives within days of the birth rather than weeks later.

Glad to send the options and pricing whenever useful.

${SIGNOFF}`,
  },
  {
    segment: 'WEALTH_CLIENT', step: 2,
    subjectA: 'last note from me',
    subjectB: 'closing the loop',
    body: `Hi {first_name},

Last note. For firms sending regularly we can add a printed cotton ribbon or gift tag with the firm's mark, so it reads as {company} without turning the gift into marketing material.

If client gifting isn't yours to handle, no problem — I'll close the loop here.

${SIGNOFF}`,
  },
]

// ── Segment C — VC / PE platform ─────────────────────────────────────────────
const VC: FrozenTemplateV3[] = [
  {
    segment: 'VC_PLATFORM', step: 0,
    subjectA: 'when a founder has a baby',
    subjectB: 'portfolio founder gifts',
    body: `Hi {first_name},

{opening}

I'm Emily — I make organic gift boxes for new parents, and platform teams send them when a portfolio founder welcomes a baby. They're built for the mother as much as the baby, which tends to be the difference between a gift that gets acknowledged and one that gets remembered.

We ship directly to the founder's home with your note inside. Boxes run $65–145.

Would it be useful if I sent over the lookbook and pricing?

${SIGNOFF}`,
  },
  {
    segment: 'VC_PLATFORM', step: 1,
    subjectA: 're: founder gifts',
    subjectB: 'the operational side',
    body: `Hi {first_name},

The logistics piece, since platform teams usually run lean: you send a name and address, we ship directly to the founder with your card. No inventory, no packing, nothing to track between funds or portfolios.

Lead time is 1–2 weeks for 25+ boxes if you'd rather set something up ahead of the year.

Happy to send the lookbook whenever useful.

${SIGNOFF}`,
  },
  {
    segment: 'VC_PLATFORM', step: 2,
    subjectA: 'last note — co-branding',
    subjectB: 'closing the loop',
    body: `Hi {first_name},

Last one from me. For funds sending across a portfolio we can add a logo gift tag (+$2/box) or printed cotton ribbon (+$5/box) so it reads as {company}.

If founder gifting sits with someone else, no worries — I'll close the loop here.

${SIGNOFF}`,
  },
]

// ── Segment D — select law / professional ────────────────────────────────────
const LAW: FrozenTemplateV3[] = [
  {
    segment: 'LAW_PROFESSIONAL', step: 0,
    subjectA: 'for client family milestones',
    subjectB: 'new-parent gifts, handled',
    body: `Hi {first_name},

{opening}

I'm Emily — I make organic gift boxes for new parents. Firms send them when a client's family grows, and they're designed for the mother as much as the baby, which is usually what makes them memorable rather than obligatory.

Each ships directly to the family with a handwritten card in your words. Boxes run $85–165.

Would it be useful if I sent you our gifting options and corporate pricing?

${SIGNOFF}`,
  },
  {
    segment: 'LAW_PROFESSIONAL', step: 1,
    subjectA: 're: client gifts',
    subjectB: 'how this usually runs',
    body: `Hi {first_name},

The practical part: we ship directly to the recipient with your card, so nothing needs to be stored, packed or coordinated by your admin team. You send a name and address when you hear the news.

Lead time is 1–2 weeks for 25+ boxes if the firm would rather set up a standing arrangement.

Glad to send options and pricing.

${SIGNOFF}`,
  },
  {
    segment: 'LAW_PROFESSIONAL', step: 2,
    subjectA: 'last note',
    subjectB: 'closing the loop',
    body: `Hi {first_name},

Last note from me. For firms sending regularly we can add a printed ribbon or gift tag with the firm's mark.

If this isn't something you handle, no problem at all — I'll close the loop here and won't follow up again.

${SIGNOFF}`,
  },
]

export const TEMPLATES_V3: FrozenTemplateV3[] = [...EMPLOYEE, ...WEALTH, ...VC, ...LAW]

export function templateFor(segment: Segment, step: SequenceStep): FrozenTemplateV3 | null {
  return TEMPLATES_V3.find(t => t.segment === segment && t.step === step) ?? null
}

// ── Rendering ────────────────────────────────────────────────────────────────
export type SubjectVariant = 'A' | 'B'

// Role words that arrive where a first name should be. "Hi Office," is worse
// than the honest fallback.
const GENERIC_NAME_TOKENS = new Set([
  'office', 'team', 'info', 'admin', 'hr', 'hello', 'contact', 'front',
  'reception', 'careers', 'sales', 'support', 'staff', 'manager', 'director',
  'people', 'the', 'to', 'whom',
])

export interface RenderInput {
  first_name?: string | null
  company: string
  /** One researched sentence. Required for step 0; ignored for follow-ups. */
  opening?: string | null
}

export type RenderOutput =
  | { ok: true; subject: string; body: string; variant: SubjectVariant }
  | { ok: false; error: string }

export function renderTemplateV3(
  tpl: FrozenTemplateV3,
  variant: SubjectVariant,
  fields: RenderInput,
): RenderOutput {
  const company = (fields.company ?? '').trim()
  if (!company) return { ok: false, error: 'missing company' }

  let firstName = (fields.first_name ?? '').trim()
  if (!/^[A-Za-zÀ-ÿ'’-]{2,}$/.test(firstName) || GENERIC_NAME_TOKENS.has(firstName.toLowerCase())) {
    firstName = ''
  }
  if (!firstName) firstName = 'there'

  let body = tpl.body
  if (body.includes('{opening}')) {
    const opening = (fields.opening ?? '').trim()
    // A first touch with no researched opening is not sendable — that sentence
    // is the only thing proving we looked at them at all.
    if (!opening) return { ok: false, error: 'missing researched opening sentence' }
    body = body.replace('{opening}', opening)
  }

  const fill = (s: string) =>
    s.replace(/\{first_name\}/g, firstName).replace(/\{company\}/g, company)

  const subject = fill(variant === 'A' ? tpl.subjectA : tpl.subjectB)
  body = fill(body)

  const leftover = (subject + body).match(/\{[a-z_]+\}/)
  if (leftover) return { ok: false, error: `unresolved variable ${leftover[0]}` }

  return { ok: true, subject, body, variant }
}

// ── Banned-content guard (§18) ───────────────────────────────────────────────
// Runs on every rendered body before queueing. Catches manipulation patterns
// and unverifiable social proof that must never appear in our copy.
const BANNED_PATTERNS: Array<{ re: RegExp; why: string }> = [
  { re: /\b(only|just)\s+\d+\s+(spots?|slots?|left|remaining)\b/i, why: 'fake scarcity' },
  { re: /\b(offer|deal|discount)\s+(ends|expires)\b/i, why: 'fake deadline' },
  { re: /\blimited time\b/i, why: 'fake urgency' },
  { re: /\bact (now|fast|today)\b/i, why: 'fake urgency' },
  { re: /\bfortune\s*(500|1000)\b/i, why: 'unverifiable client claim' },
  { re: /\b(hundreds|thousands) of (companies|teams|firms)\b/i, why: 'unverifiable volume claim' },
  { re: /\b\d+%\s+of\s+(companies|teams|our clients)\b/i, why: 'unverifiable statistic' },
  { re: /\btrusted by\b/i, why: 'unverifiable social proof' },
  { re: /\bas seen in\b/i, why: 'unverifiable press claim' },
  { re: /\bfree sample\b/i, why: 'sample offers require manual approval' },
  // Brand rule: the closure is a "signature seal", never "wax".
  { re: /\bwax seal\b/i, why: 'brand copy rule — use "signature seal"' },
]

export function findBannedContent(text: string): { pattern: string; why: string } | null {
  for (const { re, why } of BANNED_PATTERNS) {
    const m = text.match(re)
    if (m) return { pattern: m[0], why }
  }
  return null
}

// The CAN-SPAM footer is in ./footer.ts — see outreachFooterV3().
