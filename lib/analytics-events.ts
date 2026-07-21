// GA4 ecommerce events — thin, safe, consent-aware. Client-only helpers: every
// call no-ops on the server, when gtag isn't loaded (GA env unset, script
// blocked), or when the visitor clicked Decline on the cookie banner (the same
// rule the loader in app/layout.tsx applies). The `purchase` event is
// deliberately NOT here — it fires server-side from the Stripe webhook via the
// Measurement Protocol so ad blockers can't erase revenue (and firing it here
// too would double-count).

type GtagItem = { item_id: string; item_name: string; price?: number; quantity?: number; item_category?: string }

declare global {
  // eslint-disable-next-line no-var
  var gtag: ((...args: unknown[]) => void) | undefined
  // eslint-disable-next-line no-var
  var fbq: ((...args: unknown[]) => void) | undefined
}

function consentDeclined(): boolean {
  try { return localStorage.getItem('cookie_consent') === 'declined' } catch { return false }
}

export function track(event: string, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || consentDeclined()) return
  try { window.gtag?.('event', event, params ?? {}) } catch { /* analytics must never break the store */ }
}

// Meta Pixel standard events — same consent gate as GA above. No-ops when the
// Pixel isn't loaded (env unset, blocked) or the visitor declined cookies.
// `opts.eventID` enables CAPI dedup (browser + server share one event_id).
function fbqTrack(event: string, params?: Record<string, unknown>, opts?: { eventID?: string }): void {
  if (typeof window === 'undefined' || consentDeclined()) return
  try {
    if (opts?.eventID) window.fbq?.('track', event, params ?? {}, { eventID: opts.eventID })
    else window.fbq?.('track', event, params ?? {})
  } catch { /* analytics must never break the store */ }
}

interface CartLike { id: string; name: string; price: number; qty?: number; category?: string }

const toItem = (i: CartLike): GtagItem => ({
  item_id: i.id, item_name: i.name, price: i.price / 100, quantity: i.qty ?? 1, item_category: i.category,
})
const subtotal = (items: CartLike[]) => items.reduce((s, i) => s + i.price * (i.qty ?? 1), 0)

/** Product detail page viewed. */
export function trackViewItem(p: CartLike): void {
  track('view_item', { currency: 'USD', value: p.price / 100, items: [toItem(p)] })
  fbqTrack('ViewContent', { content_type: 'product', content_ids: [p.id], value: p.price / 100, currency: 'USD' })
}

/** Called from writeCart with before/after — fires when the bag grew, whatever
 *  UI path added the item (product add, quick-add box, build page). */
export function trackCartGrowth(prev: CartLike[], next: CartLike[]): void {
  const prevCount = prev.reduce((s, i) => s + (i.qty ?? 1), 0)
  const nextCount = next.reduce((s, i) => s + (i.qty ?? 1), 0)
  if (nextCount <= prevCount) return
  const value = Math.max(0, subtotal(next) - subtotal(prev)) / 100
  // Best-effort added-items detail: anything whose qty increased.
  const prevQty = new Map(prev.map(i => [i.id, i.qty ?? 1]))
  const added = next.filter(i => (i.qty ?? 1) > (prevQty.get(i.id) ?? 0)).map(toItem)
  track('add_to_cart', { currency: 'USD', value, items: added.length ? added : undefined })
  const addedIds = next.filter(i => (i.qty ?? 1) > (prevQty.get(i.id) ?? 0)).map(i => i.id)
  fbqTrack('AddToCart', { content_type: 'product', content_ids: addedIds, value, currency: 'USD' })
}

/** Checkout page reached with a non-empty bag. */
export function trackBeginCheckout(items: CartLike[]): void {
  if (!items.length) return
  track('begin_checkout', { currency: 'USD', value: subtotal(items) / 100, items: items.map(toItem) })
  fbqTrack('InitiateCheckout', {
    content_type: 'product',
    content_ids: items.map(i => i.id),
    num_items: items.reduce((s, i) => s + (i.qty ?? 1), 0),
    value: subtotal(items) / 100,
    currency: 'USD',
  })
}

/** Purchase — fired once from the confirmation page (Pixel only; GA4 purchase is
 *  server-side). `eventID` = order id so it dedupes against the server CAPI. */
export function trackPurchase(input: { orderId: string; value: number; currency: string; contentIds?: string[] }): void {
  fbqTrack('Purchase', {
    content_type: 'product',
    content_ids: input.contentIds ?? [],
    value: input.value,
    currency: input.currency,
  }, { eventID: input.orderId })
}
