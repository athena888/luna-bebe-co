# REVIEW.md — SEO / Indexing / Reviews / Ads Readiness Audit

**Branch:** `claude/petitelavande-seo-ads-j7o0cn` · **Date:** 2026-08-15 · **Phase 1 — proposals only, no code changed**

---

## 0. HEADLINE — READ THIS FIRST

**Most of what this task asks for is already built and committed on this branch.** Three prior commits landed it:

| Commit | What it landed |
|---|---|
| `88486f2` | www→apex redirect, homepage meta description, descriptive alts, IndexNow key + `npm run indexnow` |
| `497d33d` | IndexNow auto-ping on portal saves |
| `676c4ce` | Review JSON-LD (aggregateRating + review objects), GCR opt-in component, Google review link in emails |

So sections **2, 3, 6, 7, 8, 9** are essentially **already done**. I verified each against the actual source rather than re-proposing it. That changes this document's job from "propose a build" to "verify, and find what's actually still broken."

**Three genuinely broken things I found that were not on your list:**

1. 🔴 **The GCR opt-in cannot ever run — CSP blocks it.** `GcrOptIn.tsx` loads `https://apis.google.com/js/platform.js`, but the `script-src` in `next.config.ts` does not include that host. The component is written to fail silently, so this has been invisible. **Google Customer Reviews has been collecting nothing.** (§7)
2. 🔴 **`/es/checkout` is indexable.** English `/checkout` is noindex via `app/checkout/layout.tsx`, but the Spanish route re-exports only the *page*, not the layout — and `robots.txt` disallows `/checkout`, not `/es/checkout`. A transactional page is open to crawlers. (§1)
3. 🟡 **`/account` has no `noindex`.** It's disallowed in robots.txt (so uncrawled), but you asked for noindex to be kept there and it isn't actually set. (§1)

**And the honest answer on your Bing question:** I could not reproduce it, and I explain why in §1 — the code contains no mechanism that would noindex a *visible* box. The most likely cause is `visible=false` on the specific box(es) Bing sampled. **I need one piece of data from you to close this out** — see §1.4 and §10.Q1.

---

## 1. NOINDEX AUDIT

### 1.1 Every occurrence in the codebase

I searched `next.config.*`, `middleware.ts`, `vercel.json`, all `headers()` configs, every `metadata`/`generateMetadata` export, and every route handler for header mutation. Complete list:

| # | File:line | What it does | Scope | Verdict |
|---|---|---|---|---|
| 1 | `next.config.ts:88` | `X-Robots-Tag: noindex` header | `/:path*.js.map` | ✅ **KEEP** — see 1.2, it is correctly scoped |
| 2 | `app/checkout/layout.tsx:7` | `robots: { index: false }` | `/checkout` | ✅ **KEEP** (you asked to keep checkout) |
| 3 | `app/confirmation/layout.tsx:7` | `robots: { index: false }` | `/confirmation` | ✅ **KEEP** (transactional) |
| 4 | `app/gift-cards/confirmation/layout.tsx:7` | `robots: { index: false }` | `/gift-cards/confirmation` | ✅ **KEEP** (transactional) |
| 5 | `app/note/[token]/page.tsx:14` | `robots: { index: false, follow: false }` | `/note/[token]` | ✅ **KEEP** (private tokenized gift note) |
| 6 | `app/r/[code]/page.tsx:10` | `robots: { index: false, follow: false }` | `/r/[code]` | ✅ **KEEP** (referral redirector) |
| 7 | `app/boxes/[slug]/page.tsx:52` | `robots: { index: false, follow: true }` **when `box.visible === false`** | `/boxes/*` | ⚠️ **KEEP the mechanism** — but this is the *only* thing in the codebase that can noindex a box. See 1.4 |

There is **no** `X-Robots-Tag` in `vercel.json`, none in `middleware.ts`, and no route handler anywhere sets response headers (`grep` for `headers.set` across `app/`, `lib/`, `middleware.ts` returns zero hits). `public/robots.txt` does **not** disallow `/boxes`.

### 1.2 I cleared the `.js.map` rule — it does not over-match

This was my prime suspect, because a stray `X-Robots-Tag` header is exactly what makes Bing say "Indexing allowed: No" while the rendered HTML still says `index, follow` (a header outranks the meta tag, and Bing reports the header). A `:path*` wildcard followed by a literal suffix is a classic Next.js over-match trap.

I compiled the actual pattern with the same `path-to-regexp` build Next ships:

```
/:path*.js.map  →  /^(?:\/((?:[^\/#\?]+?)(?:\/(?:[^\/#\?]+?))*))?\.js\.map[\/#\?]?$/i

/boxes/signature-baby-gift-box   → false   ✅ not matched
/boxes                           → false   ✅ not matched
/                                → false   ✅ not matched
/app.js.map                      → true    ✅ matched as intended
/_next/static/chunks/main.js.map → true    ✅ matched as intended
```

**Conclusion: rule #1 is correctly scoped and is not your Bing problem.** Keep it as-is. I'd have proposed removing it on suspicion; testing it saved you a pointless change.

### 1.3 Gaps — pages that *should* be noindex and aren't

| Route | Current state | Problem | Proposal |
|---|---|---|---|
| `/es/checkout` | **Indexable** | `app/es/checkout/page.tsx` is a one-line `export { default } from '@/app/checkout/page'`. Re-exporting a page does **not** inherit the sibling layout's metadata, and `app/es/layout.tsx` sets no `robots`, so it falls through to the root layout's `index: true, follow: true`. `robots.txt` disallows `/checkout` but not `/es/checkout`. | Add `app/es/checkout/layout.tsx` with `robots: { index: false }`, and add `Disallow: /es/checkout` to `robots.txt` |
| `/account` | **No meta robots** (robots.txt disallows it, so uncrawled in practice) | You asked that `/account` keep noindex. It currently relies on robots.txt alone — which blocks *crawling*, not *indexing* (a URL can still be indexed from inbound links). | Add `robots: { index: false }` to the existing `metadata` in `app/account/layout.tsx` |
| `/api/*` | robots.txt `Disallow: /api/` + middleware 401s | Adequate. No change needed. | ✅ no change |
| Preview envs | **Nothing** | Vercel preview deployments are indexable unless Vercel's own protection is on. | Not a code change — see §10.M2 |

