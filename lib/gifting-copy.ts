// ── The gifting layer: pure copy and configuration ───────────────────────────
//
// Petite Lavande is not a baby-products store. Almost nobody buying here is
// buying for their own baby: they are going to a shower, sending something to
// a sister, or organising a gift from twelve coworkers. Organising the shop by
// Blankets / Clothing / Toys / Bath answers "what does this store sell?", which
// is a question the visitor never asked. This file organises it by OCCASION,
// RECIPIENT and BUDGET instead, so the answer on screen is "this is exactly
// what I need for her".
//
// NOTHING here touches the database. It is imported by the header, which is a
// client component — pulling lib/gifting.ts (and through it supabase-js) into
// that bundle would ship the whole server data layer to every visitor. The
// product-resolving half lives in lib/gifting.ts and imports from here.

export type OccasionKey = 'baby_shower' | 'new_mama' | 'new_arrival' | 'team'

export interface OccasionFaq { q: string; a: string }

export interface GiftOccasion {
  key: OccasionKey
  /** Landing route, e.g. '/baby-shower-gifts'. Also the ad destination. */
  path: string
  /** Portal image slot (docs/PHOTO_ASSETS.md). */
  imageSlot: string
  /** Fallback alt text when no photo is uploaded yet. */
  imageAlt: string

  // Homepage "Shop by Moment" card
  cardTitle: string
  cardLine: string
  cardCta: string

  // Landing page
  eyebrow: string
  /** The ad's promise, restated. Message match is the whole job of this page. */
  h1: string
  sub: string
  primaryCta: string
  metaTitle: string
  metaDescription: string
  /** "Which should I choose?" ladder labels, budget-framed. */
  ladder: [string, string, string]
  faqs: OccasionFaq[]
  /** Ordering preference against the live catalog. Never a source of truth. */
  preferredSlugs: string[]
  /** Cross-link to the long-form SEO page covering the same intent. */
  guide?: { label: string; href: string }
}

