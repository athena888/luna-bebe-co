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