### 1.4 The Bing "/boxes/* — Indexing allowed: No" question

**I could not reproduce it, and I want to be straight with you about that.** This environment's egress proxy blocks `petitelavande.com`, so I could not fetch live headers or live HTML. Everything above is static analysis of the source.

What the source proves:

- Nothing emits `X-Robots-Tag` for `/boxes/*`. Verified by compiling the only header rule that exists.
- `robots.txt` does not disallow `/boxes`.
- A box with `visible === true` renders `<meta name="robots" content="index, follow">` (inherited from the root layout, which explicitly sets `index: true, follow: true`).
- A box with `visible === false` renders `noindex, follow` — by design, per the comment at `app/boxes/[slug]/page.tsx:14-17`: seasonally hidden boxes keep serving so the URL and its reviews survive off-season.

**The three explanations that actually fit "Bing says no, HTML says yes":**

1. **Most likely — you and Bing looked at different boxes, or at different times.** `visible=false` is a live DB flag. `Noël` is seeded `seasonal: true` and `The Petite` is seeded `active: false`. If Bing crawled a box while it was hidden, Bing caches "Indexing allowed: No" until it re-crawls — even though the box is visible (and renders `index, follow`) when you check today. This fits your symptom exactly.
2. **Old slugs.** `next.config.ts` 301s six legacy box URLs (`/boxes/signature` → `/boxes/signature-baby-gift-box`, etc.). If Bing's record is on a legacy URL, its inspection reflects a redirect, not an indexable page.
3. **Something outside the repo** — Vercel Deployment Protection, or a WAF/firewall rule serving bingbot differently. Nothing in this codebase can cause it.

**To close this properly I need one of two things from you (§10.Q1):** either the *exact* `/boxes/...` URL Bing flagged, or the output of:

```bash
curl -sSI -A "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)" \
  https://petitelavande.com/boxes/signature-baby-gift-box | grep -i "x-robots\|HTTP/"
```

If that prints no `x-robots-tag` line, the cause is #1 or #2 and the fix is a Bing re-crawl request, not a code change. **I recommend not changing the `visible` noindex mechanism** — it's deliberate and correct — until we have that data.

---

## 2. CANONICAL HOST AUDIT

### 2.1 Current state — this is already correct

**`metadataBase`:** set once in `app/layout.tsx:45`:
```ts
metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com')
```
✅ Non-www, with a correct fallback.

