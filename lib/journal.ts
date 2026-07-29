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
      ]

export function getJournalPost(slug: string): JournalPost | undefined {
  return JOURNAL_POSTS.find(p => p.slug === slug)
}
