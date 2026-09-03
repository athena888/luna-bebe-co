# Petite Lavande — Conversion Redesign Audit

Audit completed before implementation. Everything below is a statement about
the repository as it stood on the `master` branch, not a proposal.

## 1. Storefront routes (public, English)

| Route | Purpose | Status after redesign |
|---|---|---|
| `/` | Homepage | **Rebuilt** — occasion-led conversion flow |
| `/boxes` | Ready-made box hub | Preserved (card grid, catalog-driven) |
| `/boxes/[slug]` | Box PDP (parent product + variants) | **Rebuilt above the fold**, sticky mobile CTA |
| `/build` | Build-your-own configurator | Preserved, demoted in nav |
| `/collections/[slug]` | Category collections | Preserved |
| `/products/[id]` | Single-item PDP | Preserved |
| `/gifts/[slug]` | 15 SEO landing pages | Preserved (SEO equity — see §6) |
| `/gift-guides`, `/journal`, `/journal/[slug]` | Long-form search traffic | Preserved |
| `/story`, `/our-cotton`, `/faq`, `/press`, `/corporate` | Brand + trust | Preserved |
| `/same-day-delivery` | Seattle courier landing page | Preserved |
| `/gift-cards`, `/track`, `/account`, `/checkout`, `/confirmation` | Commerce | Preserved |
| `/legal/*` | Privacy / Terms / Returns | Preserved |
| `/es/*` | Full Spanish mirror (12 routes) | Preserved |
| **`/baby-shower-gifts`** | Meta ad landing page | **New** |
| **`/new-mama-gifts`** | Meta ad landing page | **New** |
| **`/newborn-gifts`** | Meta ad landing page | **New** |
| **`/team-new-parent-gifts`** | Meta ad landing page | **New** |

`/first-christmas-gifts` was **not** built. The only seasonal SKU in the catalog
(`baby-first-christmas-gift-box`) is an unpublished draft — `catalog_products.active = false`,
which makes `getBoxProduct()` 404 it. A landing page whose products 404 converts
at zero and burns ad spend. The page is a one-file addition the moment that box
is published; see `lib/gifting.ts` → `OCCASIONS`.

## 2. Cart / checkout logic

- Cart is `sessionStorage` (`pl_box_selection`) + an optional `pl_box_ref`
  marking an untouched prebuilt box so it sells at the box price rather than
  summed item retail (`lib/cart.ts`).
- Checkout posts to `/api/checkout/session`, which **re-derives the authoritative
  price server-side** from `slug` + `variantKey`. Left completely untouched.
- Stripe session → `/api/checkout/webhook` → `lib/stripe-webhook-handler.ts`.
  Untouched.

**Gap found and fixed:** the order record has a `letter_content` column, the
checkout page has `letter` state, and `/api/checkout/session` persists it — but
**nothing in the storefront ever wrote `pl_letter`**. The gift message the site
promises on every box page had no input field; buyers could only type it into a
generic "special requests" box. A dedicated card-message field is now rendered at
checkout, writing the existing `letter` state. No API or schema change.

## 3. Real product sources

Two layers, both live in Supabase:

- `catalog_products` + `catalog_variants` (modern) → `lib/catalog-db.ts`.
  Parent box products with priced variants and a `contents` list referencing the
  items layer. This is what `/boxes/[slug]` sells. **This is the source the
  redesign uses everywhere.**
- `prebuilt_boxes` (legacy) → `lib/prebuilt-boxes-db.ts`. Still renders the
  `AestheticBoxes` grid at the bottom of `/boxes`. Untouched.
- `products` (items layer) → `lib/products-db.ts`. Individual pieces.

Known live box slugs (from `components/layout/Header.tsx`, verified by
`npm run check:nav`): `signature-baby-gift-box` (The Petite),
`themed-baby-gift-box` (Mama et Bébé), `new-mom-gift-box` (The Mama Box).
`build-your-own-gift-box` is Shopping-feed-only and hidden from the site
(`lib/catalog-visibility.ts`).