export const OCCASIONS: GiftOccasion[] = [
  {
    key: 'baby_shower',
    path: '/baby-shower-gifts',
    imageSlot: 'gift.occasion.baby_shower',
    imageAlt: 'A ribbon-tied Petite Lavande gift basket set out on a table at a baby shower',
    cardTitle: 'The baby shower',
    cardLine: 'Bring the gift everyone remembers.',
    cardCta: 'Shop baby shower gifts',
    eyebrow: 'For the shower',
    h1: 'Bring something she won’t receive three of.',
    sub: 'Beautiful gifts for baby, with a little something saved for Mama — packed by hand and ready to carry in.',
    primaryCta: 'Shop baby shower gifts',
    metaTitle: 'Baby Shower Gifts She Won’t Receive Three Of | Petite Lavande',
    metaDescription: 'Hand-packed baby shower gifts in a woven seagrass basket — beautiful things for baby, with a little something chosen for Mama. Personalized card included.',
    ladder: [
      'A thoughtful gesture',
      'The signature baby shower gift',
      'For the very special shower',
    ],
    faqs: [
      { q: 'Will it look like a gift when she opens it?', a: 'Yes. Every box is packed by hand into a woven seagrass basket with a lid, tied with ribbon and sealed — nothing needs wrapping when it arrives.' },
      { q: 'Can I add a message?', a: 'Every gift includes a personalized card. You write the message at checkout and we hand-finish the card before it goes out.' },
      { q: 'Can you send it straight to her instead of me?', a: 'Yes. Tick "This is a gift" at checkout and enter her address. Receipts and confirmations still come to you, and no prices appear anywhere in the box.' },
      { q: 'What if she has already been given the same thing?', a: 'That is the problem the Mama half solves. Most shower gifts are for the baby, so a mother opens several of the same. Every Petite Lavande gift pairs the baby pieces with something chosen for her, which is almost never duplicated.' },
    ],
    preferredSlugs: ['signature-baby-gift-box', 'themed-baby-gift-box', 'new-mom-gift-box'],
    guide: { label: 'Read: the best organic baby shower gifts', href: '/gifts/organic-baby-shower-gifts' },
  },
  {
    key: 'new_mama',
    path: '/new-mama-gifts',
    imageSlot: 'gift.occasion.new_mama',
    imageAlt: 'A quiet morning scene with something chosen for the mother beside a folded baby blanket',
    cardTitle: 'She just had the baby',
    cardLine: 'A little care for baby. A little care for her.',
    cardCta: 'Send a new mama gift',
    eyebrow: 'For her',
    h1: 'Everyone is asking about the baby.',
    sub: 'Send something that asks about her — with beautiful little things for the baby, too.',
    primaryCta: 'Send her something beautiful',
    metaTitle: 'New Mama Gifts — Send Something That’s For Her | Petite Lavande',
    metaDescription: 'A gift for the mother, not only the baby. Hand-packed in a woven basket with a personalized card, ready to send straight to her door.',
    ladder: [
      'A quiet hello',
      'The signature Mama + baby gift',
      'For the ones you love most',
    ],
    faqs: [
      { q: 'What actually makes this different from a baby gift?', a: 'Every gift pairs pieces for the baby with something chosen for the mother. In the first weeks she opens a great many gifts and almost none of them are hers.' },
      { q: 'Can I send it directly to her?', a: 'Yes — tick "This is a gift" at checkout and enter her address. Receipts come to you and there are no prices in the box.' },
      { q: 'Is it too late to send something?', a: 'No. The weeks after everyone stops visiting are often when a gift lands hardest.' },
      { q: 'Can I include a message?', a: 'Yes. You write it at checkout and we hand-finish the card that goes in the basket.' },
    ],
    preferredSlugs: ['themed-baby-gift-box', 'new-mom-gift-box', 'signature-baby-gift-box'],
    guide: { label: 'Read: new mom gift ideas', href: '/gifts/new-mom-gift-ideas' },
  },
  {
    key: 'new_arrival',
    path: '/newborn-gifts',
    imageSlot: 'gift.occasion.new_arrival',
    imageAlt: 'A Petite Lavande basket in a soft newborn setting, beside a folded muslin',
    cardTitle: 'Welcome, little one',
    cardLine: 'A beautiful hello, delivered to their door.',
    cardCta: 'Shop newborn gifts',
    eyebrow: 'For the new arrival',
    h1: 'A beautiful hello, delivered.',
    sub: 'Send a hand-packed newborn gift straight to their door — with your message written on the card inside.',
    primaryCta: 'Shop newborn gifts',
    metaTitle: 'Newborn Gifts Delivered — A Beautiful Hello | Petite Lavande',
    metaDescription: 'Hand-packed newborn gift baskets sent straight to the family’s door, with a personalized card and gift-ready presentation. Free shipping over $50.',
    ladder: [
      'A little something',
      'The signature newborn gift',
      'For the biggest moments',
    ],
    faqs: [
      { q: 'How soon can it get there?', a: 'Enter a ZIP on any gift page and we show the arrival window for that address. In the Seattle area, order by 1 PM PT and a courier can bring it the same evening.' },
      { q: 'Can it go to the hospital?', a: 'Yes, within the Seattle area. Add the hospital, unit or room and the family name in the delivery notes at checkout.' },
      { q: 'Will the price be visible?', a: 'No. When you send a gift, nothing showing a price goes in the box.' },
      { q: 'What arrives?', a: 'A woven seagrass basket with a lid, packed by hand, tied with ribbon and sealed, with your card inside.' },
    ],
    preferredSlugs: ['signature-baby-gift-box', 'themed-baby-gift-box', 'new-mom-gift-box'],
    guide: { label: 'Read: the organic newborn gift box guide', href: '/gifts/organic-newborn-gift-box' },
  },
  {
    key: 'team',
    path: '/team-new-parent-gifts',
    imageSlot: 'gift.occasion.team',
    imageAlt: 'A neutral, elegant gift presentation suitable for a gift from colleagues',
    cardTitle: 'From the whole team',
    cardLine: 'Beautiful group gifting without the guesswork.',
    cardCta: 'Shop team gifts',
    eyebrow: 'From the team',
    h1: 'Better than another gift card.',
    sub: 'Beautiful new-parent gifts from the whole team — one message, one basket, sent wherever she is.',
    primaryCta: 'Choose a team gift',
    metaTitle: 'New Parent Gifts From the Team | Petite Lavande',
    metaDescription: 'Group gifting for a colleague’s new baby — a hand-packed gift basket with everyone’s message on one card, sent straight to their door.',
    ladder: [
      'From a few of you',
      'The signature team gift',
      'From the whole department',
    ],
    faqs: [
      { q: 'Is this appropriate to send from a workplace?', a: 'Yes. It arrives as a finished gift with a card, not as a box of baby supplies, and nothing showing a price goes inside.' },
      { q: 'Can everyone sign it?', a: 'Write the whole team’s message in the card field at checkout and we hand-finish the card exactly as you wrote it.' },
      { q: 'We need several, or an invoice.', a: 'Corporate gifting handles volume, invoicing and repeat sends — tell us about your team and we will come back to you.' },
      { q: 'Can it go to her home rather than the office?', a: 'Yes. Tick "This is a gift" at checkout and enter whichever address you want it sent to.' },
    ],
    preferredSlugs: ['signature-baby-gift-box', 'themed-baby-gift-box', 'new-mom-gift-box'],
    guide: { label: 'Read: baby gifts from coworkers', href: '/gifts/baby-gift-from-coworkers' },
  },
]