**www → non-www redirect: already exists**, `next.config.ts:29-34`:
```ts
{
  source: '/:path*',
  has: [{ type: 'host', value: 'www.petitelavande.com' }],
  destination: 'https://petitelavande.com/:path*',
  permanent: true,   // → 308
}
```
✅ **No change needed.** You asked me to propose this block; it is already there and correct. `permanent: true` emits 308 (Next's default for permanent redirects), which preserves method and is fine for SEO.

The feed layer independently normalizes host too (`lib/google-feed-tsv.ts:22`), so feed links can never disagree with the site canonical.

### 2.2 Canonical coverage — 33 of 39 public routes have one

I audited every non-portal, non-API `page.tsx` for `alternates.canonical`. Routes **without** a canonical:

| Route | Has canonical? | Assessment |
|---|---|---|
| `/checkout` | No | ✅ Fine — noindex |
| `/confirmation` | No | ✅ Fine — noindex |
| `/gift-cards/confirmation` | No | ✅ Fine — noindex |
| `/note/[token]` | No | ✅ Fine — noindex |
| `/r/[code]` | No | ✅ Fine — noindex |
| `/account` | No | ✅ Fine once §1.3 noindex is added |
| `/social` | No | ✅ Fine — it's a bare `redirect('/story')`, renders nothing |
| `/es/checkout` | No | 🔴 **Not fine** — indexable, see §1.3 |
| `/guide` | No | 🟡 **Dead route** — see 2.3 |

**Every indexable public page already has a canonical.** No canonical work is required beyond the `/es/checkout` noindex.

### 2.3 Bonus finding — duplicate `/guide` redirect

`next.config.ts` declares `source: '/guide'` **twice**:
- line 44: `{ source: '/guide', destination: '/gift-guides', permanent: true }`
- line 51: `{ source: '/guide', destination: '/gifts', permanent: true }`

Next matches top-down, so **line 51 is dead code** — `/guide` always goes to `/gift-guides`. `app/guide/page.tsx` and `app/guide/layout.tsx` are consequently unreachable dead code too.

**Proposal:** delete the line-51 duplicate. Deleting the dead `app/guide/` route is optional and I'd leave it (harmless, and removing it is scope creep). **Flagging as ambiguous — tell me which destination you actually want** (§10.Q2).

---

## 3. HOMEPAGE META DESCRIPTION

### 3.1 Current — already exactly what you proposed

The string you proposed is **already live**, in both places:

- `app/layout.tsx:47` (site default)
- `app/page.tsx:8` (homepage override, added in commit `cc9713b`)

```
French-inspired newborn & postpartum gift boxes — organic cotton, hand-packed with care. Thoughtful luxury for new mothers and babies.
```

**134 characters.** ✅ Under the ~155–160 truncation threshold. **No change needed.**

### 3.2 My alternative

```
Organic cotton newborn & postpartum gift boxes, hand-packed in France-inspired keepsake baskets. Thoughtful luxury for new mothers and their babies.
```
**148 characters.**

**Rationale (and my recommendation):** I'd **keep the current one.** The alternative front-loads "Organic cotton" (higher-volume commercial query than "French-inspired") and swaps the em-dash for a comma, since some SERP renderers handle punctuation-heavy snippets poorly. But it trades away the brand-distinctive "French-inspired" opener and adds 14 chars for a marginal gain. The current copy is tighter and on-brand. Not worth churning.

---

## 4. IMAGE ALT AUDIT

I scanned every `<Image>` and `<img>` in all non-portal, non-API `.tsx` files. Note that Next's `<Image>` makes `alt` a required prop, so genuinely *absent* alts are impossible there — what matters is empty (`alt=""`) and weak alts.

### 4.1 Result: 6 empty alts — 5 of them are correct, 1 is a real bug

| File:line | Current | Assessment |
|---|---|---|
| `app/HomeView.tsx:150` | `alt="" aria-hidden="true"` — lavender divider | ✅ **Correct.** Decorative; empty alt + `aria-hidden` is the right WCAG pattern |
| `app/HomeView.tsx:167` | same | ✅ Correct |
| `app/story/StoryView.tsx:108` | same | ✅ Correct |
| `app/story/StoryView.tsx:123` | same | ✅ Correct |
| `components/ui/ProductGridCard.tsx:59` | `alt="" aria-hidden="true"` — hover-swap secondary image | ✅ **Correct.** Duplicate of the primary image; announcing it twice would be worse |
| `components/ui/ProductCarousel.tsx:298` | `alt=""`, **no `aria-hidden`** — lightbox full-size product photo | 🔴 **Real bug.** This is the primary content of a modal. Empty alt with no `aria-hidden` is the one combination that's always wrong |

**Proposed fix for `ProductCarousel.tsx:298`** — the component already has the product in scope, so:
```tsx
<img src={lightbox} alt={`${product.name} — full size view`} className="..." />
```

### 4.2 Weak (present but non-descriptive) alts

Not "missing," but they waste the ranking signal. Proposals:

| File:line | Current | Proposed |
|---|---|---|
| `app/build/page.tsx:474` (mobile hero) | `"Build Your Box"` | `"Build your own organic baby gift box — Petite Lavande keepsake basket"` |
| `app/build/page.tsx:476` (desktop hero) | `"Build Your Box"` | `"Build your own organic baby gift box — Petite Lavande keepsake basket"` |
| `app/build/page.tsx:480` (single hero) | `"Build Your Box"` | `"Build your own organic baby gift box — Petite Lavande keepsake basket"` |
| `components/ui/CertBadges.tsx:125` | `"certificate"` | `` {`${opened.label} certificate`} `` (uses the cert name already in scope) |

### 4.3 Deliberately left alone

- `components/layout/Header.tsx:77,100` and `components/layout/Footer.tsx:190` — `alt="Petite Lavande"` on the logo. ✅ **Correct.** A logo's alt should be the organization name, nothing more.
- `components/ui/SlotImage.tsx` — renders `alt={img.alt_text}` from the owner-managed DB slot. ✅ Architecture is right; alt quality is a **data** question (portal → Site Images), not a code one. There's already an AI alt-suggest endpoint at `app/api/portal/site-images/alt-suggest/route.ts`.
- Box/product/gallery images on `/boxes/[slug]` already carry composed alts (`${box.name} — ${variant.label}`, etc.) from commit `88486f2`. ✅

**Net: 1 bug fix + 4 improvements. The alt situation is in good shape.**

---

## 5. PRODUCT FEED TITLE REVIEW — PROPOSALS ONLY, NO DATA CHANGED

### 5.1 Where feed titles live

Titles are **generated**, not stored — there's no title column to edit:

- `lib/google-feed.ts` → `buildFeed()` reads `products` from Supabase, uses raw `p.name`
- `lib/google-feed-tsv.ts:77` → `feedTitle(item)` composes **individual product** titles
- `lib/google-feed-tsv.ts:190` → composes **gift box** titles inline
- Consumed by `/product-feed.tsv` and `/feeds/google.xml`

Current formulas:
- **Items:** `{keyword} – {attribute} – {clean name}`
- **Boxes:** `{N}-Piece {keyword} – Hand-Packed & Personalized – {box name}`

### 5.2 The one structural issue

**Neither formula includes the brand.** `Petite Lavande` goes in the separate `brand` column (correct, required), but Google Shopping's own title guidance puts **brand first** for branded goods — it's the highest-weighted title token and drives brand-query matching. Your format spec (`Brand + product type + key attributes`) agrees.

Second issue: the `{N}-Piece` prefix leads with a number, which reads as spam-adjacent and buries the product type. Better as a trailing attribute.

### 5.3 GIFT BOXES — proposed titles

Live slugs are the post-redirect keyword URLs. Piece counts vary per variant (`{N}` = computed by `pieceCount(v)`).

| Slug | Variant | Current generated title | **Proposed** |
|---|---|---|---|
| `signature-baby-gift-box` | Tier 1 ($85) | `4-Piece Organic Newborn Gift Basket – Hand-Packed & Personalized – The Signature` | `Petite Lavande Organic Newborn Gift Box – The Signature Tier 1 – Organic Cotton, Hand-Packed, 4 Pieces` |
| `signature-baby-gift-box` | Tier 2 ($105) | `6-Piece Organic Newborn Gift Basket – …` | `Petite Lavande Organic Newborn Gift Box – The Signature Tier 2 – Organic Cotton, Hand-Packed, 6 Pieces` |
| `signature-baby-gift-box` | Tier 3 ($125) | `7-Piece …` | `Petite Lavande Organic Newborn Gift Box – The Signature Tier 3 – Organic Cotton, Hand-Packed, 7 Pieces` |
| `signature-baby-gift-box` | Tier 4 ($150) | `7-Piece …` | `Petite Lavande Organic Newborn Gift Box – The Signature Tier 4 – Knit Blanket, Hand-Packed, 7 Pieces` |
| `signature-baby-gift-box` | Tier 5 ($175) | `8-Piece …` | `Petite Lavande Organic Newborn Gift Box – The Signature Tier 5 – Knit Blanket & Crochet Bunny, 8 Pieces` |
| `signature-baby-gift-box` | Tier 6 ($200) | `10-Piece …` | `Petite Lavande Luxury Baby & Mom Gift Box – The Signature Tier 6 – Complete Set, 10 Pieces` |
| `themed-baby-gift-box` | Strawberry ($140) | `6-Piece Baby Shower Gift Box – … – La Collection` | `Petite Lavande Themed Baby Gift Box – Strawberry – Organic Cotton Baby Shower Gift, 6 Pieces` |
| `themed-baby-gift-box` | Lemon ($140) | `6-Piece Baby Shower Gift Box – …` | `Petite Lavande Themed Baby Gift Box – Lemon – Organic Cotton Baby Shower Gift, 6 Pieces` |
| `themed-baby-gift-box` | Sheep ($140) | `6-Piece Baby Shower Gift Box – …` | `Petite Lavande Themed Baby Gift Box – Little Sheep – Organic Cotton Baby Shower Gift, 6 Pieces` |
| `themed-baby-gift-box` | Acorn ($140) | `6-Piece Baby Shower Gift Box – …` | `Petite Lavande Themed Baby Gift Box – Acorn & Squirrel – Organic Cotton Baby Shower Gift, 6 Pieces` |
| `themed-baby-gift-box` | Farmhouse ($140) | `6-Piece Baby Shower Gift Box – …` | `Petite Lavande Themed Baby Gift Box – Farmhouse – Organic Cotton Baby Shower Gift, 6 Pieces` |
| `new-mom-gift-box` | Wellness ($135) | `6-Piece New Mom Postpartum Gift Box – … – The Mama Box` | `Petite Lavande New Mom Gift Box – Wellness Set – Postpartum Self-Care, Bath Salts & Eye Pillow, 6 Pieces` |
| `new-mom-gift-box` | Postpartum ($145) | `6-Piece New Mom Postpartum Gift Box – …` | `Petite Lavande New Mom Gift Box – Postpartum Set – Silk Eye Mask, Bath Salts & Knit Blanket, 6 Pieces` |
| `baby-first-christmas-gift-box` | default ($160) | `5-Piece Baby's First Christmas Gift Box – … – Noël` | `Petite Lavande Baby's First Christmas Gift Box – Organic Cotton Holiday Newborn Keepsake, 5 Pieces` |
| `petite-baby-gift-box` | default ($50) | `4-Piece Organic Baby Gift Box – … – The Petite` | `Petite Lavande Petite Baby Gift Box – Organic Cotton Newborn Starter Gift, 4 Pieces` |

> ⚠️ `petite-baby-gift-box` is seeded `active: false` and `baby-first-christmas-gift-box` is `seasonal: true` — they may not currently be in the feed at all. Also note `mama-et-bebe` 301s to `themed-baby-gift-box`, so the "Mama et Bébé" bundle no longer has its own feed URL. **Flagging — see §10.Q3.**

### 5.4 INDIVIDUAL PRODUCTS — proposed titles

Sampled from `scripts/seed-catalog.mjs` (the live `products` table is larger; the formula change applies to all rows uniformly).

| Product ID | Current name | Current generated title | **Proposed** |
|---|---|---|---|
| `garment-henley-bodysuit` | Organic Henley Bodysuit | `Organic Cotton Newborn Clothing – Organic Cotton – Organic Henley Bodysuit` | `Petite Lavande Organic Cotton Baby Bodysuit – Henley, Newborn, Organic Cotton` |
| `swaddle-winter-knit-blanket` | Winter Colorway Knit Blanket | `Organic Baby Blanket & Swaddle – Organic Cotton – Winter Colorway Knit Blanket` | `Petite Lavande Knit Baby Blanket – Winter Colorway, Organic Cotton, Newborn` |
| `swaddle-lemon-knit-blanket` | Little Lemon Knit Blanket | `Organic Baby Blanket & Swaddle – Organic Cotton – Little Lemon Knit Blanket` | `Petite Lavande Knit Baby Blanket – Little Lemon, Organic Cotton, Newborn` |
| `swaddle-farmhouse-knit-blanket` | Farmhouse Knit Blanket | `Organic Baby Blanket & Swaddle – Organic Cotton – Farmhouse Knit Blanket` | `Petite Lavande Knit Baby Blanket – Farmhouse, Organic Cotton, Newborn` |
| `keepsake-farmhouse-rattle` | Farmhouse Beechwood Rattle | `Baby Shower Keepsake Gift – Handmade for Newborns – Farmhouse Beechwood Rattle` | `Petite Lavande Wooden Baby Rattle – Farmhouse Beechwood, Handmade Newborn Keepsake` |
| `keepsake-reindeer-doll` | Little Reindeer Doll | `Baby Shower Keepsake Gift – Handmade for Newborns – Little Reindeer Doll` | `Petite Lavande Plush Baby Doll – Little Reindeer, Handmade Newborn Keepsake` |
| `mom-fuzzy-socks` | Cloud-Soft Lounge Socks | `New Mom Postpartum Care Gift – Self-Care for New Mothers – Cloud-Soft Lounge Socks` | `Petite Lavande Postpartum Lounge Socks – Cloud-Soft, New Mom Self-Care Gift` |
| `mom-porcelain-cup` | Porcelain Petite Cup | `New Mom Postpartum Care Gift – Self-Care for New Mothers – Porcelain Petite Cup` | `Petite Lavande Porcelain Tea Cup – Petite, New Mom Postpartum Self-Care Gift` |

### 5.5 What implementing this would touch

**Only two functions — no product data is edited:**
- `lib/google-feed-tsv.ts:77` → `feedTitle()` (individual items)
- `lib/google-feed-tsv.ts:190` → the inline box title expression

Existing safeguards I would preserve exactly: the 150-char cap, `scrubGots()`, the organic-claim gating (fiber claims only when `item.organic` is set; GOTS wording held for `gots_certified`), and `splitNameColor()` keeping colorways out of titles and in the `color` column.

**⚠️ Per your constraint, I will not touch these unless you explicitly approve Section 5.** Note also that Merchant Center re-reviews items on title change, which can cause a short re-approval delay.

---

## 6. REVIEW JSON-LD — ALREADY IMPLEMENTED

### 6.1 Current state

This is **already built exactly to your spec** (commit `676c4ce`), at `app/boxes/[slug]/page.tsx:99-146`. It is server-rendered, brand is `"Petite Lavande"`, `sku`/`mpn` are set, there are no GTINs, and rating fields are omitted at zero reviews. Verified shape:

```jsonc
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "<box.name>",
  "description": "<box.subtitle || box.name>",
  "image": ["<variant.images…>"],            // omitted when no images
  "brand": { "@type": "Brand", "name": "Petite Lavande" },
  "sku": "<box.slug>",
  "mpn": "<box.slug>",
  "offers": {                                 // Offer when single price,
    "@type": "AggregateOffer",                // AggregateOffer when a range
    "lowPrice": "85.00", "highPrice": "200.00",
    "priceCurrency": "USD", "offerCount": 6,
    "url": "https://petitelavande.com/boxes/<slug>"
  },

  // ↓ present ONLY when ≥1 approved, non-incentivized review exists
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8", "reviewCount": 12,
    "bestRating": "5", "worstRating": "1"
  },
  "review": [                                 // capped at 10
    {
      "@type": "Review",
      "author": { "@type": "Person", "name": "<customer_name || 'Verified customer'>" },
      "datePublished": "2026-07-14",
      "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5", "worstRating": "1" },
      "reviewBody": "<body, truncated to 1500 chars>"
    }
  ]
}
```

Sourcing: `reviews` where `product_id = 'box-<slug>'` AND `approved = true`, newest first; filtered to `!incentivized` and `1 ≤ rating ≤ 5`; `.slice(0, 10)`. Wrapped in `try/catch` so a DB failure drops the rating fields but never the page. A separate `BreadcrumbList` is emitted alongside.

**Assessment: correct, compliant, and matches your spec. No change proposed.** Excluding incentivized reviews is the right call (FTC 16 CFR 465) and is applied consistently with `lib/google-review-feed.ts`.

### 6.2 ⚠️ One dependency you must confirm

The query selects the `incentivized` column. That column is added in **`supabase/migrations/_RUN_ALL_PENDING.sql` line 1430** (section 45), together with line 1498's `alter table reviews drop constraint if exists reviews_product_id_fkey` — which is what *allows* `product_id = 'box-<slug>'` to exist at all, since the original `reviews.product_id` had an FK to `products(id)`.

**If `_RUN_ALL_PENDING.sql` has not been applied to production, then:**
- the `select` errors → the `catch` swallows it → **`aggregateRating` silently never renders**, and
- box reviews cannot be written in the first place (FK violation).

This would look exactly like "we have reviews but no stars in search." **Please confirm the migration has run — see §10.Q4.** I cannot check from here (no DB access in this environment).

---

## 7. GCR OPT-IN — ALREADY IMPLEMENTED, BUT 🔴 BLOCKED BY CSP

### 7.1 Location

- **Component:** `components/ui/GcrOptIn.tsx` (already exists, commit `676c4ce`)
- **Injection point:** `app/confirmation/page.tsx:70`, inside `ConfirmationInner`, above `<Header />`
- **Gating:** rendered only after `GET /api/checkout/order-summary?session_id=…` returns `paid: true` with an `orderId` and an `email`

The existing implementation already matches every requirement you listed: `next/script` with `strategy="afterInteractive"`, `window.gapi.surveyoptin.render`, `merchant_id: 5829406914`, real `order_id`, `email`, `delivery_country: 'US'`, `estimated_delivery_date` = order date + 7 days as `YYYY-MM-DD`, **no** `products` field, a `useRef` render-once guard, and `try/catch` + `onError` so it fails silently.

**So there is no component to add. The code you asked me to write is already there and correct.**

### 7.2 🔴 The actual problem: CSP blocks the script

`next.config.ts` Content-Security-Policy:

```
script-src 'self' 'unsafe-inline' 'unsafe-eval'
           https://www.googletagmanager.com
           https://www.google-analytics.com
           https://js.stripe.com
           https://client.crisp.chat
```

`GcrOptIn.tsx` loads **`https://apis.google.com/js/platform.js`** — that host appears **nowhere** in the CSP (`grep -c "apis.google.com" next.config.ts` → `0`).

The browser refuses the script. `window.gapi` never exists. `tryRender()` returns early every time. And because the component is *designed* to fail silently, **there is no error, no log, and no symptom — GCR has simply never collected a single opt-in.**

The survey badge/iframe also needs a frame host, and the opt-in posts back to Google.

### 7.3 Proposed fix — CSP only, no component change

Three surgical additions to the CSP string in `next.config.ts`:

| Directive | Add | Why |
|---|---|---|
| `script-src` | `https://apis.google.com` | loads `platform.js` — **without this nothing else matters** |
| `frame-src` | `https://www.google.com` | the survey opt-in renders in a Google-hosted iframe |
| `connect-src` | `https://www.google.com` | opt-in submission XHR |

Resulting directives:
```
script-src  … https://js.stripe.com https://client.crisp.chat https://apis.google.com;
frame-src   'self' blob: https://js.stripe.com https://game.crisp.chat https://www.google.com;
connect-src … wss://stream.relay.crisp.chat https://www.google.com;
```

`img-src 'self' https: data:` already covers Google's badge imagery — no change there.

**Risk: very low.** This *widens* CSP for three Google endpoints on a page that already loads GA and Stripe. It touches no payment logic and no checkout code path — `/confirmation` renders strictly after Stripe has completed.

**Please also confirm merchant ID `5829406914` — §10.Q5.** It's hardcoded at `GcrOptIn.tsx:15`; a wrong ID also fails silently.

---

## 8. POST-PURCHASE EMAIL — ALREADY IMPLEMENTED

### 8.1 Location

- **Template:** `sendReviewRequestEmail()` in `lib/resend.ts:609-674`
- **Scheduling:** `schedulePostPurchaseReview()` in `lib/email-flows.ts:42` — queues `postpurchase-review` **10 days after shipment** (5–7 days transit + settling time); dispatched at `lib/email-flows.ts:221`
- Review asks bypass marketing-consent suppression (`lib/email-flows.ts:24`) — correct, they're transactional-adjacent

### 8.2 Current copy — it already contains BOTH requested elements

**(a) Link to the purchased product's review form — present.** `lib/resend.ts:628-636`:
```ts
const productPath = (id) => es ? `/es/productos/${id}` : `/products/${id}`
const rt = `&rt=${encodeURIComponent(reviewToken(orderId, customerEmail))}`
// up to 3 purchased items, each linking to its own review form:
`<a href="${utm(productPath(item.id),'postpurchase')}${rt}#reviews">${item.name}</a>`
// primary CTA → first item's review form:
const reviewHref = selectedItems[0]
  ? utm(productPath(selectedItems[0].id),'postpurchase') + rt + '#reviews'
  : utm(`/track?ref=${orderId.slice(-8).toUpperCase()}`,'postpurchase')
```
Deep-links to `#reviews` on the product page, carries a signed `rt` buyer token (so the customer never retypes their email and the 20% thank-you can be verified), and is UTM-tagged.

**(b) "Review us on Google" from `GBP_REVIEW_URL` with your exact fallback — present.** `lib/resend.ts:638-639`:
```ts
const gbpReviewUrl = process.env.GBP_REVIEW_URL
  || 'https://search.google.com/local/writereview?placeid=ChIJRUi8mUFkEygRvoBZgJi_-Tg'
```
Rendered at `lib/resend.ts:665-668`:
```html
<p style="…">Or if you prefer, <a href="${gbpReviewUrl}">review us on Google</a>.</p>
```
The placeid matches your specified fallback character-for-character.

### 8.3 Current live copy (EN)

> **We'd love your thoughts**
>
> Hi {name}, we hope your Petite Lavande box arrived beautifully and brought a little joy. Your review helps other families discover these products — it would mean the world to us.
>
> And as a thank-you, every review earns a one-time 20% code for your next box — whatever the rating.
>
> • {Item 1} • {Item 2} • {Item 3}   ← each links to its own review form
>
> **[ LEAVE A REVIEW ]**
>
> Or if you prefer, *review us on Google*.

Subject: `How was your Petite Lavande box? 🌿` — Spanish variant fully mirrored.

### 8.4 Before / After

**There is no diff to propose.** Both requested elements are already present, in the existing tone, with the exact fallback URL. ✅ **No change proposed.**

One note on the reward line: *"every review earns a one-time 20% code — whatever the rating"* is correctly worded for FTC 16 CFR 465 (the incentive is explicitly not conditioned on sentiment), and those reviews are stamped `incentivized` so they're excluded from both the Google review feed and the JSON-LD in §6. This is well built — leave it alone.

**Action needed is config, not code: set `GBP_REVIEW_URL` in Vercel (§10.M1).** It falls back correctly, but the fallback is a generic write-review link; the env var lets you point at the canonical GBP URL.

---

## 9. INDEXNOW — ALREADY IMPLEMENTED

### 9.1 Key file — already exists

**`public/62f21e010db55da6a7b1725da6787cc4.txt`** ✅ present, served at `https://petitelavande.com/62f21e010db55da6a7b1725da6787cc4.txt`.

### 9.2 `scripts/indexnow-ping.mjs` — already exists

Current content (commit `88486f2`) — reads the **live** sitemap and submits every URL:

```js
const HOST = 'petitelavande.com'
const KEY = process.env.INDEXNOW_KEY || '62f21e010db55da6a7b1725da6787cc4'

const sitemap = await fetch(`https://${HOST}/sitemap.xml`).then(r => r.text())
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])
if (!urlList.length) { console.error('No URLs found in sitemap — aborting'); process.exit(1) }

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList }),
})
console.log(`Submitted ${urlList.length} URLs → HTTP ${res.status} …`)
```

Reading the live sitemap rather than a hardcoded list is the right design — it stays correct as boxes, collections, and journal posts change.

### 9.3 npm script — already exists

`package.json:10`:
```json
"indexnow": "node scripts/indexnow-ping.mjs"
```

### 9.4 Plus automatic pinging you may not know about

`lib/indexnow.ts` + `app/api/portal/indexnow-ping/route.ts` (commit `497d33d`) already ping Bing automatically on portal product/catalog saves. The manual script is the full-site blast.

**Assessment: complete. No change proposed.** Only gap is documentation — see §10.M1 re: adding `INDEXNOW_KEY` to `.env.local.example`.

---

## 10. RISKS & QUESTIONS

### 10.1 🔴 Risks

**R1 — GCR has been silently dead (§7.2).** The single highest-value finding. Everything is built; CSP blocks it. Until fixed, GCR seller ratings cannot accumulate, which also means no seller-rating extensions on Google Ads. Fix is 3 CSP tokens.

**R2 — `_RUN_ALL_PENDING.sql` may not be applied (§6.2).** If not, box reviews can't be written *and* `aggregateRating` silently never renders. Blocks review rich results entirely. **Confirm before we conclude the JSON-LD works.**

**R3 — `/es/checkout` indexable (§1.3).** A transactional page in the index is bad UX and dilutes crawl budget. Low blast radius to fix.

**R4 — Section 5 triggers Merchant Center re-review.** Changing every feed title queues items for re-approval; expect a short window of reduced Shopping visibility. Not a reason to skip it, but time it deliberately.

**R5 — I could not verify anything against the live site.** This environment's egress proxy blocks `petitelavande.com`. Every finding here is static analysis of source, which is why §1.4 stays open pending your `curl` output.

**R6 — I cannot complete a full production build in this environment.** I ran `npm run build` as a baseline. Results:

- ✅ `Compiled successfully in 30.8s`
- ✅ `Finished TypeScript in 30.4s` (no type errors)
- ❌ `Failed to collect page data for /api/admin/resize-images` → `Error: supabaseUrl is required.`

This container has no Supabase credentials, so any module instantiating the Supabase client at import time fails during page-data collection. **This is an environment limitation, not a defect in your code** — and it is pre-existing on this branch, unrelated to anything I've proposed.

**Consequence for Phase 2:** when you ask me to "run the full build," the most I can honestly verify is *compile + TypeScript + lint*. The page-data phase will fail here on missing env regardless of my changes. I will report exactly that rather than claiming a green build. If you want a genuinely full build verified, either supply `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` to this environment, or rely on the Vercel preview deploy.

### 10.2 ✅ Checkout safety

**Nothing I have proposed touches payment logic.** For the record:
- §7's change is a CSP *widening* in `next.config.ts` — no checkout code path
- `/confirmation` renders strictly after Stripe completes; `GcrOptIn` is gated on a verified `paid: true`
- §1.3's `/es/checkout` change adds a **layout with metadata only** — the page component is untouched
- §5 (if approved) touches only feed-title string composition in `lib/google-feed-tsv.ts`
- No changes to `app/api/checkout/*`, `lib/stripe*.ts`, or webhook handling

### 10.3 Environment variables

**Already referenced in code — confirm these are set in Vercel Production:**

| Var | Used at | Status |
|---|---|---|
| `NEXT_PUBLIC_BASE_URL` | canonicals, sitemap, feeds | Must be exactly `https://petitelavande.com` (no `www`, no trailing slash) |
| `GBP_REVIEW_URL` | `lib/resend.ts:638` | **Not in `.env.local.example`** — has a working fallback |
| `INDEXNOW_KEY` | `scripts/indexnow-ping.mjs:6` | **Not in `.env.local.example`** — has a working fallback |
| `NEXT_PUBLIC_BING_SITE_VERIFICATION` | `app/layout.tsx:69` | Required for Bing Webmaster Tools |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | `app/layout.tsx:65` | Required for Search Console |
| `REVIEW_REWARD_ACTIVE` | `lib/review-rewards.ts:15` | `'true'` enables the 20% thank-you |

**Proposed for Phase 2:** document `GBP_REVIEW_URL` and `INDEXNOW_KEY` in `.env.local.example` (they're silently fallback-only today, which is how they get forgotten).

**No new env vars are required by anything I've proposed.**

### 10.4 ❓ Questions I need answered

- **Q1 (§1.4) — blocks closing the Bing issue.** What is the exact `/boxes/...` URL Bing flagged? Or run the `curl` in §1.4 and paste the output. Without this I'd be changing code on a guess.
- **Q2 (§2.3).** `/guide` has two conflicting redirects. `/gift-guides` currently wins. Which do you want — and shall I delete the dead duplicate?
- **Q3 (§5.3).** `petite-baby-gift-box` is seeded `active: false` and `mama-et-bebe` now 301s away. Are those intentional, or should they be back in the feed?
- **Q4 (§6.2) — blocks confirming review rich results.** Has `supabase/migrations/_RUN_ALL_PENDING.sql` been applied to production?
- **Q5 (§7.3).** Confirm GCR merchant ID `5829406914` is correct — a wrong ID also fails silently.

### 10.5 Manual steps for you (regardless of approval)

- **M1** — Set `GBP_REVIEW_URL` and `INDEXNOW_KEY` in Vercel Production
- **M2** — Vercel → Settings → Domains: confirm `petitelavande.com` is **Primary** and `www.petitelavande.com` is attached & redirecting (the `next.config` redirect only fires if www actually resolves to the project)
- **M3** — Consider enabling Vercel Deployment Protection on Preview so preview URLs aren't indexable
- **M4** — After deploy: `npm run indexnow`
- **M5** — Bing Webmaster Tools → URL Inspection → re-request indexing for the flagged `/boxes/*` URL(s)
- **M6** — Google Merchant Center → verify GCR is enabled for merchant `5829406914`

---

## 11. WHAT I PROPOSE TO ACTUALLY CHANGE IN PHASE 2

Deliberately small, because most of the work is already done. **Nothing below is implemented yet.**

| § | Change | File(s) | Risk |
|---|---|---|---|
| 7 | Add `apis.google.com` to `script-src`; `www.google.com` to `frame-src` + `connect-src` | `next.config.ts` | Low — **highest value** |
| 1 | Add `app/es/checkout/layout.tsx` with `robots: { index: false }` | new file | Low |
| 1 | Add `Disallow: /es/checkout` | `public/robots.txt` | Low |
| 1 | Add `robots: { index: false }` to existing metadata | `app/account/layout.tsx` | Low |
| 4 | Fix lightbox alt | `components/ui/ProductCarousel.tsx:298` | Low |
| 4 | Descriptive hero alts (3×) | `app/build/page.tsx:474,476,480` | Low |
| 4 | Descriptive cert alt | `components/ui/CertBadges.tsx:125` | Low |
| 2 | Remove dead duplicate `/guide` redirect | `next.config.ts:51` | Low — **pending Q2** |
| 10 | Document `GBP_REVIEW_URL` + `INDEXNOW_KEY` | `.env.local.example` | None |
| 5 | **Feed titles — ONLY IF YOU EXPLICITLY APPROVE §5** | `lib/google-feed-tsv.ts` | Medium (R4) |

**Explicitly NOT changing:** the `.js.map` X-Robots-Tag (tested correct), the `visible`-based box noindex (deliberate, and pending Q1), the www→apex redirect (already correct), the homepage description (already your exact string), the review JSON-LD (already to spec), `GcrOptIn.tsx` itself (already to spec), and the review email (already contains both elements).

---

## ⏸ PHASE 1 COMPLETE — PLEASE REVIEW

No files were modified. `REVIEW.md` is the only file created.

**To proceed, reply `approved`** — plus:
- answers to **Q1** and **Q4** (these two actually gate conclusions),
- an explicit **"approve section 5"** if you want the feed titles changed (I will not touch them otherwise),
- any edits to the table in §11.

---
---

# PHASE 2 — APPLIED

**Approved scope:** "fix the CSP, /es/checkout, /account, and the alts."
**Not approved, not touched:** §5 feed titles, the §2.3 `/guide` duplicate redirect (Q2 unanswered), `.env.local.example` documentation.

## Changelog — every file changed

| File | Change |
|---|---|
| `next.config.ts` | CSP: `+https://apis.google.com` to `script-src`; `+https://www.google.com` to `connect-src` and `frame-src`. Comment explains why. **Unblocks Google Customer Reviews.** |
| `app/es/checkout/layout.tsx` | **New file.** `robots: { index: false }` + Spanish title. Fixes the indexable Spanish checkout. |
| `app/account/layout.tsx` | Added `robots: { index: false }` to existing metadata. |
| `components/ui/ProductCarousel.tsx:298` | Lightbox `alt=""` → `` alt={`${product.name} — full size view`} `` |
| `app/build/page.tsx:474,476,480` | 3× `alt="Build Your Box"` → `"Build your own organic baby gift box — Petite Lavande keepsake basket"` |
| `components/ui/CertBadges.tsx:125` | `alt="certificate"` → `` alt={`${label(opened)} certificate`} `` |

## Verification actually performed

Full production build, then a real server with headers and HTML inspected:

- ✅ `next build` → **exit 0**, `Compiled successfully`, `Finished TypeScript` clean. (Required placeholder env vars — the repo instantiates Supabase/Resend/Stripe clients at module load, so page-data collection cannot run without them. Same failure existed on the untouched baseline, so it is environmental, not a regression.)
- ✅ Both `/account` and `/es/checkout` appear in the built route table.
- ✅ **CSP live** — `curl -D -` confirms all three hosts present in the served header.
- ✅ `/account` → `<meta name="robots" content="noindex">`
- ✅ `/es/checkout` **with `SPANISH_ACTIVE=true`** → HTTP **200** + `<meta name="robots" content="noindex">` (the state where the bug actually mattered)
- ✅ Controls unaffected: `/` and `/es` both still `<meta name="robots" content="index, follow">`
- ✅ Alt rescan: **0** missing / bare-empty alts remain on public pages
- ✅ `X-Robots-Tag` still fires on `/test.js.map` and is **absent** on `/` — empirically confirms the §1.2 finding that the rule does not over-match

⚠️ No ESLint run: the repo has no `eslint.config.*`, so `npm run lint` cannot execute (pre-existing, unrelated).

## ⚠️ One approved item I deliberately did NOT apply

§11 listed `Disallow: /es/checkout` in `public/robots.txt` alongside the noindex. **I left robots.txt unchanged, on purpose.**

A `Disallow` stops crawlers from *fetching* the page — which means they never see the `noindex` meta tag, and the URL can still surface as a bare link. Adding it would have undermined the fix I just made. The meta `noindex` is the correct and sufficient mechanism.

Worth knowing: `/checkout` (English) currently has **both**, which is the same self-defeating combination. It is harmless in practice — neither checkout URL is externally linked — so I left it alone as out of scope. Say the word if you want `Disallow: /checkout` removed so its noindex can actually be read.

## Still open — unchanged from Phase 1

- **Q1 — the Bing `/boxes/*` question is NOT resolved.** No code change was made, correctly: nothing in the codebase can noindex a *visible* box. Still needs the flagged URL or the §1.4 `curl` output.
- **Q4 — `_RUN_ALL_PENDING.sql`.** If unapplied, box reviews can't be written and `aggregateRating` silently never renders. **This gates whether §6 works at all.**
- **Q3 — feed inventory** (`petite-baby-gift-box` inactive, `mama-et-bebe` redirected away).
- **Q2 — `/guide` duplicate redirect** left in place pending your answer.

## Manual steps for you

1. **Vercel env:** set `GBP_REVIEW_URL` and `INDEXNOW_KEY` (both currently fallback-only). Confirm `NEXT_PUBLIC_BASE_URL` is exactly `https://petitelavande.com`.
2. **Vercel → Settings → Domains:** confirm `petitelavande.com` is **Primary** and `www.petitelavande.com` is attached — the `next.config` www→apex redirect only fires if www actually resolves to the project.
3. **After deploy:** `npm run indexnow`
4. **Bing Webmaster Tools:** re-request indexing for the flagged `/boxes/*` URL(s), and send me the §1.4 `curl` output.
5. **Merchant Center:** verify GCR is enabled for merchant `5829406914`. Then place a test order and confirm the opt-in prompt appears on `/confirmation` — **it should now render for the first time.**
6. **Consider** Vercel Deployment Protection on Preview so preview URLs aren't indexable.

---

## ADDENDUM — 2026-08-15, post-Phase-2 answers from Emily

- **Q5 ✅ resolved:** GCR merchant ID `5829406914` confirmed correct.
- **Q2 ✅ resolved & applied:** keep `/guide` → `/gift-guides`; the dead duplicate `/guide` → `/gifts` line was deleted from `next.config.ts` (it was unreachable — first match wins — so live behavior is unchanged).
- **Q1 update:** flagged URL is `/boxes/signature-baby-gift-box`, and Bing's crawl was **fresh (2026-08-15 10:18), not cached** — which rules out explanation #1 (stale verdict). Emily is verifying the `visible` flag and Vercel settings herself; no further investigation from this side. Note for that check: nothing in the codebase can emit noindex for a visible box, and Vercel auto-injects `X-Robots-Tag: noindex` on **preview** deployment URLs — so confirm the apex domain is serving the production deployment.
- **§5 data correction:** the §5.3/§5.4 tables were built from `scripts/seed-catalog.mjs`, **not the live DB** (no DB access in this environment). Emily reports the live data differs — e.g. **The Petite is live at $65–95** (the seed says `active: false`, $50). Treat every current-state cell in those tables as indicative only; if §5 is ever approved, re-derive titles from the live `products` table first.
- **§5 remains NOT applied**, per explicit instruction.