**No SKU, price, name or content list is hard-coded anywhere in the redesign.**
Every product card resolves at request time from `getBoxProducts()`. When the
catalog is empty the sections render nothing rather than a placeholder product.

## 4. Reviews

`reviews` table, `approved = true` gate, read publicly via `/api/reviews?product_id=`
and pooled per box as `box-<slug>`. `incentivized` rows are excluded from
JSON-LD and the Google review feed.

The redesign adds `lib/gift-social-proof.ts`, which reads the **same table with
the same gate** to surface the highest-rated recent quotes near the buy
decision. It returns an empty array when there are no approved reviews, and
every social-proof section is conditional on that. **Nothing is fabricated: no
review text, no names, no star counts, no review totals.**

`NEXT_PUBLIC_SHOW_REVIEWS` still gates the homepage testimonial block; the new
compact proof strip respects the same flag.

## 5. Shipping configuration and visible claims

Single sources of truth, all preserved:

- `FREE_SHIPPING_THRESHOLD` — `$50` (`lib/products.ts`, env-overridable). Read by
  the perks strip, cart drawer, FAQ and chat assistant.
- `SHIPPING` — standard `$9.95` ("Delivery time varies by destination"),
  premium rush `$28` (1–2 business days), same-day courier `$15` (Seattle +
  Eastside ZIPs only, order by 1 PM PT).
- `lib/delivery.ts` computes a **ZIP-specific** arrival window. Per the
  2026-08-17 decision it prints **no date at all** without a destination ZIP.

Claims used in the new copy, and what makes each true:

| Claim | Basis |
|---|---|
| "Personalized gift message" | `letter_content` on the order, printed on the card; now actually collected at checkout |
| "Gift-ready presentation" | Every box PDP already states: woven seagrass basket with lid, ribbon-tied and sealed by hand |
| "Hand-packed in Seattle" | Established claim across `/press`, `/same-day-delivery`, `lib/delivery.ts` (ships from Seattle, WA) |
| "Free shipping over $50" | `FREE_SHIPPING_THRESHOLD` |
| "Ships directly to her door" | `shipToRecipient` at checkout — receipts go to the buyer, no prices in the box |

Claims deliberately **not** made anywhere in the new copy: delivery speed
without a ZIP, "organic" as a blanket property of a whole box (the 2026-09-02
commit narrowed this to the cotton specifically — the redesign keeps `organic`
strictly at item level, where `products.organic` is set), zero-waste,
sustainability, certifications, country of origin, handmade, or any review
count.

## 6. SEO

- No URL was removed or redirected. All 15 `/gifts/[slug]` pages, the journal,
  and the gift guides keep their titles, metadata and internal links.
- The four new landing pages are **new URLs**, each with its own H1, canonical,
  metadata and `ItemList` + `FAQPage` JSON-LD. They target ad message-match, not
  the informational queries `/gifts/*` already ranks for, so they do not
  cannibalise them; each links up to its `/gifts/*` cousin.
- `app/sitemap.ts` gained the four routes.
- One `<h1>` per page; semantic `<section>`/`<h2>` structure throughout.

## 7. Analytics events

- GA4 + Google Ads through one `gtag.js` (`app/layout.tsx`), Meta Pixel
  alongside it, all gated by `lib/analytics-gate.ts`.
- `view_item`, `add_to_cart`, `begin_checkout` fire client-side
  (`lib/analytics-events.ts`); `purchase` fires **server-side** from the Stripe
  webhook so ad blockers cannot erase revenue.
- `TrackViewItem` already fires on box PDPs with the Merchant feed offer id.

Redesign impact: **no event was renamed, moved or removed.** The occasion
landing pages reuse `TrackViewItem` for their featured products so ad traffic
now reports product views on the page the ad actually points at.

