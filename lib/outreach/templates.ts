import { unsubscribeUrl } from '../unsubscribe'
import type { PitchTrack, TrackAssignment } from './targeting'

// ── FROZEN TEMPLATES ─────────────────────────────────────────────────────────
// Stored VERBATIM per Emily's 2026-08-14 spec. These are never AI-modified —
// personalization is variable fill ONLY ({first_name} fallback "there",
// {company}). Any copy change is a human edit to this file, reviewed in git.
// Subject variants A/B alternate evenly for A/B testing. Never mention any
// city in body copy (enforced by violatesCityBan() at draft time).

export interface FrozenTemplate {
  track: PitchTrack
  subjectA: string
  subjectB: string
  body: string
}

export const FROZEN_TEMPLATES: Record<PitchTrack, FrozenTemplate> = Object.freeze({
  EMPLOYEE_GIFTING: {
    track: 'EMPLOYEE_GIFTING',
    subjectA: 'When someone on your team has a baby',
    subjectB: 'The gift {company} sends when a baby arrives',
    body: `Hi {first_name},

When someone at {company} has a baby, someone — often you — ends up scrambling for a gift that doesn't look like it came from a supermarket, on a deadline.

Petite Lavande makes hand-packed organic gift boxes for exactly this: a knit blanket, handmade keepsakes, and — unusually — a self-care layer for the new mother, not just the baby. Boxes run $65–165, we can add your logo on the ribbon, and a standing account means one email from you and it ships with a handwritten card.

Reply and I'll send a sample box for your team to evaluate — no commitment.

Emily
Founder, Petite Lavande`,
  },
  CLIENT_GIFTING: {
    track: 'CLIENT_GIFTING',
    subjectA: "Your client's biggest life moment",
    subjectB: 'A better gift than the fruit basket',
    body: `Hi {first_name},

When a client's family welcomes a baby, the gift you send is remembered longer than almost anything else you'll do that year — and a generic basket is remembered for the wrong reason.

Petite Lavande makes hand-packed organic gift boxes: heirloom-quality knits, handmade keepsakes, and thoughtful pieces for the new mother herself. Each ships with a handwritten card in your words. $85–165 — a small line item for how it lands.

Reply and I'll send a sample so you can judge it in person.

Emily
Founder, Petite Lavande`,
  },
  PARTNER: {
    track: 'PARTNER',
    subjectA: 'A premium organic baby box for your catalog',
    subjectB: 'Filling the baby-gift gap in your lineup',
    body: `Hi {first_name},

If your clients ever ask for a new-baby gift, you know the options are either mass-market baskets or DIY assembly.

Petite Lavande produces hand-packed organic mother-and-baby gift boxes — heirloom knits, handmade keepsakes, postpartum self-care — retailing $65–165, with co-branded ribbon available for your clients' logos. We handle packing and fulfillment; you keep the client relationship.

Reply for a line sheet and a sample box.

Emily
Founder, Petite Lavande`,
  },
  REFERRAL_PARTNER: {
    track: 'REFERRAL_PARTNER',
    subjectA: 'For when families ask you "what should we get her?"',
    subjectB: 'A gift recommendation your clients will thank you for',
    body: `Hi {first_name},

Families trust you through birth — and they ask you what actually helps afterward. Most baby gifts skip the mother entirely.

Petite Lavande makes organic gift boxes built around postpartum care: sitz soak, botanical bath melts, silk sleep mask, alongside heirloom pieces for baby. I'd love to send you one to see — and set you up with a referral code so families you send get a small discount (and you can see it's the real thing first).

Reply with your address and I'll get one out this week.

Emily
Founder, Petite Lavande`,
  },
})

/** Tracks a weekly batch splits into for an industry. BOTH → 50/50 employee/client. */
export function tracksForAssignment(a: TrackAssignment): PitchTrack[] {
  return a === 'BOTH' ? ['EMPLOYEE_GIFTING', 'CLIENT_GIFTING'] : [a]
}

/** Deterministic track pick: rotation → industry → track (+ 50/50 split for
 *  BOTH by position in the industry's batch). */
export function pickTrack(assignment: TrackAssignment, industrySlot: number): PitchTrack {
  const tracks = tracksForAssignment(assignment)
  return tracks[industrySlot % tracks.length]
}

export type SubjectVariant = 'A' | 'B'

/** Variants alternate evenly WITHIN a track (a per-track slot index) — keyed
 *  per track so the BOTH split can't confound the A/B comparison. */
export function subjectVariantForSlot(trackSlot: number): SubjectVariant {
  return trackSlot % 2 === 0 ? 'A' : 'B'
}

// ── Rendering: string substitution ONLY, fixed fallback rules ────────────────
// {first_name} → falls back to "there"; {company} → required (a prospect
// without a company name is unusable — caller must skip it).

export interface RenderResult { subject: string; body: string; variant: SubjectVariant }

// Role words that sometimes arrive where a person's name should be — "Hi
// Office," is worse than the honest fallback "Hi there,".
const GENERIC_NAME_TOKENS = new Set([
  'office', 'team', 'info', 'admin', 'hr', 'hello', 'contact', 'front',
  'reception', 'careers', 'sales', 'support', 'staff', 'manager', 'director',
])

export function renderFrozenTemplate(
  tpl: FrozenTemplate,
  variant: SubjectVariant,
  fields: { first_name?: string | null; company: string },
): RenderResult | { error: string } {
  const company = (fields.company ?? '').trim()
  if (!company) return { error: 'missing company' }
  let firstName = (fields.first_name ?? '').trim()
  if (!/^[A-Za-zÀ-ÿ'’-]{2,}$/.test(firstName) || GENERIC_NAME_TOKENS.has(firstName.toLowerCase())) firstName = ''
  if (!firstName) firstName = 'there'

  const fill = (s: string) =>
    s.replace(/\{first_name\}/g, firstName).replace(/\{company\}/g, company)

  const subject = fill(variant === 'A' ? tpl.subjectA : tpl.subjectB)
  const body = fill(tpl.body)

  // Nothing unresolved may survive (guards against template typos).
  const leftover = (subject + body).match(/\{[a-z_]+\}/)
  if (leftover) return { error: `unresolved variable ${leftover[0]}` }
  return { subject, body, variant }
}

// ── CAN-SPAM footer: real business mailing address + unsubscribe link ────────
// Appended to every rendered body. Address comes from BUSINESS_ADDRESS
// (street, city, state ZIP) — sending without it is a CAN-SPAM violation, so
// the caller must treat a null footer as "do not send".

export function outreachFooter(recipientEmail: string): string | null {
  const address = (process.env.BUSINESS_ADDRESS || '').replace(/[\r\n]+/g, ', ').trim()
  if (!address || /\[.*\]/.test(address)) return null   // unset or still the placeholder
  const unsub = `${unsubscribeUrl(recipientEmail)}&k=o`  // k=o → outreach suppression, not just flow opt-out
  return `\n\n—\nPetite Lavande · ${address}\nUnsubscribe: ${unsub}\nOr just reply STOP and we won't email you again.`
}
