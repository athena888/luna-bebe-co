# PetiteLavande.com — E-Commerce Stack Audit

**Scope:** Conversion tracking, tax collection, transactional email, payment webhooks.
**Method:** READ-ONLY. No code, config, or environment was modified. This is a report only.
**Stack observed:** Next.js (App Router) · Supabase · Stripe · Resend · GA4 + Meta Pixel · Vercel Cron.
**Date:** 2026-07-21 · **Commit audited:** `b713000`

**Legend:** ✅ working · 🟡 partial · ❌ missing · 📋 needs dashboard check

---

## 1 · Status Table

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 1 | **Stripe Tax** — `automatic_tax` on Checkout | 🟡 / 📋 | `app/api/checkout/session/route.ts:191,203` — enabled **only** when `STRIPE_TAX_ENABLED === 'true'`; OFF by default |
| 1 | Address collection for tax | 🟡 | `session/route.ts:200` — `shipping_address_collection` set **only for non-gift orders**; `billing_address_collection` never set; gift orders (`shipToRecipient`) send **no address** to Stripe |
| 1 | Hard-coded / conflicting tax rates | ✅ | No `tax_rates`, `tax_behavior`, or manual tax line items anywhere — no conflict with automatic tax |
| 1 | Gift-card checkout tax | ✅ | `app/api/gift-cards/purchase/route.ts:20` — no automatic_tax, no address collection (gift cards non-taxable at sale) |
| 2 | Meta Pixel base code | ✅ | `app/layout.tsx:151-166` — loaded in root layout, ID from `NEXT_PUBLIC_META_PIXEL_ID`, consent-gated |
| 2 | Pixel **PageView** | ✅ | `app/layout.tsx:163` |
| 2 | Pixel **ViewContent / AddToCart / InitiateCheckout** | ❌ | Only GA4 equivalents fire; no `fbq('track', ...)` beyond PageView (see §2) |
| 2 | Pixel **Purchase** (value + currency, on success page) | ❌ | No Pixel Purchase anywhere; `app/confirmation/page.tsx` fires no conversion event |
| 2 | Conversions API (CAPI) | ❌ | No `graph.facebook.com` / server-side conversions implementation |
| 2 | Event dedup (`event_id`) | ❌ (N/A) | No Pixel Purchase and no CAPI exist yet; dedup required once both are added |
| 3 | Order confirmation email | ✅ | `lib/stripe-webhook-handler.ts:98` → `sendOrderConfirmationEmail` |
| 3 | Shipping notification email | 🟡 | `app/api/orders/[id]/ship/route.ts:68` **reuses the confirmation template** — no distinct "shipped" email; customer gets the same-looking email twice |
| 3 | Abandoned checkout email | ✅ / 🟡 | `app/api/cron/abandoned-carts/route.ts` works, but cron runs **daily** (`vercel.json` `0 10 * * *`) though code comment says "every hour" → recovery up to ~24h late |
| 3 | Post-purchase review request | ✅ | `lib/email-flows.ts:38` scheduled +10d after ship, sent by `daily-flows` cron |
| 3 | Contact-form receipt | ❌ | Corporate form alerts the team only (`lib/resend.ts:53`, `replyTo` lead) — no acknowledgment to the submitter; no general contact form |
| 3 | From-domain matches verified domain | 📋 | `FROM = hello@petitelavande.com` (`lib/resend.ts:7`, `lib/site-config.ts:5`) — confirm domain is verified in Resend |
| 3 | Unsubscribe on marketing sends | ✅ | `flowFooter()` adds unsubscribe link on welcome-series/winback/abandoned/review; transactional uses plain footer (correct) |
| 3 | Email failure ≠ broken order | ✅ | All sends `.catch()`-isolated; inventory via `Promise.allSettled` (`stripe-webhook-handler.ts:81,105`) |
| 4 | Webhook signature on **raw** body | ✅ | `app/api/checkout/webhook/route.ts:8,17` — `req.text()` then `constructEvent` (no JSON pre-parse) |
| 4 | Idempotency on retries | ✅ | Two layers: `stripe_webhook_events` dedup on `event.id` (+ 23505 race guard) and order `pending→processing` guard; gift-card uses Stripe `idempotencyKey` |
| 4 | Events handled | 🟡 | `checkout.session.completed` (full), `payment_intent.payment_failed` (log only). **Missing:** `charge.refunded`, disputes |
| 4 | Side effects per event | ✅ | status→processing, inventory decrement, confirmation email, GA4 MP purchase (all first-transition-guarded) |
| 5 | GA4 loads once (no double-fire) | ✅ | `app/layout.tsx:122-148` — single `gtag config`; Pixel is an independent tag |
| 5 | GA4 ecommerce events | ✅ | `view_item`, `add_to_cart`, `begin_checkout` (client), `purchase` (server MP) — not page_views only |
| 5 | Product JSON-LD (price/availability) | ✅ / 🟡 | `app/products/[id]/page.tsx:71-87` — Product schema with `offers.price` + `availability` in sync with `p.price`/`p.active`; availability tracks the `active` flag, **not** live stock count |

