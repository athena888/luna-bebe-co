// Single source of truth for site-wide brand constants.
// Import this wherever you need the contact email, brand name, or site URL —
// so a future address change is a one-line edit.

export const CONTACT_EMAIL = 'hello@petitelavande.com'
export const BRAND_NAME = 'Petite Lavande'
export const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com'

// ── Policy constants ───────────────────────────────────────────────────────
// The Returns Policy page is the source of truth for returns; these constants
// exist so the FAQ, Terms, chat assistant and any future surface can never
// drift from it again (2026-08-14 audit found four different versions live).

/** Hours after placement in which an order can still be cancelled. */
export const CANCELLATION_WINDOW_HOURS = 24

/** One-sentence returns summary, safe to render anywhere. Mirrors
 *  /legal/returns: no change-of-mind returns after shipment; fulfillment
 *  problems are made right. Never promises a return window. */
export const RETURNS_SUMMARY =
  `Orders can be cancelled within ${CANCELLATION_WINDOW_HOURS} hours of placing them. Once a box has shipped we can't accept change-of-mind returns, because each one is assembled by hand to order. If anything arrives damaged, defective or incorrect, email ${CONTACT_EMAIL} and we'll put it right under our returns policy.`

export const RETURNS_SUMMARY_ES =
  `Puedes cancelar tu pedido dentro de las ${CANCELLATION_WINDOW_HOURS} horas posteriores a la compra. Una vez enviada la canastilla no aceptamos devoluciones por cambio de opinión, porque cada una se arma a mano por pedido. Si algo llega dañado, defectuoso o equivocado, escríbenos a ${CONTACT_EMAIL} y lo resolvemos según nuestra política de devoluciones.`

/**
 * Does this piece of copy promise something our returns policy does not?
 *
 * The constants above cover every answer WE write. They cannot cover copy that
 * arrives from the database — per-product FAQs, which the portal's AI SEO
 * generator drafts and an admin saves. Those are published verbatim into the
 * FAQPage structured data on /products/[id], which is exactly what Google
 * reads when it checks a Merchant listing against the landing page. One
 * generated line like "unopened boxes are returnable within 30 days" is enough
 * to contradict a Merchant return policy of "defective products only" — while
 * appearing nowhere in this repository, so no code search would ever find it.
 *
 * The patterns below flag only the claims we genuinely cannot honour, and are
 * deliberately narrow so our own correct wording never trips them:
 * "contact us within 7 days" (damaged goods) and "refunds are processed within
 * 3–5 business days" (money back, not goods back) both pass.
 *
 * Both languages, because a Spanish reader must never get a different policy
 * from an English one.
 */
const RETURNS_CONFLICT_PATTERNS: RegExp[] = [
  // "returns within 30 days", "returnable within 30 days"
  /\breturn(?:s|able|ed|ing)?\b[^.!?]{0,40}\bwithin\s+\d+\s*(?:[-–]\s*\d+\s*)?days?\b/i,
  // "30-day returns", "30 day return policy"
  /\b\d+[-–\s]?day\b[^.!?]{0,30}\breturn/i,
  // A condition we never offer — the box either shipped or it did not.
  /\bunopened\b|\bun-opened\b|\bsin abrir\b|\bno abiertas?\b/i,
  /\bfree returns?\b|\bdevoluciones\s+grat(?:is|uitas)\b/i,
  /\bmoney[-\s]back\s+guarantee\b|\bgarant[ií]a\s+de\s+devoluci[oó]n\b/i,
  // "devoluciones dentro de 30 días" / "30 días para devoluciones"
  /\bdevoluci[oó]n(?:es)?\b[^.!?]{0,40}\b(?:dentro de|en)\s+\d+\s*d[ií]as\b/i,
  /\b\d+\s*d[ií]as\b[^.!?]{0,30}\bdevoluci/i,
]

/** True when `text` promises a return window, a free return, or a condition
 *  ("unopened") that /legal/returns does not offer. Empty text is fine. */
export function conflictsWithReturnsPolicy(text: string | null | undefined): boolean {
  const t = (text ?? '').trim()
  if (!t) return false
  return RETURNS_CONFLICT_PATTERNS.some(re => re.test(t))
}

/**
 * Who owner/admin alerts go to (payment gaps, restock, weekly scorecard).
 * ADMIN_EMAIL may hold SEVERAL comma-separated addresses — Resend needs them
 * as an array, and passing the raw comma string would silently address one
 * invalid recipient. Falls back to the contact address when unset.
 */
export function adminRecipients(): string[] {
  const list = (process.env.ADMIN_EMAIL ?? '')
    .split(',')
    .map(e => e.trim())
    .filter(Boolean)
  return list.length ? list : [CONTACT_EMAIL]
}

/**
 * Is this order OUR OWN traffic — a test, a staff purchase, an admin address?
 *
 * The browser tags its own hits `traffic_type: internal` (see the GA loader in
 * app/layout.tsx), but the server-side `purchase` event has no browser context,
 * so test orders were landing in GA4 as real revenue no matter what internal
 * filter was set. This decides that per order.
 *
 * Matches: any ADMIN_EMAIL address, the contact address, anything on the brand
 * domain, plus the usual test shapes (`checkout-test@…`, `you+test@…`). Extra
 * personal addresses can be listed in INTERNAL_EMAILS (comma-separated).
 */
export function isInternalEmail(email: string | null | undefined): boolean {
  const e = (email ?? '').trim().toLowerCase()
  if (!e) return false
  const listed = [
    ...adminRecipients(),
    ...(process.env.INTERNAL_EMAILS ?? '').split(','),
  ].map(x => x.trim().toLowerCase()).filter(Boolean)
  if (listed.includes(e)) return true
  if (e.endsWith('@petitelavande.com')) return true
  if (/^checkout-test@/.test(e)) return true
  if (/\+test\d*@/.test(e)) return true
  return false
}
