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

// ── Google Ads conversions ───────────────────────────────────────────────────
// Google Ads does NOT read GA4 events. A conversion is only recorded when a
// gtag `conversion` event carries `send_to: AW-XXXXXXXXX/LABEL`, and that
// requires the AW destination to be configured on the page (app/layout.tsx
// does that alongside the existing GA4 config — one gtag.js, two destinations,
// never a second tracking system).
//
// The id and the two labels come from the Google Ads UI
// (Goals → Conversions → the action → Tag setup → "Use Google tag") and live
// in env, so no conversion identifier is invented here. With them unset every
// call below is a silent no-op, exactly as before.
const ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID
const ADS_LABEL_PURCHASE = process.env.NEXT_PUBLIC_GADS_LABEL_PURCHASE
const ADS_LABEL_BEGIN_CHECKOUT = process.env.NEXT_PUBLIC_GADS_LABEL_BEGIN_CHECKOUT

/** Verbose only outside production, so the browser console can prove what
 *  fired without leaking anything in front of customers. Values shown are the
 *  same ones already sent to Google — never a secret. */
const DEBUG = process.env.NODE_ENV !== 'production'

export interface AdsConversionParams { value?: number; currency?: string; transaction_id?: string }

/** The exact payload Google Ads expects, or null when this conversion isn't
 *  configured. Pure, so the send_to shape is unit-tested rather than trusted. */
export function googleAdsPayload(
  adsId: string | undefined,
  label: string | undefined,
  params: AdsConversionParams,
): (AdsConversionParams & { send_to: string }) | null {
  if (!adsId || !label) return null
  return { send_to: `${adsId}/${label}`, ...params }
}

function adsConversion(label: string | undefined, what: string, params: AdsConversionParams): void {
  if (typeof window === 'undefined' || !shouldTrackAnalytics()) return
  const payload = googleAdsPayload(ADS_ID, label, params)
  if (!payload) {
    if (DEBUG) console.info(`[ads] ${what} skipped — ${!ADS_ID ? 'NEXT_PUBLIC_GOOGLE_ADS_ID' : 'conversion label'} not set`)
    return
  }
  try {
    window.gtag?.('event', 'conversion', payload)
    if (DEBUG) console.info(`[ads] ${what} fired`, payload)
  } catch { /* analytics must never break the store */ }
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
  // Google Ads Begin Checkout. Same call site as the GA4 event, so it inherits
  // the once-per-cart guard above and can't fire on a refresh of /checkout.
  adsConversion(ADS_LABEL_BEGIN_CHECKOUT, 'begin_checkout', {
    value: subtotal(items) / 100,
    currency: 'USD',
  })
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
  // Google Ads Purchase. The caller (app/confirmation/page.tsx) only reaches
  // here for a session Stripe itself reported as paid, and holds a
  // per-order sessionStorage flag, so a refresh cannot double-count.
  // transaction_id is the real order id — the same value the confirmation
  // email and /track use — which is also how Google de-duplicates its side.
  adsConversion(ADS_LABEL_PURCHASE, 'purchase', {
    value: input.value,
    currency: input.currency,
    transaction_id: input.orderId,
  })
}
