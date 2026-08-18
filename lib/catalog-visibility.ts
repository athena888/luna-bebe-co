// Boxes that exist ONLY to give Google Shopping a landing page, and should not
// be discoverable on the site itself (Emily 2026-08-18: "I want build your own
// box being found on shopping google but don't want a build your own box as a
// prebuilt box shown on the website").
//
// A configurator page can't carry a Merchant listing — the feed price has to
// match a price the landing page actually sells at — so build-your-own-gift-box
// is a real, buyable fixed-price box. But at $29.97 it sits below the $65 brand
// floor, so on the /boxes hub it read as an off-brand product, and in organic
// search it undercut the real boxes.
//
// Hidden here rather than with `visible = false` in the DB, because that flag
// also drops a box from the product feed and would defeat the entire purpose.
// These slugs are: excluded from the /boxes hub, excluded from the sitemap,
// noindexed on their own page, and kept OUT of the header nav — while staying
// live, buyable, and in the Merchant feed.
export const SHOPPING_ONLY_SLUGS = new Set(['build-your-own-gift-box'])

export const isShoppingOnly = (slug: string) => SHOPPING_ONLY_SLUGS.has(slug)