## 8. Existing image assets

- `public/` — logos (`logo-white.png`, `logo-color.webp`), sprigs, decor
  (`lavender-divider`, `sprig-tr/bl`, `card-bonnet`, `card-carriage`),
  `home-collection.webp`. All preserved.
- Supabase `home-images` bucket, addressed through `lib/image-slots.ts`
  (`IMAGE_SLOTS`) and read by `getSiteImage`/`getSiteImages`. Optional phone
  crops live at `<key>.mobile`; per-slot scrims are tunable in the portal.
- Product/box photography lives on `catalog_variants.images` and
  `products.image` — real, current, and reused as-is by every new product card.

## 9. Which existing assets are good enough to keep

**Keep and reuse unchanged:** all box variant photography and item photos (they
are the actual product and must stay truthful), the logo lockups, the lavender
divider and sprig decor, `home.collection`, and every per-box background.

**Not good enough for the new homepage:** the rotating hero gallery. Those
frames are product-forward, not gift-forward — they answer "what do you sell?"
rather than "this is a gift for her". They stay as the fallback (the hero still
renders them if the new slot is empty), but the redesign asks for a purpose-shot
hero.

## 10. Asset gap list

Ten slots, all registered in `lib/image-slots.ts` under the new **Gifting**
group so they can be uploaded from Portal → Site Images with no deploy. Full
crop/subject specification in `docs/PHOTO_ASSETS.md`.

| Slot key | File name | Blocks |
|---|---|---|
| `gift.hero` | `homepage-hero-gifting.jpg` | Homepage hero (LCP) |
| `gift.occasion.baby_shower` | `occasion-baby-shower.jpg` | Shop by Moment + `/baby-shower-gifts` hero |
| `gift.occasion.new_mama` | `occasion-new-mama.jpg` | Shop by Moment + `/new-mama-gifts` hero |
| `gift.occasion.new_arrival` | `occasion-new-arrival.jpg` | Shop by Moment + `/newborn-gifts` hero |
| `gift.occasion.team` | `occasion-team-gifting.jpg` | Shop by Moment + `/team-new-parent-gifts` hero |
| `gift.basket_reuse` | `basket-nursery-reuse.jpg` | "The basket lives on" |
| `gift.companions` | `little-companions-story.jpg` | Little Companions |
| `gift.material` | `material-seagrass-closeup.jpg` | Tactile material world |
| `gift.packing` | `packing-hands.jpg` | How gifting works |
| `gift.mama_and_baby` | `mama-and-baby-pairing.jpg` | Core differentiator |

Every section that uses one of these degrades gracefully: with no photo
uploaded it renders a typographic composition on the parchment palette, never a
broken image and never an invented product shot.

## 11. What was deliberately not touched

`app/api/**` (except nothing), Stripe, the webhook handler, inventory,
`lib/delivery.ts`, `lib/pricing.ts`, customer accounts, the email/outreach
pipeline, the portal, the Spanish routes' data plumbing, the product feeds, and
every existing SEO page. The redesign is presentation, routing and copy.

---

# Post-implementation review

## Final CRO test

Answered per page, against what the build actually renders.

### `/` — homepage

1. **What is the visitor trying to accomplish?** Find a gift for a specific
   person and a specific occasion, usually within days of the event.
2. **Is their exact situation reflected?** Yes — the four moments are the second
   section, above any brand storytelling, and each is a photograph with its own
   destination.
3. **One obvious primary action?** Yes. "Shop baby shower gifts" is the only
   filled button in the hero; "Send a new mama gift" is outlined. The hero holds
   exactly two links.
4. **Are products visible soon enough?** Section 3, immediately after the four
   moments. On phones the moments are a 2×2 grid rather than four full-width
   cards, which was worth roughly two screens of scroll.
5. **Excessive choice?** Three products, never more. `giftLadder()` will not
   return four.
