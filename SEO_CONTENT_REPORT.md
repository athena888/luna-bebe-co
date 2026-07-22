# SEO Content Report — Wave A (Occasion Pages)

**Date:** 2026-07-21 · **Brief:** SEO_CONTENT_BRIEF.md · **Status:** Wave A complete; waves B (audience pages) and C (blog posts) pending.

## Pages created — 7 new occasion pages at `/gifts/<slug>`

| Path | Primary keyword | Title tag |
|---|---|---|
| /gifts/baby-shower-gift-for-mom | baby shower gift for mom | Baby Shower Gift for Mom \| Petite Lavande |
| /gifts/new-mom-gift-box | new mom gift box | The New Mom Gift Box \| Petite Lavande |
| /gifts/newborn-gift-set | newborn gift set | Newborn Gift Set \| Petite Lavande |
| /gifts/gift-for-second-baby | gift for second baby | Gift for a Second Baby \| Petite Lavande |
| /gifts/twin-baby-gifts | twin baby gifts | Twin Baby Gifts \| Petite Lavande |
| /gifts/baby-gift-from-coworkers | baby gift from coworkers | Baby Gift from Coworkers \| Petite Lavande |
| /gifts/c-section-care-package | c-section care package | C-Section Care Package \| Petite Lavande |

Each page: unique H1/intro (gift-giver POV), real-data product module (category filter, portal-overridable per page), "For This Moment" section, 5 FAQs with FAQPage JSON-LD, BreadcrumbList JSON-LD, journal cross-links, canonical + OG. Pages are server components in the existing `/gifts/[slug]` system — automatically in the sitemap, on the /gift-guides hub (tagged), and cross-linked from every other occasion page via the shared "Explore more" rail.

## Deliberate deviations from the brief

- **`corporate-baby-gifts` slug skipped** — /corporate already owns that exact keyword in its title; a second page would cannibalize. The journal guide (corporate-baby-gifts-guide-for-hr) covers the informational angle and links to /corporate.
- **4 of the brief's 12 slugs already existed** as equivalent pages and were left in place rather than duplicated: `postpartum-gift-basket`→postpartum-care-package, `organic-baby-gifts`→organic-newborn-gift-box + organic-baby-clothes-gift-set, `french-baby-gifts` (exists), `luxury-baby-gift-basket`→luxury-baby-shower-gift.
- **Owner constraint rulings applied** (2026-07-21): city names in journal posts only; materials claim standardized to "organic cotton from GOTS-certified makers"; "recovery" allowed in journal only (c-section page uses comfort language exclusively).

## Internal link map (new pages)

- Occasion ↔ occasion: all 13 landing pages link to each other via the "Explore more" rail (mesh complete, every page ≤2 clicks from any /gifts page).
- Journal → occasion links exist from prior work; occasion → journal added per page:
  - baby-shower-gift-for-mom → new-mom-gift-ideas-that-arent-flowers, best-organic-baby-shower-gifts-2026
  - new-mom-gift-box → gifts-for-the-new-mom-who-has-everything, what-to-put-in-a-postpartum-care-package
  - newborn-gift-set → best-organic-baby-shower-gifts-2026, why-organic-cotton-matters-baby-clothes
  - gift-for-second-baby → gifts-for-the-new-mom-who-has-everything, what-to-put-in-a-postpartum-care-package
  - twin-baby-gifts → what-to-put-in-a-postpartum-care-package, why-organic-cotton-matters-baby-clothes
  - baby-gift-from-coworkers → corporate-baby-gifts-guide-for-hr, best-organic-baby-shower-gifts-2026
  - c-section-care-package → the-things-no-one-warns-you-about-postpartum-honestly, what-to-put-in-a-postpartum-care-package

## Needs human input

- [ ] **Product picks per page** (optional): each page currently features products by category filter. In Portal → Gift Guides you can pin explicit products per page for tighter curation.
- [ ] **Hub tags**: new pages appear on /gift-guides with tags (Baby Shower, For Mama, Newborn, Second Baby, Twins, From the Office); rename in the portal if desired.
- [ ] **Wave B** (6 audience pages: for-daughter, for-daughter-in-law, for-best-friend, for-coworker, for-wife, for-sister) and **Wave C** (6 remaining blog posts) — say the word.

## Not touched (per brief)

Product pages, checkout, payment code paths. Existing 6 landing pages unchanged except the GOTS phrasing normalization.
