// THE customer-facing order reference. One derivation, used everywhere:
// confirmation page, confirmation email, refund email, packing slip, /track
// display AND the /track lookup.
//
// History (2026-08-16): four surfaces derived this four different ways —
// the confirmation page from the Stripe session id, the confirmation email and
// packing slip from `tracking_number` (a random UUID seeded at checkout), and
// /track from the order id. The customer was shown codes that matched nothing
// they could type into tracking. Anything that shows a reference must call
// this; never slice an id inline again.
//
// Dependency-free on purpose so lib/resend.ts can import it without pulling in
// Stripe or Supabase.

/** `#`-less reference: last 8 of the order id, uppercased. e.g. "E0F3D1F6". */
export function orderRef(orderId: string): string {
  return (orderId ?? '').slice(-8).toUpperCase()
}

/** True when a customer-typed reference identifies this order. Forgiving about
 *  a leading `#` and whitespace, since people paste it straight from an email. */
export function matchesOrderRef(orderId: string, typed: string): boolean {
  const ref = typed.trim().replace(/^#/, '').toUpperCase()
  if (!ref) return false
  return orderRef(orderId) === ref || (orderId ?? '').toUpperCase().includes(ref)
}