// A seasonal First Christmas page is deliberately absent. The only seasonal
// SKU (`baby-first-christmas-gift-box`) is an unpublished draft — `active` is
// false, so getBoxProduct() 404s it — and a landing page whose products 404
// converts at zero while still spending. Add an entry here the moment that box
// is published; the route file is a five-line re-export of the shared view.

export function getOccasion(key: string): GiftOccasion | undefined {
  return OCCASIONS.find(o => o.key === key)
}


// ── Promises ─────────────────────────────────────────────────────────────────
// The three lines under every hero. Each one is a thing the system actually
// does, and each is enforced somewhere in code:
//   · the card message is collected at checkout and stored on the order as
//     letter_content, which is what the printed card is set from;
//   · the presentation line restates what every box PDP already says about the
//     lidded seagrass basket, ribbon-tied and sealed by hand;
//   · Seattle is where orders ship from (lib/delivery.ts) and is the claim
//     already made on /press and /same-day-delivery.
// Delivery SPEED is deliberately absent: lib/delivery.ts refuses to print an
// arrival date without a destination ZIP, so no hero may imply one.
export const GIFT_PROMISES = [
  'Personalized gift message',
  'Gift-ready presentation',
  'Hand-packed in Seattle',
] as const

/** Free-shipping line, printed from the one constant every surface reads. */
export function freeShippingLine(thresholdCents: number): string {
  return `Free shipping over $${Math.round(thresholdCents / 100)}`
}




// ── "Best for" ───────────────────────────────────────────────────────────────
// Which moment each box is the right answer to. This is the same mapping the
// header has shown beside every box name since 2026-07-29 — moved here so the
// nav, the product page and the occasion pages can never drift apart on it.
// A slug that isn't listed simply shows no line; nothing is guessed.
export const BEST_FOR_BY_SLUG: Record<string, { en: string; es: string }> = {
  'signature-baby-gift-box': { en: 'Baby shower · New arrival', es: 'Baby shower · Recién nacido' },
  'themed-baby-gift-box': { en: 'Baby shower · For her & baby', es: 'Baby shower · Para ella y el bebé' },
  'new-mom-gift-box': { en: 'For a new mother', es: 'Para mamá' },
  'baby-first-christmas-gift-box': { en: 'Baby’s first Christmas', es: 'La primera Navidad del bebé' },
}

export function bestForLabel(slug: string, isEs = false): string | null {
  const entry = BEST_FOR_BY_SLUG[slug]
  return entry ? (isEs ? entry.es : entry.en) : null
}