6. **Is the difference obvious?** The h1 states it, and section 5 is nothing
   else.
7. **Is the price understandable?** Real price per card, directly above the CTA;
   a range only where the product has variants.
8. **Is proof close to the decision?** Section 4, adjacent to section 3, and each
   card carries its own rating when it has ≥3 approved reviews.
9. **Shipping/gift concerns answered?** Free-shipping bar in the hero proof line,
   the whole of section 9, and the ship-direct note.
10. **Mobile friction?** Headline, support and primary CTA are above the fold;
    no horizontal overflow at 390px (measured); the hero photo is capped at 40vh.

### `/baby-shower-gifts` and its three siblings

1. **What is the visitor accomplishing?** Acting on the ad they just tapped.
2. **Situation reflected?** The h1 *is* the ad's promise — that is the page's
   whole reason to exist.
3. **One primary action?** One button in the hero, anchored to the three gifts.
4. **Products soon enough?** Directly under the hero.
5. **Excessive choice?** Three, with the rung phrase on each.
6. **Difference obvious?** The Mama + baby band sits between the products and
   the presentation.
7. **Price?** Real, on each card.
8. **Proof near the decision?** Immediately after the three gifts.
9. **Shipping/gift concerns?** The FAQ, then a closing CTA.
10. **Mobile?** Photo capped at 42vh so the headline and button are on the first
    screen; measured no overflow at 390px.

### `/boxes/[slug]` — the PDP

1. **Accomplishing?** Deciding whether *this* is the gift to send.
2. **Situation reflected?** "Best for: Baby shower · New arrival" is the first
   line above the name.
3. **One primary action?** One button, "Send this gift — $XX". The sticky mobile
   bar scrolls to it rather than duplicating it.
4. **Products visible?** It is the product.
5. **Excessive choice?** Variants only where the product genuinely has them.
6. **Difference obvious?** "For Mama" is its own contents group even when it
   holds one item, and "Why this gift" says it in a sentence.
7. **Price?** Above the fold, above the button.
8. **Proof near the decision?** Star line links to the reviews; it appears only
   at ≥3 approved reviews.
9. **Shipping/gift concerns?** Two lines under the button, then the details
   accordion; the delivery date still refuses to appear without a ZIP.
10. **Mobile?** Contents moved below the fold, sticky CTA above 24px of reserved
    footer space.

**Problems found during review and fixed:**

- The hero rendered a phone block and a desktop block, giving the homepage **two
  `<h1>`s and two of every hero link**. Rewritten as one markup that reflows.
- The empty-slot placeholder printed the slot key (`Photo pending · gift.hero`)
  to customers. It now prints only outside production.
