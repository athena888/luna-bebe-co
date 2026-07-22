// Search-intent landing pages — one indexable, keyword-targeted page per
// commercial query (from the SEO audit). Each renders a unique title/meta/H1,
// 150+ words of original intro copy, a product grid (filtered by category),
// and internal links to /build and ready-made boxes.
//
// They live under /gifts/[slug] (NOT /boxes/[slug], which is the dynamic
// prebuilt-box route) to avoid colliding with box slugs.

import type { ProductCategory } from '@/types'

export interface LandingPage {
  slug: string
  keyword: string
  title: string            // full <title> (absolute)
  metaDescription: string
  eyebrow: string
  h1: string
  intro: string[]          // paragraphs of original copy
  categories: ProductCategory[]   // product categories to feature
  highlights: string[]     // short bullets under the H1
}

export const LANDING_PAGES: LandingPage[] = [
  {
    slug: 'organic-newborn-gift-box',
    keyword: 'organic newborn gift box',
    title: 'Organic Newborn Gift Box | Petite Lavande',
    metaDescription: 'A luxury organic newborn gift box — organic cotton clothing from GOTS-certified makers, gentle botanical care, and a personalized card. Build your own or shop ready-made.',
    eyebrow: 'For the Newborn',
    h1: 'The Organic Newborn Gift Box',
    intro: [
      'A new baby deserves the gentlest start — and the people welcoming them deserve a gift that feels as considered as the moment. Our organic newborn gift box is built around soft, breathable pieces in organic cotton from GOTS-certified makers, so everything that touches new skin is as pure as it is beautiful.',
      'Every box is assembled by hand and finished the way you would for someone you love: a botanical lavender bouquet, a keepsake to remember the first days by, and a personalized card printed just for them. You can build your own box item by item, or choose a ready-made set we have already curated for newborns. Either way it arrives sealed with a wax stamp and tied with a natural linen ribbon — gift-ready the moment it lands on the doorstep.',
    ],
    categories: ['swaddle', 'garment', 'bath', 'keepsake'],
    highlights: ['Newborn clothing from GOTS-certified makers', 'Gentle botanical skincare', 'Personalized printed card', 'Wax seal & linen ribbon'],
  },
  {
    slug: 'gender-neutral-baby-gift-box',
    keyword: 'gender-neutral baby gift box',
    title: 'Gender-Neutral Baby Gift Box | Petite Lavande',
    metaDescription: 'A beautiful gender-neutral baby gift box in soft natural tones — organic cotton, calming botanicals, and a personalized card. Build your own or shop ready-made.',
    eyebrow: 'Neutral & Timeless',
    h1: 'The Gender-Neutral Baby Gift Box',
    intro: [
      'When you do not know whether it is a boy or a girl — or you simply love a calmer, more timeless palette — a gender-neutral gift is always the right choice. Our neutral boxes lean into soft naturals: oat, cream, sage and bark, the colours of the Petite Lavande world. Nothing loud, nothing themed, just quietly beautiful pieces that suit any nursery.',
      'Each box is built from organic cotton clothing and swaddles, gentle plant-based skincare, and a keepsake or two — all chosen the way a thoughtful friend would choose. Pick exactly what goes inside with our build-your-own tool, or start from a ready-made neutral edition. We finish every order by hand with dried lavender, a wax seal and a linen ribbon, and print your message on a personalized card so the gift feels unmistakably from you.',
    ],
    categories: ['swaddle', 'garment', 'bath', 'keepsake'],
    highlights: ['Soft natural, non-themed palette', 'Organic cotton essentials', 'Suits any nursery', 'Personalized printed card'],
  },
  {
    slug: 'postpartum-care-package',
    keyword: 'premium postpartum care package',
    title: 'Premium Postpartum Care Package | Petite Lavande',
    metaDescription: 'A premium postpartum care package made for mom — botanical bath & body, calming lavender, and small French luxuries. Build your own or shop ready-made.',
    eyebrow: 'For Mama',
    h1: 'The Postpartum Care Package',
    intro: [
      'Most baby gifts forget the person who just did the hardest, most beautiful work of all. A postpartum care package puts mom back at the centre — a quiet reminder that she is seen, cared for, and celebrated too.',
      'Ours gathers the things that actually help in those tender first weeks: soothing botanical bath and body care, calming lavender to slow the evenings down, and small French luxuries she would never buy for herself. You can pair it with a few organic pieces for the baby, or keep it entirely for her. Build your own combination or choose a ready-made set; every package arrives finished by hand with a wax seal, a natural linen ribbon, and a personalized card carrying your words. It is the kind of gift that says I see how much love you carry — and here is a little, for you.',
    ],
    categories: ['mom', 'bath'],
    highlights: ['Botanical bath & body for mom', 'Calming lavender', 'Quiet French luxuries', 'Personalized printed card'],
  },
  {
    slug: 'organic-baby-clothes-gift-set',
    keyword: 'organic baby clothes gift set',
    title: 'Organic Baby Clothes Gift Set | Petite Lavande',
    metaDescription: 'An organic baby clothes gift set in GOTS-certified cotton — swaddles, rompers and soft layers, gift-wrapped by hand. Build your own or shop ready-made.',
    eyebrow: 'Organic Clothing',
    h1: 'The Organic Baby Clothes Gift Set',
    intro: [
      'Baby clothes are the gift everyone remembers — especially when they are this soft. Our organic baby clothes gift set is organic cotton from GOTS-certified makers: swaddles, rompers, bibs and gentle layers that feel as good as they look and are kind to delicate new skin.',
      'Choose the pieces yourself with our build-your-own tool, mixing sizes and soft natural colours, or start from a ready-made clothing edition we have already styled. Each set is folded and packed by hand, then finished with dried lavender, a wax seal and a linen ribbon — with a personalized card printed for the occasion. Whether it is a baby shower, a welcome-home gift, or a first birthday, an organic clothing set is the kind of present parents reach for again and again.',
    ],
    categories: ['garment', 'swaddle'],
    highlights: ['Organic cotton, GOTS-certified makers', 'Swaddles, rompers & layers', 'Soft natural colours', 'Hand-folded & gift-ready'],
  },
  {
    slug: 'french-baby-gifts',
    keyword: 'French and European baby gifts',
    title: 'French & European Baby Gifts | Petite Lavande',
    metaDescription: 'French-inspired baby gifts — Provence lavender, linen ribbon and quiet European luxury, curated into a hand-finished box. Build your own or shop ready-made.',
    eyebrow: 'À la Française',
    h1: 'French & European Baby Gifts',
    intro: [
      'There is a particular kind of beauty in a French gift — understated, natural, and quietly luxurious. Petite Lavande is built around exactly that feeling: fields of Provence lavender, soft linen, muted heirloom tones, and the belief that the most elegant gifts are the most considered ones.',
      'Our French-inspired baby gifts bring that sensibility to the nursery and to mom: organic cotton in soft naturals, botanical lavender bouquets, gentle plant-based care, and small luxuries chosen with a European eye. Build your own box or choose a ready-made edition, and we will finish it the French way — sealed with wax, tied with a natural linen ribbon, scented with dried lavender, and carrying a personalized card. Fait avec amour, pour vous.',
    ],
    categories: ['mom', 'bath', 'keepsake', 'garment'],
    highlights: ['Provence lavender', 'Linen ribbon & wax seal', 'Soft heirloom palette', 'Quiet European luxury'],
  },
  {
    slug: 'luxury-baby-shower-gift',
    keyword: 'luxury baby shower gift',
    title: 'Luxury Baby Shower Gift | Petite Lavande',
    metaDescription: 'A luxury baby shower gift that stands out — curated organic pieces, a botanical bouquet, and a personalized card, finished by hand. Build your own or shop ready-made.',
    eyebrow: 'The Show-Stopper',
    h1: 'The Luxury Baby Shower Gift',
    intro: [
      'You want the gift everyone at the shower asks about — the one that makes the moment feel special. A luxury baby shower gift from Petite Lavande is designed to be exactly that: a beautifully composed box of organic pieces, a botanical lavender bouquet, and small thoughtful touches, presented like something out of a Provence boutique.',
      'Build your own box to match the parents perfectly, or choose a ready-made edition curated for showers. Every gift is assembled and finished entirely by hand — sealed with a wax stamp, tied with a natural linen ribbon, scented with dried lavender, and completed with a personalized card printed with your message. It is luxury you can feel the moment the box is opened, and a gift the new family will remember long after the day is over.',
    ],
    categories: ['keepsake', 'garment', 'mom', 'bath'],
    highlights: ['A curated, show-stopping box', 'Botanical lavender bouquet', 'Personalized printed card', 'Finished entirely by hand'],
  },
]

export function getLandingPage(slug: string): LandingPage | undefined {
  return LANDING_PAGES.find(p => p.slug === slug)
}
