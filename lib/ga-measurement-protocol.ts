// Server-side GA4 events via the Measurement Protocol — fired from the
// Stripe webhook so ad blockers can't erase revenue data. The ONLY place a
// purchase event exists (nothing fires client-side, so no double counting);
// transaction_id = order id makes GA dedupe replays regardless.
// Env: NEXT_PUBLIC_GA_ID (measurement id, already set) + GA4_API_SECRET
// (GA4 Admin → Data Streams → Measurement Protocol API secrets). Missing env →
// silent no-op; failures are logged and never block order processing.

interface PurchaseItem { id: string; name: string; price: number; qty?: number; category?: string }

export interface PurchaseEventInput {
  orderId: string
  valueCents: number
  currency?: string
  items?: PurchaseItem[]
  clientId?: string | null   // GA client id when known; falls back to a stable server id
  // Our own test/staff order — tagged so GA4's internal-traffic filter can
  // drop it. Browser hits get this from the loader in app/layout.tsx; a
  // server-sent purchase has no browser context, so it must be passed in or
  // test orders show up as real revenue.
  internal?: boolean
  sessionId?: string | null  // GA session id when known — ties the purchase to the real session
}

/** Pure payload builder — exported so tests can pin transaction_id, currency,
 *  value and item mapping without touching the network. */
export function buildPurchaseBody(input: PurchaseEventInput, baseUrl: string) {
  return {
    // Without the browser's _ga cookie we use the order id as client_id — the
    // event still lands with full revenue; attribution ties via transaction_id.
    client_id: input.clientId || `srv.${input.orderId}`,
    events: [{
      name: 'purchase',
      params: {
        transaction_id: input.orderId,
        value: input.valueCents / 100,
        currency: input.currency ?? 'USD',
        // MP events have no browser context — without these, purchases show as
        // "(not set)" in GA page/session reports.
        ...(input.sessionId ? { session_id: input.sessionId } : {}),
        ...(input.internal ? { traffic_type: 'internal' } : {}),
        engagement_time_msec: 100,
        page_location: `${baseUrl}/confirmation`,
        page_title: 'Order Confirmation | Petite Lavande',
        items: (input.items ?? []).map(i => ({
          item_id: i.id, item_name: i.name, price: i.price / 100, quantity: i.qty ?? 1, item_category: i.category,
        })),
      },
    }],
  }
}

async function postMp(body: unknown, label: string): Promise<void> {
  const measurementId = process.env.NEXT_PUBLIC_GA_ID
  const apiSecret = process.env.GA4_API_SECRET
  if (!measurementId || !apiSecret) return
  try {
    const res = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      },
    )
    if (!res.ok && res.status !== 204) console.error(`GA4 MP ${label} non-OK:`, res.status)
  } catch (e) {
    console.error(`GA4 MP ${label} failed (order unaffected):`, e)
  }
}

export async function sendPurchaseEvent(input: PurchaseEventInput): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com'
  await postMp(buildPurchaseBody(input, baseUrl), 'purchase')
}

/** GA4 `refund` with the ORIGINAL transaction_id — reverses the purchase in
 *  GA revenue reports instead of leaving refunded money counted as won. */
export async function sendRefundEvent(input: {
  orderId: string
  valueCents: number
  currency?: string
  internal?: boolean
}): Promise<void> {
  await postMp({
    client_id: `srv.${input.orderId}`,
    events: [{
      name: 'refund',
      params: {
        transaction_id: input.orderId,
        value: input.valueCents / 100,
        currency: input.currency ?? 'USD',
        ...(input.internal ? { traffic_type: 'internal' } : {}),
        engagement_time_msec: 100,
      },
    }],
  }, 'refund')
}