- The tier card's "Best for" line was being fed the budget string, producing
  "Best for $125 · The signature baby shower gift". Split into `bestFor` (from
  the catalog's occasion mapping) and `note` (the rung phrase), and the budget
  label was dropped: the card already prints the real price.
- Four full-width occasion cards put the product section four screens down on a
  phone. Now a 2×2 grid.
- A 4:5 tier photo on a 390px screen pushed the price most of a screen below the
  fold. Square on phones, portrait from `sm`.
- The sticky bar was inside `<main>`, whose `overflow-x: clip` (there to kill
  mobile side-scroll) also clips a fixed descendant's paint. Moved out.
- `/same-day-delivery` promised **"2–5 business days" nationwide** in two places
  while `lib/delivery.ts`, the FAQ, the Terms and the chat assistant all say 2–6
  — and the estimator's own East Coast band is 5–6. Both lines now derive from
  `NATIONAL_TRANSIT`.

## Final brand test

Cover the logo. What is left: a woven basket that keeps living in the nursery, a
gift that is explicitly for two people, companions with temperaments rather than
SKUs, macro texture instead of feature icons, hands tying a ribbon, parchment
and oat and a burgundy that only ever marks one thing. The palette is warm and
the type pairs a display serif with a quiet sans. It is not a beige baby store
with a different logotype.

## Verified

- `npx tsc --noEmit` — clean.
- `npx next build` — clean, no warnings. (Requires `STRIPE_SECRET_KEY` and
  `RESEND_API_KEY` to be present, as it did before this change.)
- `npm test` — 201/201 passing.
- Every route returns 200 against a production server: `/`, `/occasions`, the
  four occasion pages, `/checkout`, `/same-day-delivery`, `/faq`, `/story`,
  `/corporate`, `/gifts/organic-baby-shower-gifts`, `/sitemap.xml`.
- Sitemap contains the five new URLs and every pre-existing one.
- One `<h1>` per page, measured on the rendered HTML.
- No horizontal overflow at 390px or 1440px on `/`, `/occasions`,
  `/baby-shower-gifts` (measured `scrollWidth === clientWidth`).
- The checkout card-message field was driven in a real browser: it renders,
  counts to 400, and persists to `pl_letter` — the key the page already read and
  the payload already sent.
- Empty-state behaviour confirmed against an unreachable database: every page
  renders, no section shows a placeholder product, no review, or a broken image.

## The component system

| Brief's name | Where it lives |
|---|---|
| `OccasionCard` | `components/gifting/OccasionCard.tsx` |
| `OccasionHero` | `components/gifting/OccasionHero.tsx` |
| `GiftTierCard` | `components/gifting/GiftTierCard.tsx` |
| `GiftRecommendationSection` | `components/gifting/GiftRecommendationSection.tsx` |
| `ReviewQuote` | `components/gifting/ReviewQuote.tsx` |
| `UGCCard` | `components/gifting/UGCCard.tsx` (with `UGCSection`) |
| `BasketReuseSection` | `components/gifting/sections.tsx` |
| `CompanionStoryCard` | `components/gifting/sections.tsx` (with `LittleCompanionsSection`) |
| `MaterialStory` | `components/gifting/sections.tsx` |
| `HowGiftingWorks` | `components/gifting/sections.tsx` |
| `CorporateGiftBanner` | `components/gifting/sections.tsx` |
| `MobileStickyPurchaseCTA` | `components/gifting/MobileStickyPurchaseCTA.tsx` |
| `EditorialProductCard` | **Not built.** `GiftTierCard` is the product card, and nothing in the finished design needed a second, quieter one. A component with no caller is a maintenance cost, not a system. |

Plus: `HomeHero`, `ShopByMoment`, `SocialProofStrip`, `DifferentiatorSection`,
`FounderNote`, `BuildYourOwnFooterNote`, `SlotPhoto` (server-rendered managed
photography), `TrackGiftList` (GA4 `view_item_list`), and `primitives.tsx`
(`Eyebrow` / `SectionTitle` / `Lede` / `Cta` / `ProofLine` / `PriceLabel`).

The homepage is a composition of these, not one component: `app/GiftingHome.tsx`
is 140 lines and holds no markup of its own beyond the section order.

## Known, deliberate, and not done

- **`/` renders dynamically rather than as ISR.** Supabase's client uses
  uncached `fetch`, which opts the route out of static rendering regardless of
  the `revalidate` export. This is unchanged from the previous homepage. The
  remedy — wrapping the slot reads in `unstable_cache` — would also delay portal
  photo edits from appearing, so it belongs in a separate change with the owner's
  input on how stale is acceptable.
- **Spanish keeps the previous homepage** (`app/HomeView.tsx`, unchanged) and its
  previous navigation. The redesign targets cold US Meta traffic; a half-
  translated funnel, or a Spanish nav pointing at English-only occasion pages,
  would be a regression for a Spanish visitor. The box product page *is*
  redesigned in both locales, because its copy is fully translated.
- **No `/first-christmas-gifts`.** See §1.
- `npm run lint` fails on this branch as it did before it: the repo has no
  `eslint.config.js`, and ESLint 9 requires one.
