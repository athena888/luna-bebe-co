// Search-intent landing pages — one indexable, keyword-targeted page per
// commercial query (from the SEO audit). Each renders a unique title/meta/H1,
// 150+ words of original intro copy, a product grid (filtered by category),
// and internal links to /build and ready-made boxes.
//
// They live under /gifts/[slug] (NOT /boxes/[slug], which is the dynamic
// prebuilt-box route) to avoid colliding with box slugs.

import type { ProductCategory } from '@/types'

export interface LandingFaq { q: string; a: string }

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
  // "Why it works for this moment" — concrete contents/materials for the intent.
  moment?: { heading: string; paragraphs: string[] }
  faqs?: LandingFaq[]      // rendered + FAQPage JSON-LD
  journalLinks?: { label: string; href: string }[]   // cross-links into /journal
}

export const LANDING_PAGES: LandingPage[] = [
  {
    slug: 'organic-baby-shower-gifts',
    keyword: 'organic baby shower gifts',
    title: 'The Best Organic Baby Shower Gifts | Petite Lavande',
    metaDescription: 'Organic baby shower gifts that feel considered — GOTS-certified cotton keepsakes, botanical care for the mama, hand-packed in a ribbon-tied basket.',
    eyebrow: 'For the Shower',
    h1: 'The Best Organic Baby Shower Gifts',
    intro: [
      'The best baby shower gifts are the ones the family still reaches for months later — soft organic cotton against new skin, a keepsake that outlasts the newborn weeks and something for the mama herself. Selected textiles here are made with organic cotton, alongside botanical care made in small batches; material and certification details are listed on individual product pages where applicable.',
      'Choose a ready-made basket or build your own piece by piece. Either way it arrives hand-packed, ribbon-tied and sealed by hand, with a personalized card — gift-ready for the shower table.',
    ],
    categories: ['swaddle', 'garment', 'keepsake', 'mom'],
    highlights: ['GOTS-certified organic cotton', 'Something for the mama too', 'Hand-packed & ribbon-tied', 'Personalized card included'],
  },
  {
    slug: 'new-mom-gift-ideas',
    keyword: 'new mom gift ideas',
    title: "New Mom Gift Ideas That Aren't Flowers | Petite Lavande",
    metaDescription: 'Gift ideas for the new mom herself — silk sleep mask, botanical bath soaks, lavender comforts. Because the baby gets plenty; this one is for her.',
    eyebrow: 'For the New Mama',
    h1: "New Mom Gift Ideas That Aren't Flowers",
    intro: [
      'Flowers wilt in a week. A new mom is navigating recovery, midnight feeds and a body that just did something extraordinary — the gifts that matter meet her there: a silk sleep mask for stolen naps, botanical soaks for healing, lavender comforts for the long nights.',
      'Every mama piece we carry is chosen for genuine postpartum usefulness, then hand-packed with the same care as our baby boxes — ribbon-tied, sealed by hand, with your message on a personalized card.',
    ],
    categories: ['mom', 'bath'],
    highlights: ['Chosen for real postpartum use', 'Silk, lavender & botanicals', 'Nothing that wilts', 'Personalized card included'],
  },
  {
    slug: 'organic-newborn-gift-box',
    keyword: 'organic newborn gift box',
    title: 'Organic Newborn Gift Box | Petite Lavande',
    metaDescription: 'A luxury organic newborn gift box — organic cotton clothing from GOTS-certified makers, gentle botanical care, and a personalized card. Build your own or shop ready-made.',
    eyebrow: 'For the Newborn',
    h1: 'The Organic Newborn Gift Box',
    intro: [
      'A new baby deserves the gentlest start — and the people welcoming them deserve a gift that feels as considered as the moment. Our organic newborn gift box is built around soft, breathable pieces in organic cotton from GOTS-certified makers, so everything that touches new skin is as pure as it is beautiful.',
      'Every box is assembled by hand and finished the way you would for someone you love: a botanical lavender bouquet, a keepsake to remember the first days by, and a personalized card printed just for them. You can build your own box item by item, or choose a ready-made set we have already curated for newborns. Either way it arrives sealed by hand and tied with a natural linen ribbon — gift-ready the moment it lands on the doorstep.',
    ],
    categories: ['swaddle', 'garment', 'bath', 'keepsake'],
    highlights: ['Newborn clothing from GOTS-certified makers', 'Gentle botanical skincare', 'Personalized printed card', 'Signature seal & linen ribbon'],
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
      'Each box is built from organic cotton clothing and swaddles, gentle plant-based skincare, and a keepsake or two — all chosen the way a thoughtful friend would choose. Pick exactly what goes inside with our build-your-own tool, or start from a ready-made neutral edition. We finish every order by hand with dried lavender, a signature seal and a linen ribbon, and print your message on a personalized card so the gift feels unmistakably from you.',
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
      'Ours gathers the things that actually help in those tender first weeks: soothing botanical bath and body care, calming lavender to slow the evenings down, and small French luxuries she would never buy for herself. You can pair it with a few organic pieces for the baby, or keep it entirely for her. Build your own combination or choose a ready-made set; every package arrives finished by hand with a signature seal, a natural linen ribbon, and a personalized card carrying your words. It is the kind of gift that says I see how much love you carry — and here is a little, for you.',
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
      'Choose the pieces yourself with our build-your-own tool, mixing sizes and soft natural colours, or start from a ready-made clothing edition we have already styled. Each set is folded and packed by hand, then finished with dried lavender, a signature seal and a linen ribbon — with a personalized card printed for the occasion. Whether it is a baby shower, a welcome-home gift, or a first birthday, an organic clothing set is the kind of present parents reach for again and again.',
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
      'Our French-inspired baby gifts bring that sensibility to the nursery and to mom: organic cotton in soft naturals, botanical lavender bouquets, gentle plant-based care, and small luxuries chosen with a European eye. Build your own box or choose a ready-made edition, and we will finish it the French way — sealed by hand and tied with a natural linen ribbon, scented with dried lavender, and carrying a personalized card. Fait avec amour, pour vous.',
    ],
    categories: ['mom', 'bath', 'keepsake', 'garment'],
    highlights: ['Provence lavender', 'Linen ribbon & signature seal', 'Soft heirloom palette', 'Quiet European luxury'],
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
      'Build your own box to match the parents perfectly, or choose a ready-made edition curated for showers. Every gift is assembled and finished entirely by hand — sealed by hand, tied with a natural linen ribbon, scented with dried lavender, and completed with a personalized card printed with your message. It is luxury you can feel the moment the box is opened, and a gift the new family will remember long after the day is over.',
    ],
    categories: ['keepsake', 'garment', 'mom', 'bath'],
    highlights: ['A curated, show-stopping box', 'Botanical lavender bouquet', 'Personalized printed card', 'Finished entirely by hand'],
  },

  // ── Occasion pages (SEO content brief, wave A) ─────────────────────────────
  {
    slug: 'baby-shower-gift-for-mom',
    keyword: 'baby shower gift for mom',
    title: 'Baby Shower Gift for Mom | Petite Lavande',
    metaDescription: 'A baby shower gift made for the mom-to-be — botanical bath comforts, soft organic pieces, and a personalized card. Boxes from {PRICE_LOW}, finished by hand.',
    eyebrow: 'For the Mom-to-Be',
    h1: 'The Baby Shower Gift for Mom',
    intro: [
      'Walk into any baby shower and the gift table tells the same story: everything is for the baby. The mother — the person the day is actually about — usually opens nothing that is hers. If you want your gift to be the one she remembers, give something to her.',
      'Our boxes put the mom-to-be at the centre: a soothing botanical bath soak for the last heavy weeks, calming lavender, a small French luxury she would not buy for herself, and, if you like, one or two beautiful organic cotton pieces for the baby. We pack everything by hand, seal it by hand, and print your message on a card she will keep. Boxes range from {PRICE_LOW} to {PRICE_HIGH} — build your own or start from a ready-made set.',
    ],
    categories: ['mom', 'bath', 'swaddle'],
    highlights: ['Made for her, not just the baby', 'Botanical bath comforts', 'Personalized printed card', 'Hand-finished with a signature seal'],
    moment: {
      heading: 'Why this works at a shower',
      paragraphs: [
        'Shower registries take care of the equipment. What they never cover is the person: something soft, calming, and clearly chosen for the woman in the room. A box that opens to lavender and a hand-tied ribbon reads differently from a wrapped registry item — it is a gift, not a supply.',
        'Inside, everything is chosen to be used, not stored: a bath soak she can enjoy before the baby comes, organic cotton in soft naturals if you add pieces for the little one, and a printed card that carries your words. The mother-first angle is the point — she will notice.',
      ],
    },
    faqs: [
      { q: 'What is a good baby shower gift for the mom rather than the baby?', a: 'Something she can use herself in the last weeks of pregnancy and the first weeks after: a soothing bath soak, a calming pillow mist, a soft robe-level comfort, or a curated box that combines a few of these with a personal note. The best mom gifts need no assembly and no learning curve.' },
      { q: 'How much should I spend on a baby shower gift for a mom-to-be?', a: 'Most guests spend between $50 and $150 depending on how close they are. Our boxes range from {PRICE_LOW} to {PRICE_HIGH}; a smaller curated box from a close friend typically lands better than a larger generic one.' },
      { q: 'Can I include something for the baby too?', a: 'Yes. With the build-your-own option you can pair mother-first pieces with organic cotton items for the baby — swaddles and soft garments in natural tones that suit any nursery.' },
      { q: 'Can I write a personal message?', a: 'Every box includes a personalized card printed with your message and finished by hand. You write it at checkout; we print and tuck it inside.' },
      { q: 'Is it appropriate to give a mom-focused gift at a shower?', a: 'It tends to be the gift the room talks about. Registries cover the practical side, so a gift that sees the mother fills the one gap almost every shower has.' },
    ],
    journalLinks: [
      { label: 'New Mom Gift Ideas That Are Not Flowers', href: '/journal/new-mom-gift-ideas-that-arent-flowers' },
      { label: 'The Best Organic Baby Shower Gifts', href: '/journal/best-organic-baby-shower-gifts-2026' },
    ],
  },
  {
    slug: 'new-mom-gift-box',
    keyword: 'new mom gift box',
    title: 'The New Mom Gift Box | Petite Lavande',
    metaDescription: 'A new mom gift box that cares for her — calming lavender, a soothing bath ritual, and quiet luxuries, hand-packed with a personalized card. From {PRICE_LOW}.',
    eyebrow: 'For the New Mother',
    h1: 'The New Mom Gift Box',
    intro: [
      'In the first weeks after a birth, everyone asks about the baby. A new mom gift box is a way of asking about her. It arrives at the door, needs nothing from her, and says plainly: someone thought about you.',
      'Ours is built for those blurry, tender weeks — a soothing botanical bath she can take one-handed, dried lavender to slow an evening down, a small luxury with no purpose except pleasure. Add a soft organic cotton piece for the baby if you like, or keep the whole box for her. Each one is packed by hand, sealed by hand, tied with ribbon, and finished with a card printed with your words. Build it yourself or choose a ready-made set between {PRICE_LOW} and {PRICE_HIGH}.',
    ],
    categories: ['mom', 'bath', 'keepsake'],
    highlights: ['Built around the mother', 'Soothing bath ritual', 'Calming lavender', 'Personalized printed card'],
    moment: {
      heading: 'Why it works in the first weeks',
      paragraphs: [
        'A good new-mom gift meets three tests: it can be enjoyed one-handed, it asks nothing of her, and it belongs only to her. That rules out gadgets, projects, and most baby items — and leaves warmth: a warm bath, a calming scent, something soft, real words from someone who loves her.',
        'Everything in the box passes those tests. The bath and body pieces are botanical and gentle; the lavender is real Provence lavender; the card is printed, not scribbled — the kind of thing that ends up kept in a drawer long after the newborn days are over.',
      ],
    },
    faqs: [
      { q: 'What do new moms actually want as a gift?', a: 'Comfort and acknowledgment. In practice: a soothing bath soak, something calming for sleep, easy food, and a genuine note. What they rarely want is more newborn clothing or anything that needs setup.' },
      { q: 'When should I send a new mom gift?', a: 'Any time in the first six weeks lands well. Just after the first visitors thin out — week two or three — is often when a box at the door means the most.' },
      { q: 'Should the gift be for the mom or the baby?', a: 'For her, mostly. The baby has a registry; the mother usually has nothing addressed to her. A box that leads with her and adds one or two organic pieces for the baby covers both beautifully.' },
      { q: 'Can it be shipped directly to her?', a: 'Yes — choose gift shipping at checkout, enter her address, and we send the box with your printed card inside and no prices anywhere in the box.' },
      { q: 'What is in a Petite Lavande new mom box?', a: 'Botanical bath and body care, calming lavender, and small French-style luxuries, with optional organic cotton pieces for the baby. Every box is hand-packed and finished with a signature seal, ribbon, and your personalized card.' },
    ],
    journalLinks: [
      { label: 'Gifts for the New Mom Who Has Everything', href: '/journal/gifts-for-the-new-mom-who-has-everything' },
      { label: 'What to Put in a Postpartum Care Package', href: '/journal/what-to-put-in-a-postpartum-care-package' },
    ],
  },
  {
    slug: 'newborn-gift-set',
    keyword: 'newborn gift set',
    title: 'Newborn Gift Set | Petite Lavande',
    metaDescription: 'A newborn gift set in organic cotton from GOTS-certified makers — swaddles, soft garments, and keepsakes, hand-packed with a personalized card. From {PRICE_LOW}.',
    eyebrow: 'Welcome, Little One',
    h1: 'The Newborn Gift Set',
    intro: [
      'A newborn gift set should do two things: be genuinely useful in the first months, and feel nothing like a supply run. The difference is in the materials and the way it arrives.',
      'Ours starts with what touches new skin — swaddles and soft garments in organic cotton from GOTS-certified makers, in calm natural tones that suit any nursery. Add a gentle botanical bath piece, or a keepsake like our linen bunny, and the set becomes something parents photograph rather than shelve. Every set is folded and packed by hand, sealed by hand, scented with dried lavender, and finished with a personalized card. Build your own from {PRICE_LOW}, or choose a ready-made edition up to {PRICE_HIGH}.',
    ],
    categories: ['swaddle', 'garment', 'keepsake', 'bath'],
    highlights: ['Organic cotton from GOTS-certified makers', 'Calm, nursery-neutral tones', 'Keepsakes worth keeping', 'Hand-folded & gift-ready'],
    moment: {
      heading: 'What belongs in a newborn set',
      paragraphs: [
        'The first months are muslin months: swaddles get used daily, then become burp cloths, stroller shades, and comfort objects. A quality muslin or organic cotton swaddle is the single most-used newborn gift there is — which is why our sets are built around them.',
        'From there, one or two soft garments a size up (parents receive plenty of newborn-size), something gentle for the bath, and one keepsake. Sets that follow that shape get used down to the last thread instead of joining the pile.',
      ],
    },
    faqs: [
      { q: 'What should a newborn gift set include?', a: 'A swaddle or two, one or two soft organic cotton garments (ideally sized 3–6 months rather than newborn), something gentle for bath time, and a single keepsake. Useful first, beautiful always.' },
      { q: 'Why does organic cotton matter for newborns?', a: 'Newborn skin is thinner and more permeable than adult skin. Organic cotton from GOTS-certified makers is grown and processed to a strict standard, so what touches new skin is as gentle as possible.' },
      { q: 'What sizes should I choose?', a: 'Parents are usually oversupplied in newborn sizes. Choosing 3–6 months means your gift gets worn — a small choice that doubles its usefulness.' },
      { q: 'Is this a good group or family gift?', a: 'Yes — a larger curated set works well when several people contribute, and the personalized card can carry everyone’s names.' },
      { q: 'How is the set presented?', a: 'Hand-folded in a rigid keepsake box with dried lavender, a signature seal, and ribbon, plus your message printed on a card. It arrives ready to give — no wrapping needed.' },
    ],
    journalLinks: [
      { label: 'The Best Organic Baby Shower Gifts', href: '/journal/best-organic-baby-shower-gifts-2026' },
      { label: 'Why Organic Cotton Matters for Babies', href: '/journal/why-organic-cotton-matters-baby-clothes' },
    ],
  },
  {
    slug: 'gift-for-second-baby',
    keyword: 'gift for second baby',
    title: 'Gift for a Second Baby | Petite Lavande',
    metaDescription: 'A second-baby gift that gets it right — nothing she already owns, comfort for a tired mom of two, and a card that celebrates this baby. From {PRICE_LOW}.',
    eyebrow: 'Baby Number Two',
    h1: 'The Gift for a Second Baby',
    intro: [
      'Second babies get hand-me-downs; second-time mothers get overlooked. By the time baby two arrives, the family owns the gear, the clothes, and three of everything — which is exactly what makes the gift decision interesting. What is left to give is care.',
      'A second-baby box leans toward the mother: a soothing bath ritual for a woman who now has two people needing her, calming lavender, a quiet luxury. For the baby, one genuinely new thing — a keepsake of their own, or a fresh organic cotton piece that was never their sibling’s. We pack it by hand, seal it by hand, and print your card. It says what second-time parents rarely hear: this baby, and this mother, deserve celebrating just as much.',
    ],
    categories: ['mom', 'bath', 'keepsake'],
    highlights: ['Nothing she already owns', 'Comfort for a mom of two', 'A first thing of their own for baby', 'Personalized printed card'],
    moment: {
      heading: 'Why second babies need a different gift',
      paragraphs: [
        'The practical needs are covered — what is missing is the sense of occasion. A second birth often passes without the fuss of the first, and mothers notice. A gift that clearly belongs to this baby and this moment restores some of that.',
        'That is why our second-baby boxes favour keepsakes and mother-care over clothing basics: one soft linen bunny that is theirs alone, a bath soak for her, and a card naming the new arrival. Small shifts, but they change what the gift says entirely.',
      ],
    },
    faqs: [
      { q: 'What do you give a family that already has everything from baby one?', a: 'Care for the mother, and one new thing that belongs only to the new baby — a keepsake or a fresh organic cotton piece. Avoid clothing basics and equipment; they own them.' },
      { q: 'Do parents expect gifts for a second baby?', a: 'Less than for a first — which is exactly why a thoughtful one lands so well. It marks an occasion the world treats as routine.' },
      { q: 'What about a gift for the older sibling?', a: 'A small something for the new big brother or sister is a lovely touch. Add a note line for them on the card — being included matters more than the object.' },
      { q: 'Should the card mention the new baby by name?', a: 'If the name is known, yes. Naming this baby — rather than recycling generic congratulations — is precisely what second-time parents appreciate.' },
      { q: 'What does a second-baby box cost?', a: 'The same as our other boxes: {PRICE_LOW} to {PRICE_HIGH} depending on what you include. A focused mother-and-keepsake box sits at the lower end.' },
    ],
    journalLinks: [
      { label: 'Gifts for the New Mom Who Has Everything', href: '/journal/gifts-for-the-new-mom-who-has-everything' },
      { label: 'What to Put in a Postpartum Care Package', href: '/journal/what-to-put-in-a-postpartum-care-package' },
    ],
  },
  {
    slug: 'twin-baby-gifts',
    keyword: 'twin baby gifts',
    title: 'Twin Baby Gifts | Petite Lavande',
    metaDescription: 'A twin baby gift done thoughtfully — matched-not-identical pairs in organic cotton, and real comfort for a mother of two newborns. From {PRICE_LOW}.',
    eyebrow: 'Two at Once',
    h1: 'Twin Baby Gifts',
    intro: [
      'Twin gifts fail in two predictable ways: one of everything (someone is left out) or two identical everythings (nobody is a person). The families we pack for tell us the same thing — matched, not identical, is the thoughtful middle.',
      'A twin box from us pairs organic cotton pieces in coordinated natural tones — two swaddles that belong together without being copies, two soft garments in sibling shades. And because a mother of two newborns is doing double of everything, the box leans into her comfort too: a soothing bath soak, calming lavender, something that is only hers. Hand-packed, hand-sealed, with your card printed inside. Build your own or start ready-made, {PRICE_LOW} to {PRICE_HIGH}.',
    ],
    categories: ['swaddle', 'garment', 'mom', 'bath'],
    highlights: ['Matched, not identical, pairs', 'Organic cotton in sibling tones', 'Real comfort for the mother', 'Personalized printed card'],
    moment: {
      heading: 'How to gift for twins well',
      paragraphs: [
        'Pairs in coordinated colours respect both realities of twins: they are a set, and they are two different people. Two swaddles in oat and sage say it better than two in the same print. Practical quantities matter too — twins go through double the muslin, so generous basics are genuinely kind.',
        'Above all, remember the mathematics of the mother: two feeding schedules, two sleep schedules, one her. The most-thanked item in our twin boxes is consistently the thing that was for her.',
      ],
    },
    faqs: [
      { q: 'Should twin gifts be identical?', a: 'Coordinated rather than identical is the considerate choice — same collection, different colours. The twins are a pair, not a repetition, and parents notice which message a gift sends.' },
      { q: 'Do I need to give double for twins?', a: 'For daily-use basics like swaddles, yes, quantities help. For keepsakes, one each is right. For the mother, one truly good thing beats two average ones.' },
      { q: 'What is the best gift for a mother of twins?', a: 'Comfort with zero effort attached: a soothing bath ritual, calming lavender, easy luxuries. She has two newborns; the gift should not be a third thing to manage.' },
      { q: 'Can the card mention both babies?', a: 'Yes — the personalized card is printed with your message, and naming both twins is exactly the kind of detail that makes it a keeper.' },
      { q: 'Can a twin gift be shipped straight to the family?', a: 'Yes. Choose gift shipping at checkout and the box goes to their door with the card inside and no prices in the box.' },
    ],
    journalLinks: [
      { label: 'What to Put in a Postpartum Care Package', href: '/journal/what-to-put-in-a-postpartum-care-package' },
      { label: 'Why Organic Cotton Matters for Babies', href: '/journal/why-organic-cotton-matters-baby-clothes' },
    ],
  },
  {
    slug: 'baby-gift-from-coworkers',
    keyword: 'baby gift from coworkers',
    title: 'Baby Gift from Coworkers | Petite Lavande',
    metaDescription: 'The office baby gift, solved — one curated box the whole team signs, shipped to their door. Group-worthy from {PRICE_LOW} to {PRICE_HIGH}, no collection-envelope chaos.',
    eyebrow: 'From the Whole Team',
    h1: 'The Baby Gift from Coworkers',
    intro: [
      'Every office knows the ritual: the envelope goes around, someone volunteers to buy the gift, and the pooled money becomes a gift card because nobody wanted to choose wrong. It is efficient — and completely forgettable.',
      'A group gift works harder when the money buys one substantial, beautiful thing. Our boxes suit office pools naturally: a $120 to {PRICE_HIGH} box reads as generous from a team of five to fifteen, arrives at the colleague’s door gift-wrapped with a signature seal, and carries a printed card with the whole team’s message — every name included. The parent opens something curated, not a balance. Choose a ready-made set in one click, or have the volunteer build it in ten minutes.',
    ],
    categories: ['garment', 'swaddle', 'mom', 'keepsake'],
    highlights: ['One gift, whole-team card', 'Ships straight to their door', 'Group-worthy {PRICE_LOW}–{PRICE_HIGH} range', 'No collection-envelope chaos'],
    moment: {
      heading: 'Why one good box beats a gift card',
      paragraphs: [
        'A gift card outsources the thinking to the exhausted new parent. A curated box does the opposite: it arrives finished — organic cotton pieces for the baby, comforts for the mother, lavender, ribbon, and a card that says the team took real care. The unwrapping is the point; a code in an email has none.',
        'Practically, it is also easier: one person orders, everyone’s names go on the card at checkout, and gift shipping sends it directly to the colleague’s home with no prices in the box.',
      ],
    },
    faqs: [
      { q: 'How much should coworkers spend on a group baby gift?', a: 'Common practice is $10 to $20 per person. A team of eight comfortably funds a $120 to $160 box — squarely in the range where a curated gift feels genuinely generous.' },
      { q: 'How do we include everyone’s names?', a: 'Write them into the card message at checkout. The card is printed and tucked into the box, so the whole team is present when it is opened.' },
      { q: 'Can we ship it directly to our colleague?', a: 'Yes — select gift shipping, enter their address, and the box arrives gift-wrapped with no prices inside. Nobody has to smuggle it into the office.' },
      { q: 'What if we do not know what they already have?', a: 'Choose mother-first: bath comforts, lavender, small luxuries. Registries cover the baby; almost nobody covers her, so a mom-leaning box never duplicates.' },
      { q: 'Is there something for bigger budgets or executive gifts?', a: 'Our boxes go to {PRICE_HIGH}, and for company-level gifting — clients or employees — see our corporate gifting page.' },
    ],
    journalLinks: [
      { label: 'Corporate Baby Gifts: A Guide for HR', href: '/journal/corporate-baby-gifts-guide-for-hr' },
      { label: 'Baby Shower Gift Etiquette', href: '/journal/best-organic-baby-shower-gifts-2026' },
    ],
  },
  {
    slug: 'c-section-care-package',
    keyword: 'c-section care package',
    title: 'C-Section Care Package | Petite Lavande',
    metaDescription: 'A gentle care package for after a c-section — soft comforts, calming lavender, and easy little luxuries for the slow first weeks. From {PRICE_LOW}, hand-packed.',
    eyebrow: 'Gentle Comfort',
    h1: 'The C-Section Care Package',
    intro: [
      'The weeks after a cesarean birth move slowly, and the best gifts respect that. She is spending more time resting, moving carefully, and letting others carry things — a care package for this moment should bring comfort to her, not tasks.',
      'Ours is chosen on one principle: everything must be easy. A soothing botanical bath soak for when she is ready for a long warm soak, calming lavender for the bedside, soft things that ask nothing, a small luxury purely for pleasure. If you like, add an organic cotton piece for the baby. We pack it all by hand, seal it by hand, and print your words on the card — so the box does the visiting when you cannot. From {PRICE_LOW} to {PRICE_HIGH}, built by you or ready-made.',
    ],
    categories: ['mom', 'bath', 'keepsake'],
    highlights: ['Comfort-first, task-free', 'Calming lavender for the bedside', 'Soothing bath for slow weeks', 'Personalized printed card'],
    moment: {
      heading: 'What makes a good post-cesarean gift',
      paragraphs: [
        'Think reachable, wearable, and warm. She will appreciate things usable from a propped-up position: a calming mist on the nightstand, a soft layer that goes on easily, a treat within arm’s reach. Skip anything heavy, anything with steps, and anything that implies she should be doing more.',
        'And say something real on the card. After a cesarean, many mothers hear a lot about the baby and very little about themselves — a printed card that speaks to her is quietly powerful.',
      ],
    },
    faqs: [
      { q: 'What should I put in a c-section care package?', a: 'Comfort-first items she can use while resting: a soothing bath soak for when she feels ready, a calming pillow mist, soft easy layers, lip balm-level small luxuries, and genuinely kind words. Nothing heavy, nothing with instructions.' },
      { q: 'What should I avoid giving after a c-section?', a: 'Anything that implies effort — exercise-adjacent items, projects, structured routines — and anything heavy to lift. When in doubt, choose comfort over usefulness.' },
      { q: 'When should the package arrive?', a: 'The first two to three weeks at home are the quiet stretch when visitors thin out and a box at the door means the most. Gift shipping sends it straight to her.' },
      { q: 'Is a bath soak appropriate?', a: 'A warm bath is a comfort many mothers look forward to when they feel ready for it; timing differs for everyone, and the soak keeps. We make no medical claims — it is simply a soothing ritual waiting for her.' },
      { q: 'Can I send it anonymously from a group?', a: 'You can sign the printed card however you like — one name, a whole team, or simply "people who love you."' },
    ],
    journalLinks: [
      { label: 'The Things No One Warns You About: Postpartum', href: '/journal/the-things-no-one-warns-you-about-postpartum-honestly' },
      { label: 'What to Put in a Postpartum Care Package', href: '/journal/what-to-put-in-a-postpartum-care-package' },
    ],
  },
]

export function getLandingPage(slug: string): LandingPage | undefined {
  return LANDING_PAGES.find(p => p.slug === slug)
}
