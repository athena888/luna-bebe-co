import { supabaseAdmin } from './supabase'
import { FREE_SHIPPING_THRESHOLD } from './products'

// Editable homepage copy. Each block is stored as one row in `site_content`
// (key → JSON value). When a row is missing we fall back to these defaults, so
// the homepage always renders even before anything is saved in the portal.

export interface Perk { label: string; sub: string }
export interface Review { quote: string; name: string; context: string }

// One full-bleed editorial feature: a managed photo (home-images bucket slot)
// beside editable copy. `title` may contain line breaks; `bullets` is optional.
export interface FeatureBlock {
  slot: string
  eyebrow: string
  title: string
  body: string
  bullets: string[]
}

export interface WhyBlock {
  eyebrow: string
  title: string
  intro: string
  features: FeatureBlock[]
}

export interface ReviewsBlock {
  eyebrow: string
  title: string
  ratingLine: string
  items: Review[]
}

// The "Create Something Unforgettable" framed olive panel: script heading,
// intro paragraph and the hyphenated contents list. Its photos come from the
// first why-feature's gallery slot ('brand').
export interface UnforgettableBlock {
  title: string
  body: string
  items: string[]
}

export interface HomeContent {
  perks: Perk[]
  why: WhyBlock
  unforgettable: UnforgettableBlock
  reviews: ReviewsBlock
}

export const DEFAULT_HOME_CONTENT: HomeContent = {
  perks: [
    { label: 'Free Shipping', sub: `On orders over $${Math.round(FREE_SHIPPING_THRESHOLD / 100)}` },
    { label: 'Personalized Card', sub: 'Hand-finished for every box' },
    { label: 'Organic Cotton', sub: 'From GOTS-certified makers' },
    { label: 'Gift-Ready', sub: 'Ships within 3 days' },
  ],
  why: {
    eyebrow: 'Why Petite Lavande',
    title: 'What makes it special',
    intro: 'Anyone can send a gift. We help you send a moment — built around the mother as much as the baby, traced to its source, and finished by hand with the kind of care only love remembers.',
    features: [
      {
        slot: 'brand',
        eyebrow: 'For Mama',
        title: 'Not a gift basket.\nSomething for her.',
        body: "You're here because someone you love is becoming a mother. Most gifts celebrate the baby and quietly forget her — ours begin with her. A botanical lavender bouquet to slow the morning down. French wellness rituals to soften the long days and restore a little of what motherhood asks of her. Each piece chosen the way a daughter would choose for her own mother — tenderly, with an eye for the small comforts she'd never think to ask for.",
        bullets: [],
      },
      {
        slot: 'inside',
        eyebrow: 'Made With Love',
        title: 'For the mother,\nas much as the baby.',
        body: 'Most gifts celebrate the baby and quietly forget her — ours begin with her. A botanical lavender bouquet and wellness rituals to soften the long days, each chosen the way a daughter would choose for her own mother.',
        bullets: ['Wellness care for mama', 'Organic cotton, no pesticides', 'Botanical lavender bouquet', 'Customized card', 'Signature seal & linen ribbon'],
      },
    ],
  },
  unforgettable: {
    title: 'Create Something Unforgettable',
    body: 'A botanical lavender bouquet and wellness rituals to soften the long days, each chosen the way a daughter would choose for her own mother.',
    items: [
      'Bath soaks & calming rituals for mama',
      'Organic cotton from certified makers',
      'Premium baby essentials & heirloom toys',
      'Hand-packed with a personalized card',
    ],
  },
  reviews: {
    eyebrow: 'Stories',
    title: 'Loved by Gift-Givers',
    ratingLine: '',
    items: [],
  },
}

const KEYS = { perks: 'home.perks', why: 'home.why', unforgettable: 'home.unforgettable', reviews: 'home.reviews' } as const

/** Read the editable homepage copy, merged over the in-code defaults. */
export async function getHomeContent(): Promise<HomeContent> {
  try {
    const { data, error } = await supabaseAdmin.from('site_content').select('key, value')
    if (error) throw error
    const map = new Map((data ?? []).map(r => [r.key as string, r.value]))
    return {
      perks: (map.get(KEYS.perks) as Perk[] | undefined) ?? DEFAULT_HOME_CONTENT.perks,
      // Merge over defaults so blocks added later (e.g. features) are always
      // present even if an older saved row predates them.
      why: { ...DEFAULT_HOME_CONTENT.why, ...((map.get(KEYS.why) as Partial<WhyBlock> | undefined) ?? {}) },
      unforgettable: { ...DEFAULT_HOME_CONTENT.unforgettable, ...((map.get(KEYS.unforgettable) as Partial<UnforgettableBlock> | undefined) ?? {}) },
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
  if (input.unforgettable !== undefined) rows.push({ key: KEYS.unforgettable, value: input.unforgettable, updated_at: now })
  if (input.reviews !== undefined) rows.push({ key: KEYS.reviews, value: input.reviews, updated_at: now })
  if (rows.length === 0) return
  const { error } = await supabaseAdmin.from('site_content').upsert(rows, { onConflict: 'key' })
  if (error) throw error
}
