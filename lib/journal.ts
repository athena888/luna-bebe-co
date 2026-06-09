// The Journal — crawlable, long-form SEO content (distinct from /social, which
// is a short visual feed). Each post targets an informational keyword and links
// internally to the relevant landing page / build flow.

export type Block =
  | { p: string }
  | { h2: string }
  | { ul: string[] }

export interface JournalPost {
  slug: string
  title: string
  metaDescription: string
  excerpt: string
  date: string            // ISO, absolute
  readMins: number
  body: Block[]
  related: { label: string; href: string }[]
}

export const JOURNAL_POSTS: JournalPost[] = [
  {
    slug: 'what-to-put-in-a-postpartum-care-package',
    title: 'What to Put in a Postpartum Care Package',
    metaDescription: 'A thoughtful checklist for a postpartum care package that actually helps mom — botanical bath & body, calming lavender, nourishment and rest.',
    excerpt: 'The new baby gets all the gifts. Here is how to put together a care package for the person who needs one most — mom.',
    date: '2026-05-12',
    readMins: 4,
    body: [
      { p: 'In the first weeks after birth, the baby is showered with gifts — and the person who just did the hardest work of all is often overlooked. A postpartum care package puts mom back at the centre. The goal is simple: comfort, calm, and the small luxuries she would never buy for herself.' },
      { h2: 'Start with rest and calm' },
      { p: 'The early days blur together. Anything that helps her slow down, even for ten minutes, is worth its weight in gold. Dried lavender by the bed, a calming pillow mist, a soft eye mask, or a candle for the evening feed all signal the same thing: it is okay to pause.' },
      { h2: 'Botanical bath & body' },
      { p: 'Gentle, plant-based bath and body care is the heart of a good postpartum package. Look for soothing, fragrance-considered products — a nourishing body oil, a hydrating balm, a gentle wash — that feel like a small ritual rather than a chore.' },
      { h2: 'Nourishment' },
      { ul: ['A beautiful tea blend for late-night feeds', 'Easy, wholesome snacks she can eat one-handed', 'A reusable water bottle she can keep close'] },
      { h2: 'A few quiet luxuries' },
      { p: 'This is where the gift becomes memorable: soft socks, a linen scrunchie, a hand cream that lives by the sink, a note that simply says you are doing beautifully. None of it is strictly necessary — which is exactly why it means so much.' },
      { p: 'You can assemble all of this yourself, or start from a ready-made postpartum care package and add the pieces that feel right. However you build it, the message is the same: I see how much love you carry, and here is a little, for you.' },
    ],
    related: [
      { label: 'Shop the Postpartum Care Package', href: '/gifts/postpartum-care-package' },
      { label: 'Build your own box', href: '/build' },
    ],
  },
  {
    slug: 'best-organic-baby-shower-gifts-2026',
    title: 'The Best Organic Baby Shower Gifts (2026)',
    metaDescription: 'Our edit of the best organic baby shower gifts for 2026 — GOTS-cotton clothing, botanical care, and gift sets parents actually keep.',
    excerpt: 'From GOTS-cotton swaddles to botanical care for mom, here is what makes an organic baby shower gift feel truly special this year.',
    date: '2026-04-28',
    readMins: 5,
    body: [
      { p: 'Organic is no longer a nice-to-have — for many new parents it is the standard. But "organic" alone does not make a gift memorable. The best organic baby shower gifts of 2026 pair genuinely better materials with the kind of presentation that makes the moment feel special.' },
      { h2: 'Look for GOTS-certified cotton' },
      { p: 'When it comes to anything that touches a newborn, cotton made with GOTS-certified organic cotton from a GOTS-certified maker is the gold standard. It means the fibre is grown and processed to a strict organic and ethical standard — softer on skin, and gentler on the planet.' },
      { h2: 'Do not forget mom' },
      { p: 'The gifts people remember most are the ones that include the mother. A botanical bath set, calming lavender, or a small French luxury alongside the baby pieces turns a standard shower gift into something thoughtful.' },
      { h2: 'Our 2026 edit' },
      { ul: ['An organic baby clothes gift set in soft naturals', 'A gender-neutral box for when the surprise is part of the fun', 'A botanical lavender bouquet to scent the nursery', 'A personalized card — the detail everyone reads first'] },
      { h2: 'Presentation matters' },
      { p: 'A gift that arrives sealed with a wax stamp, tied with a natural linen ribbon and scented with dried lavender lands differently than a parcel of loose items. It tells the new family that real care went into it.' },
      { p: 'You can choose a ready-made set or build your own box item by item — either way, the pieces above are a reliable recipe for the kind of gift that gets asked about at the shower.' },
    ],
    related: [
      { label: 'Shop ready-made boxes', href: '/boxes' },
      { label: 'Build your own box', href: '/build' },
      { label: 'Organic baby clothes gift set', href: '/gifts/organic-baby-clothes-gift-set' },
    ],
  },
  {
    slug: 'newborn-milestone-photo-ideas',
    title: 'Newborn Milestone Photo Ideas',
    metaDescription: 'Simple, beautiful newborn milestone photo ideas — from the hello-world disc to monthly keepsakes — using soft natural props you already have.',
    excerpt: 'You do not need a studio to capture the first days. A few soft props and natural light are all it takes.',
    date: '2026-04-10',
    readMins: 3,
    body: [
      { p: 'The newborn stage is over in a blink. You do not need a professional set-up to remember it — just natural light, a soft surface, and one or two simple props that keep the focus on the baby.' },
      { h2: 'The hello-world moment' },
      { p: 'A wooden "hello world" disc or a simple name card photographs beautifully tucked beside a swaddled newborn. It instantly dates the photo and gives the frame a gentle focal point.' },
      { h2: 'Keep the palette soft' },
      { ul: ['Lay baby on an organic cotton swaddle in oat or cream', 'Add a single dried lavender stem for texture', 'Shoot near a window an hour after sunrise for soft light', 'Photograph from directly above for a clean, modern frame'] },
      { h2: 'Mark the months' },
      { p: 'A keepsake item — a knit toy, a milestone disc, a favourite blanket — placed next to the baby each month makes the growth impossible to miss when you look back. Consistency is the trick: same blanket, same spot, same time of day.' },
      { p: 'Most of these props double as gifts. A swaddle, a keepsake disc and a soft toy are lovely on their own, and they quietly become the backdrop to a year of photos.' },
    ],
    related: [
      { label: 'Shop keepsakes — build a box', href: '/build' },
      { label: 'Organic newborn gift box', href: '/gifts/organic-newborn-gift-box' },
    ],
  },
  {
    slug: 'new-mom-gift-ideas-that-arent-flowers',
    title: "New Mom Gift Ideas That Aren't Flowers",
    metaDescription: 'Thoughtful new mom gift ideas beyond flowers — botanical care, lavender, small luxuries and keepsakes she will actually use.',
    excerpt: 'Flowers wilt in a week. Here are gift ideas for a new mom that last longer — and feel more personal.',
    date: '2026-03-22',
    readMins: 4,
    body: [
      { p: 'Flowers are a lovely reflex, but they fade fast and ask for vases and attention a new mom does not have to spare. If you want to send something she will genuinely use — and remember — here are warmer alternatives.' },
      { h2: 'Something calming' },
      { p: 'Dried lavender keeps its scent for months and asks nothing of her. A botanical lavender bouquet brings the same softness as fresh flowers without the upkeep, and it suits the nursery beautifully.' },
      { h2: 'Something for her body' },
      { p: 'Gentle, plant-based bath and body care is a reliable hit — a nourishing oil, a rich balm, a calming wash. These are the small rituals that help her feel like herself again.' },
      { h2: 'Something thoughtful' },
      { ul: ['A soft linen scrunchie or cosy socks', 'A beautiful tea blend for night feeds', 'A personalized card with words she can keep', 'A keepsake that marks the new chapter'] },
      { h2: 'Put it together with care' },
      { p: 'The presentation is half the gift. A curated box — sealed with wax, tied with linen ribbon, scented with lavender — feels far more personal than a bouquet on the doorstep. Build your own combination, or start from a ready-made set made with mom in mind.' },
    ],
    related: [
      { label: 'Postpartum care package', href: '/gifts/postpartum-care-package' },
      { label: 'Luxury baby shower gift', href: '/gifts/luxury-baby-shower-gift' },
      { label: 'Build your own box', href: '/build' },
    ],
  },
]

export function getJournalPost(slug: string): JournalPost | undefined {
  return JOURNAL_POSTS.find(p => p.slug === slug)
}