---

## 2 · Detail Notes by Section

### 1 · Stripe Tax
- **Two Checkout Session creators.** Main store `app/api/checkout/session/route.ts:192`; gift cards `app/api/gift-cards/purchase/route.ts:20`. No `PaymentIntents.create` used for storefront checkout.
- **`automatic_tax` is env-gated OFF.** `taxEnabled = process.env.STRIPE_TAX_ENABLED === 'true'` (line 191). Unless that env var is `true` in production, **no tax is calculated or collected.**
- **Address gap when tax is on.** Stripe Tax needs a customer address. `shipping_address_collection` is omitted for gift orders (`shipToRecipient`, line 200) and `billing_address_collection` is never set. If `STRIPE_TAX_ENABLED=true` **and** a buyer ships to a recipient, Stripe may have no address to calculate against.
- **No conflicting manual tax** — clean.
- 📋 **NEEDS DASHBOARD CHECK:** (a) confirm `STRIPE_TAX_ENABLED` value in Vercel → Project → Settings → Environment Variables; (b) in Stripe Dashboard → **Settings → Tax**, confirm Tax is **Active** and a **Washington (Seattle ship-from)** registration exists — add any other nexus states.

### 2 · Meta Pixel + Conversions API — **PRE-ADS BLOCKER**
- Pixel base + `PageView` only. **No ViewContent, AddToCart, InitiateCheckout, or Purchase Pixel events fire anywhere.** The parallel GA4 events exist (`lib/analytics-events.ts`) but do not feed Meta.
- `lib/analytics-events.ts:1-7` explicitly documents that `purchase` is GA4-server-only; there is **no Meta equivalent** on the confirmation page.
- **No CAPI**, so no `event_id` dedup. With zero Purchase signal, Meta ads cannot optimize for or attribute conversions.

### 3 · Resend Email Flows
- **Coverage vs. target list:** order confirmation ✅ · shipping notification 🟡 (reuses confirmation template) · abandoned checkout ✅ · post-purchase review ✅ · contact-form receipt ❌.
- **Full send inventory:** welcome (immediate) + welcome-2/-3 series, win-back, order confirmation (×2: pay + ship), abandoned cart, review request, gift card, corporate inquiry (team), weekly scorecard (admin).
- **Failure handling is safe** — a Resend failure inside the webhook is caught and logged; order processing continues. Trade-off: a failed confirmation email is **not retried and leaves no record** (minor).

### 4 · Stripe Webhooks
- Signature verification and idempotency are both **correct and robust** — this is a strong point.
- **Missing events:** `charge.refunded` (no restock, no refund email, no status change) and `charge.dispute.created` are unhandled. `payment_intent.payment_failed` only logs (acceptable).

### 5 · GA4 + Structured Data
- Clean single GA4 load, full ecommerce funnel, consent + internal-traffic exclusion. Product/Breadcrumb/FAQ/Organization/WebSite JSON-LD all present. Only caveat: JSON-LD `availability` follows the `active` flag rather than live inventory, so an in-catalog-but-sold-out item can still render `InStock`.

---

## 3 · Prioritized Fix List

### A. Pre-ads blockers (do before spending on Meta/Google)
1. **Add Meta Pixel Purchase event (+ ViewContent, AddToCart, InitiateCheckout).** Fire `fbq('track','Purchase',{value,currency})` on the confirmation page — note the page currently has only `session_id`, so it needs an endpoint to fetch the order total. *Effort: ~3–5 hrs.*
2. **Activate & verify Stripe Tax.** Confirm `STRIPE_TAX_ENABLED` env + WA registration (📋 dashboard), and set `billing_address_collection: 'required'` so gift orders still have an address for tax. *Effort: ~30–60 min + dashboard.*

### B. Revenue protection
3. **Handle `charge.refunded` + `charge.dispute.created`** in the webhook — restock inventory, set order status, send refund notice. *Effort: ~2–3 hrs.*
4. **Distinct shipping-notification email** (stop reusing the confirmation template). *Effort: ~1 hr.*
5. **Contact-form / corporate-inquiry auto-receipt** to the submitter. *Effort: ~30–60 min.*
6. **Reconcile abandoned-cart cadence** — code says hourly, `vercel.json` runs daily (Hobby-plan cap is daily; document or upgrade). *Effort: ~15 min.*

### C. Nice-to-haves
7. **Meta Conversions API (server-side)** with `event_id` dedup against the browser Pixel Purchase. *Effort: ~4–6 hrs.*
8. **JSON-LD availability from live stock** instead of the `active` flag. *Effort: ~30 min.*
9. **Persist/queue failed confirmation emails** for retry instead of log-and-drop. *Effort: ~1 hr.*

---

*No fixes were implemented in this session, per the brief.*
