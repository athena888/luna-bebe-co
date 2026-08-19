// GA4 ecommerce events — thin, safe, gate-aware. Client-only helpers: every
// call no-ops on the server, when gtag isn't loaded (GA env unset, script
// blocked), or when lib/analytics-gate.ts says this browser must not report
// (non-production host, /portal, internal-browser flag, declined consent).
// The `purchase` event is deliberately NOT here — it fires server-side from
// the Stripe webhook via the Measurement Protocol so ad blockers can't erase
// revenue (and firing it here too would double-count).

import { shouldTrackAnalytics } from './analytics-gate.ts'

type GtagItem = { item_id: string; item_name: string; price?: number; quantity?: number; item_category?: string }

declare global {
  // eslint-disable-next-line no-var
  var gtag: ((...args: unknown[]) => void) | undefined
  // eslint-disable-next-line no-var
  var fbq: ((...args: unknown[]) => void) | undefined
}

export function track(event: string, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || !shouldTrackAnalytics()) return
  try { window.gtag?.('event', event, params ?? {}) } catch { /* analytics must never break the store */ }
}

// Meta Pixel standard events — same gate as GA above. No-ops when the Pixel
// isn't loaded (env unset, blocked) or the gate says no.
// `opts.eventID` enables CAPI dedup (browser + server share one event_id).
function fbqTrack(event: string, params?: Record<string, unknown>, opts?: { eventID?: string }): void {
  if (typeof window === 'undefined' || !shouldTrackAnalytics()) return
  try {
    if (opts?.eventID) window.fbq?.('track', event, params ?? {}, { eventID: opts.eventID })
    else window.fbq?.('track', event, params ?? {})
  } catch { /* analytics must never break the store */ }
}

interface CartLike { id: string; name: string; price: number; qty?: number; category?: string; lineKey?: string }

const toItem = (i: CartLike): GtagItem => ({
  item_id: i.id, item_name: i.name, price: i.price / 100, quantity: i.qty ?? 1, item_category: i.category,
})
const subtotal = (items: CartLike[]) => items.reduce((s, i) => s + i.price * (i.qty ?? 1), 0)

/** Fire an event at most once per key for the lifetime of `sent` (a React ref
 *  or any {current} box). Returns true exactly once per distinct key — a
 *  rerender or state resync with the same key can never fire twice. */
export function oncePerKey(sent: { current: string | null }, key: string): boolean {
  if (sent.current === key) return false
  sent.current = key
  return true
}

/** Product detail page viewed. Callers guard with oncePerKey so rerenders,
 *  refetches and option changes can't re-fire for the same product. */
export function trackViewItem(p: CartLike): void {
  track('view_item', { currency: 'USD', value: p.price / 100, items: [toItem(p)] })
  fbqTrack('ViewContent', { content_type: 'product', content_ids: [p.id], value: p.price / 100, currency: 'USD' })
}

/** Pure diff of one cart write. Returns null unless total quantity GREW —
 *  removals, rewrites of the same cart, hydration and state syncs all diff to
 *  null. Item quantities are the DELTA added by this write (qty 2→3 reports
 *  quantity 1), keyed per line so two variants of one product don't collide. */
export function cartGrowthEvent(prev: CartLike[], next: CartLike[]): { value: number; items: GtagItem[] } | null {
  const count = (a: CartLike[]) => a.reduce((s, i) => s + (i.qty ?? 1), 0)
  if (count(next) <= count(prev)) return null
  const key = (i: CartLike) => i.lineKey ?? i.id
  const prevQty = new Map(prev.map(i => [key(i), i.qty ?? 1]))
  const items = next
    .filter(i => (i.qty ?? 1) > (prevQty.get(key(i)) ?? 0))
    .map(i => ({ ...toItem(i), quantity: (i.qty ?? 1) - (prevQty.get(key(i)) ?? 0) }))
  const value = Math.max(0, subtotal(next) - subtotal(prev)) / 100
  return { value, items }
}

/** Called from writeCart with before/after — fires when the bag grew, whatever
 *  UI path added the item (product add, quick-add box, box buy panel). One
 *  user action = one writeCart call = at most one event; renders and effects
 *  never call writeCart, so they can never fire this. */
export function trackCartGrowth(prev: CartLike[], next: CartLike[]): void {
  const ev = cartGrowthEvent(prev, next)
  if (!ev) return
  track('add_to_cart', { currency: 'USD', value: ev.value, items: ev.items.length ? ev.items : undefined })
  fbqTrack('AddToCart', { content_type: 'product', content_ids: ev.items.map(i => i.item_id), value: ev.value, currency: 'USD' })
}

/** Order-independent fingerprint of the checkout contents. */
export function checkoutSignature(items: CartLike[]): string {
  return items.map(i => `${i.lineKey ?? i.id}:${i.qty ?? 1}`).sort().join('|')
}

const BEGIN_CHECKOUT_KEY = 'pl_begin_checkout_sig'

/** Should begin_checkout fire for this cart signature? True at most once per
 *  signature per browser session: a refresh, back-button return or internal
 *  retry re-runs the checkout mount with the same cart and stays silent; a
 *  genuinely changed cart is a new checkout initiation and fires again. */
export function shouldFireBeginCheckout(
  sig: string,
  store: { getItem(k: string): string | null; setItem(k: string, v: string): void },
): boolean {
  try {
    if (store.getItem(BEGIN_CHECKOUT_KEY) === sig) return false
    store.setItem(BEGIN_CHECKOUT_KEY, sig)
    return true
  } catch {
    // Storage unavailable (private mode): still at most once per page load,
    // because the checkout mount effect runs once per load.
    return true
  }
}

/** Checkout page reached with a non-empty bag. */
export function trackBeginCheckout(items: CartLike[]): void {
  if (!items.length) return
  if (typeof window !== 'undefined' && !shouldFireBeginCheckout(checkoutSignature(items), window.sessionStorage)) return
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
