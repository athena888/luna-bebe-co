import { supabaseAdmin } from './supabase'

// Editable homepage copy. Each block is stored as one row in `site_content`
// (key → JSON value). When a row is missing we fall back to these defaults, so
// the homepage always renders even before anything is saved in the portal.

export interface Perk { label: string; sub: string }
export interface WhyItem { t: string; b: string }
export interface Review { quote: string; name: string; context: string }

export interface WhyBlock {
  eyebrow: string
  title: string
  intro: string
  items: WhyItem[]
}

export interface ReviewsBlock {
  eyebrow: string
  title: string
  ratingLine: string
  items: Review[]
}

export interface HomeContent {
  perks: Perk[]
  why: WhyBlock
  reviews: ReviewsBlock
}

export const DEFAULT_HOME_CONTENT: HomeContent = {
  perks: [
    { label: 'Free Shipping', sub: 'On orders over $150' },
    { label: 'Personalized Card', sub: 'Printed for every box' },
    { label: 'Organic Cotton', sub: 'From a GOTS-certified maker' },
    { label: 'Gift-Ready', sub: 'Wax seal & ribbon, always' },
  ],
  why: {
    eyebrow: 'Why Petite Lavande',
    title: 'What makes it special',
    intro: 'Anyone can send a gift. We help you send a moment — built around the mother as much as the baby, traced to its source, and finished by hand with the kind of care only love remembers.',
    items: [
      { t: 'Chosen for her, not just baby', b: 'Most gifts celebrate the baby and forget her. Every box carries wellness and quiet French luxuries for the mother too — a reminder that she is seen.' },
      { t: 'Organic, grown without pesticides', b: 'Soft on the most delicate new skin and gentle on the earth — GOTS-certified organic cotton grown without pesticides, every ingredient traced to its origin.' },
      { t: 'Finished by hand', b: 'Closed with a wax seal and linen ribbon, tucked with dried lavender, and a card printed just for them.' },
      { t: 'Built your way', b: 'Start from a ready-made set or build your own — pick exactly what goes inside. No two boxes alike.' },
    ],
  },
  reviews: {
    eyebrow: 'Stories',
    title: 'Loved by Gift-Givers',
    ratingLine: '★★★★★  5.0 · Over 300 happy orders',
    items: [
      { quote: "I've never seen a gift box this beautiful. My best friend cried when she opened it. The personal card was the most special part.", name: 'Camille R.', context: 'Gifted to her sister' },
      { quote: 'Ordered rush shipping and it arrived the next day. Gorgeous box, everything so soft and organic. Worth every penny.', name: 'Maya T.', context: 'Baby shower gift' },
      { quote: 'Everyone at the shower was asking where the box was from. Building it myself meant I picked perfectly for someone I barely know.', name: 'Priya N.', context: 'Office baby shower' },
    ],
  },
}

const KEYS = { perks: 'home.perks', why: 'home.why', reviews: 'home.reviews' } as const

/** Read the editable homepage copy, merged over the in-code defaults. */
export async function getHomeContent(): Promise<HomeContent> {
  try {
    const { data, error } = await supabaseAdmin.from('site_content').select('key, value')
    if (error) throw error
    const map = new Map((data ?? []).map(r => [r.key as string, r.value]))
    return {
      perks: (map.get(KEYS.perks) as Perk[] | undefined) ?? DEFAULT_HOME_CONTENT.perks,
      why: (map.get(KEYS.why) as WhyBlock | undefined) ?? DEFAULT_HOME_CONTENT.why,
      reviews: (map.get(KEYS.reviews) as ReviewsBlock | undefined) ?? DEFAULT_HOME_CONTENT.reviews,
    }
  } catch {
    return DEFAULT_HOME_CONTENT
  }
}

/** Persist one or more blocks. Only provided keys are written. */
export async function saveHomeContent(input: Partial<HomeContent>): Promise<void> {
  const rows: Array<{ key: string; value: unknown; updated_at: string }> = []
  const now = new Date().toISOString()
  if (input.perks !== undefined) rows.push({ key: KEYS.perks, value: input.perks, updated_at: now })
  if (input.why !== undefined) rows.push({ key: KEYS.why, value: input.why, updated_at: now })
  if (input.reviews !== undefined) rows.push({ key: KEYS.reviews, value: input.reviews, updated_at: now })
  if (rows.length === 0) return
  const { error } = await supabaseAdmin.from('site_content').upsert(rows, { onConflict: 'key' })
  if (error) throw error
}
