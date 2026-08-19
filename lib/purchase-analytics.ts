// Pure decisions for the Stripe → order → analytics pipeline. Kept free of
// Stripe/Supabase imports so lib/stripe-webhook-handler.ts stays the only
// place with side effects and these rules are unit-testable (see
// purchase-analytics.test.ts).

/** The slice of a Stripe Checkout Session the decisions need. */
export interface CompletedSessionLike {
  livemode?: boolean | null
  payment_status?: string | null
  metadata?: Record<string, string> | null | undefined
}

export type OrderAdvanceDecision =
  | { advance: true }
  | { advance: false; reason: 'no-order-id' | 'not-paid' | 'no-order-row' | 'already-advanced' }

/**
 * Should a checkout.session.completed / async_payment_succeeded event advance
 * the order (pending → processing) and run first-transition side effects?
 *
 * - `no-order-id`: not one of ours (gift cards are handled earlier).
 * - `not-paid`: Stripe fires `completed` for async payment methods (Klarna
 *   etc.) while payment_status is still `unpaid` — the purchase is NOT
 *   confirmed until `async_payment_succeeded` arrives. Reaching the success
 *   URL proves nothing either; only payment_status === 'paid' does.
 * - `already-advanced`: webhook replays and duplicate deliveries — the order
 *   already left `pending`, so nothing may run twice. An order id that
 *   matches no row (existingStatus == null) also refuses to advance: the
 *   UPDATE would touch zero rows and side effects would run for a phantom.
 */
export function orderAdvanceDecision(
  session: CompletedSessionLike,
  existingStatus: string | null | undefined,
): OrderAdvanceDecision {
  if (!session.metadata?.order_id) return { advance: false, reason: 'no-order-id' }
  if (session.payment_status !== 'paid') return { advance: false, reason: 'not-paid' }
  if (existingStatus == null) return { advance: false, reason: 'no-order-row' }
  if (existingStatus !== 'pending') return { advance: false, reason: 'already-advanced' }
  return { advance: true }
}

/**
 * May this event emit production analytics (GA4 MP purchase/refund, Meta
 * CAPI)? Only live-mode Stripe events qualify: test-mode events forwarded by
 * `stripe listen` during development were landing in production GA4 as
 * revenue. Strict `=== true` so a hand-built payload without the field is
 * treated as test.
 */
export function purchaseAnalyticsAllowed(livemode: boolean | null | undefined): boolean {
  return livemode === true
}
