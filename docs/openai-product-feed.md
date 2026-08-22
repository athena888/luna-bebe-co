# OpenAI Ads product feed

A dedicated product feed for **OpenAI / ChatGPT Ads only**. It is completely
separate from the Google Merchant feed and shares no code with it.

## Feed URL

```
https://petitelavande.com/api/feeds/openai-products
```

Public, unauthenticated (the fetcher can't log in), `text/csv; charset=utf-8`,
UTF-8, CRLF line endings, one header row. Cached at the edge for one hour
(`s-maxage=3600`), so prices and availability are never more than an hour stale.

Two response headers report the build without leaking anything: `X-Feed-Rows`
and `X-Feed-Rejected`.

## Spec

Built against the stable file-upload product spec, fetched 2026-08-21:

- <https://developers.openai.com/commerce/specs/file-upload/products>
- <https://developers.openai.com/ads/product-feeds>

Two things from that spec drive the design:

1. **CSV/TSV only.** JSON, XML, RSS and Atom are explicitly not supported.
2. **`is_eligible_checkout` requires `is_eligible_search=true`.** Both are
   `false` here, which is consistent — this feed enables Ads only, not OpenAI
   search or checkout.

## Source of product data

Everything comes from the same tables the storefront renders from. Nothing in
the feed is invented — no prices, stock, claims, reviews or URLs.

| Field | Source |
|---|---|
| item_id | `box-<slug>--<variant key>` — the same stable id pattern the site uses |
| title | `catalog_products.name` (+ variant label when a box has several) |
| description | `catalog_products.subtitle` + the real resolved contents list |
| url | `/boxes/<slug>` or `/boxes/<slug>?<param>=<variant>` |
| image_url / additional_image_urls | `catalog_variants.images` |
| price | `catalog_variants.price` (cents → `"95.00 USD"`) |
| availability | see below |
| brand / seller_name | constant `Petite Lavande` |
| product_category, age_group, ads_metadata | derived from the real slug and price |

Code:

- `lib/openai-feed-core.ts` — pure: validation, formatting, CSV. No DB, no network, fully unit-tested.
- `lib/openai-feed.ts` — reads the catalog and produces feed inputs.
- `app/api/feeds/openai-products/route.ts` — the hosted endpoint.
- `scripts/openai-feed-export.mjs` — the local export.

The endpoint and the export both call `buildOpenAiFeed()`, so they cannot drift.

## Fields emitted

Required by the spec: `item_id`, `title`, `description`, `url`, `image_url`,
`price`, `availability`, `brand`, `seller_name`, `target_countries`,
`is_ads_eligible`, `is_eligible_search`, `is_eligible_checkout`.

Also emitted: `condition` (`new`), `is_digital` (`false`), `identifier_exists`
(`no` — hand-assembled boxes have no GTIN and we never invent one),
`sale_price`, `additional_image_urls`, `product_category`, `group_id`,
`item_group_title`, `age_group`, `ads_metadata`.

Fixed values: `brand` and `seller_name` = `Petite Lavande`,
`target_countries` = `US`, `is_ads_eligible` = `true`.

**Reviews are deliberately omitted.** `review_count`, `star_rating`,
`store_review_count` and `store_star_rating` appear only when a verified source
already backs them. Ratings are never generated.

## How availability works

Boxes are assembled to order from component stock, so a box variant is
`in_stock` while its parent product is active and visible. Boxes that are
inactive, or hidden for the season, never reach the feed at all — `getBoxProducts()`
filters on `active = true` and `visible = true` before the feed sees them.

Single items (currently switched off, see below) map real inventory:
a positive `inventory.quantity` → `in_stock`, zero → `out_of_stock`,
a product flagged `preorder` → `pre_order`, and no inventory row → `in_stock`
because that product is not stock-tracked and the store still sells it.

Valid values are only `in_stock`, `out_of_stock`, `pre_order`, `backorder`,
`unknown`. Nothing unavailable is ever advertised as in stock.

## How images are selected

The first image on the variant is the primary `image_url`; the rest become
`additional_image_urls` (up to ten). The validator requires HTTPS and a
`.jpg`/`.jpeg`/`.png` extension, matching the spec's JPEG/PNG requirement — a
product whose only image is another format is **reported as rejected rather
than substituted**, and the site's own image is never touched to satisfy this
feed.

## Product selection

Included: every live, publicly purchasable gift box variant — currently 9.

Excluded by construction: inactive products, seasonally hidden products
(`visible = false`), inactive variants, and anything without a resolvable
image or landing page.

Single items are excluded by the `INCLUDE_SINGLE_ITEMS` switch at the top of
`lib/openai-feed.ts`. They are components sold individually rather than the
advertised product line, matching how the Google campaign is scoped. Flip that
constant to `true` to include them; they already carry full availability and
gallery handling.

`build-your-own-gift-box` **is** included: it is a real, fixed-price, buyable
box. It is hidden from the site's own navigation (see `lib/catalog-visibility.ts`)
but exists precisely to be an ad landing page.

## Generating the CSV locally

```bash
npm run feed:openai
```

Writes `petite-lavande-openai-products.csv` in the repo root and prints every
row plus every rejection with its reason. The file is gitignored — generated
catalog data is not committed.

## Validating it

```bash
npm test                       # 17 focused feed tests, part of the suite
curl -sS https://petitelavande.com/api/feeds/openai-products | head -3
```

The validation layer runs before any row is written. A product is rejected,
with a reason, for: missing item_id, an id over 100 chars, a duplicate id,
missing title, empty description, missing/malformed/off-host URL, missing or
malformed image, a non-JPEG/PNG image, invalid price, a sale price that isn't
below list price, or an invalid availability value. One bad product never
corrupts the file — it is dropped and reported.

The public endpoint never exposes reasons, stack traces, credentials or
database internals; on failure it returns a bare 503. Diagnostics go to the
server log and to the local export.

## Adding a new product

Nothing feed-specific to do. Add the box in **Portal → Gift Boxes** as usual —
if it is active, visible, priced and has an image, the next fetch includes it.
Verify with `npm run feed:openai`.

## Google Merchant feed independence

The Google feed is **untouched and independent**:

- Google TSV: `/product-feed.tsv` ← `lib/google-feed-tsv.ts`
- Google XML: `/feeds/google.xml` ← `lib/google-feed.ts`
- OpenAI CSV: `/api/feeds/openai-products` ← `lib/openai-feed*.ts`

No file in this feature imports, modifies or re-exports any Google feed module.
That separation is deliberate: editing a title, description, image or price in
the Google feed puts those items back into Merchant Center review for up to
three business days, so the OpenAI feed must never be able to trigger one.

## Connecting the feed in OpenAI Ads Manager

Per <https://developers.openai.com/ads/product-feeds>, the Ads catalog transfer
uses **SFTP** — the Ads system does not fetch an arbitrary hosted URL. The
hosted endpoint above remains useful for inspection, validation and any other
integration, but the connection procedure is:

1. In Ads Manager, open the **Feeds** area.
2. Create the feed connection there and read the SFTP location and credentials it shows.
3. Generate the file locally with `npm run feed:openai`.
4. Upload `petite-lavande-openai-products.csv` to that SFTP location.
5. Confirm the ingested row count matches the export's row count (9 today).

Delta updates are supported for later incremental pushes.

**No campaign is created, activated, budgeted or funded by any of this.** This
is feed infrastructure only; launching ads is a manual step in Ads Manager.
