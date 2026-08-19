# Analytics tracking — how it works and how to stay out of your own data

Repaired 2026-08-19 after the analytics audit. One rule everywhere:
**production GA4 only ever hears from real customers on the production
storefront.** The single decision lives in `lib/analytics-gate.ts`; the
loader in `app/layout.tsx` mirrors it, and every event helper in
`lib/analytics-events.ts` checks it per event.

## Who is allowed to send analytics

A browser sends GA4/Meta events only when **all** of these hold:

1. **Host** is `petitelavande.com` or `www.petitelavande.com` — localhost,
   `127.0.0.1`, Vercel previews and any other deployment are silent.
2. **Route** is customer-facing — anything under `/portal` is silent
   (and sets the internal flag for that browser, see below).
3. The browser is **not flagged internal** (owner flag below).
4. The visitor did **not decline** the cookie banner.

When any check fails, GA is disabled with Google's official kill switch
(`window['ga-disable-<id>'] = true`), so even automatic page_views send
nothing. The Meta Pixel follows the same gate.

## Marking your own browser internal (owner exclusion)

Do this once per browser/profile/device you use to look at the store:

1. Open petitelavande.com, press **F12** (or right-click → Inspect) → **Console**
2. Paste and press Enter:

   ```js
   localStorage.setItem('pl_internal_analytics', '1')
   ```

3. Done — that browser sends **no** analytics events at all from then on,
   across every page and visit, until you undo it.

To undo (e.g. to test that tracking works):

```js
localStorage.removeItem('pl_internal_analytics')
```

Notes:

- **Visiting any `/portal` page flags the browser automatically** (the portal
  layout sets the legacy `pl_internal` key, which the gate honors too). If you
  log into the portal from a browser, that browser is already excluded.
- The old `?internal=1` URL switch was **removed** — a URL parameter can be
  shared by accident and would silently exclude a real customer.
- The flag is localStorage: clearing site data / a new browser profile /
  private windows won't carry it. Re-run the console line there.
- No IPs, no PII, no GA4 admin filter involved.

## Event map (what fires, from where, once)

| Event | Fires from | Once-guarantee |
|---|---|---|
| `page_view` | gtag automatic (initial load) + GA4 enhanced measurement (SPA route changes) | no manual page_view exists anywhere, so nothing can double-fire |
| `view_item` | product page (`ProductDetailClient`) and box pages (`TrackViewItem`) | `oncePerKey` ref guard — rerenders/refetches/Strict Mode can't re-fire |
| `add_to_cart` | `writeCart()` in `lib/cart.ts`, the single choke point every add path uses | fires only when total quantity **grew**; item quantities are the **delta**; renders/effects never call `writeCart` |
| `begin_checkout` | checkout page mount | once per cart signature per browser session — refresh/back-button/retry stay silent; a changed cart fires again |
| `purchase` (GA4) | **server-side only**, Stripe webhook via Measurement Protocol | fires on the single `pending → processing` transition, only when Stripe says `payment_status === 'paid'`, only for **live-mode** events; `transaction_id` = order id dedupes any replay |
| `refund` (GA4) | Stripe webhook on `charge.refunded` | original `transaction_id`, live-mode only — refunded revenue is reversed, not left counted |
| Meta `Purchase` | confirmation page (browser) + CAPI (server) | shared `eventID` = order id; Meta dedupes the pair |

Test/staff purchases that do go through live mode are additionally tagged
`traffic_type: 'internal'` when the buyer email matches
`isInternalEmail()` (`lib/site-config.ts` — admin addresses, the brand
domain, `+test` addresses, plus anything in `INTERNAL_EMAILS`).

## Stripe → Supabase order flow (source of truth)

1. Checkout submit → `/api/checkout/session` **inserts the order as
   `pending`** and creates the Stripe Checkout Session with
   `metadata.order_id` (plus GA client/session ids for attribution).
2. Stripe confirms payment → webhook (`/api/checkout/webhook`, signature
   verified) → `checkout.session.completed` / `async_payment_succeeded`.
3. The handler advances the order **only** when payment_status is `paid`
   and the order is still `pending` — then decrements stock, sends the
   confirmation email, fires GA4 + CAPI purchase.
4. Duplicate deliveries are refused three ways: event-id dedup in
   `stripe_webhook_events`, the `pending`-only transition, and GA4's own
   `transaction_id` dedup. `supabase/migrations/orders_stripe_ref_unique.sql`
   adds a DB-level unique index as a fourth belt — **review and run it
   manually; it has NOT been applied.**

The audit's "orders table empty" mystery: the pipeline works — the paid
2026-08-17 session was processed with no error (see `stripe_webhook_events`);
the rows were deleted afterward outside the app (manual Supabase cleanup).
No code path deletes orders. Don't hand-delete future test orders — refund
them (status becomes `refunded`) or mark them internal instead, so Stripe,
Supabase and GA4 stay reconcilable.

## Manual setup still needed (cannot be done from the repo)

- **GA4 Data API read access** (lets the portal scorecard and future audits
  read reports): create a Google Cloud service account, grant it **Viewer**
  on the GA4 property, then set two env vars in Vercel (production):
  - `GA_PROPERTY_ID` — the numeric property id (Admin → Property settings)
  - `GA_SERVICE_ACCOUNT_JSON` — the service-account JSON key as one line

  `lib/ga.ts` already no-ops safely while these are absent.
- **Verify GA4 enhanced measurement** (Admin → Data Streams → web stream →
  Enhanced measurement): "Page views" with "browser history events" should be
  **ON** — SPA route-change page_views depend on it (we deliberately send no
  manual page_view).
- **Scope `NEXT_PUBLIC_GA_ID` / `NEXT_PUBLIC_META_PIXEL_ID` to Production**
  in Vercel env settings (defense in depth; the hostname gate already blocks
  previews at runtime).
- Historical GA4 data (the ~121 users / 208 add_to_cart period) stays
  contaminated — it cannot and should not be rewritten. Treat data before
  2026-08-19 as unreliable; trust begins when this ships.
