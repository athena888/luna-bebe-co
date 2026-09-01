import { supabaseAdmin } from './supabase.ts'

// Editable copy for the Story page. Stored as one JSON row in `site_content`
// (key `story.content`); falls back to these defaults so the page always
// renders. Mirrors lib/home-content.ts. Images stay in `site_images`
// (story.hero / story.founder / story.value.1..3) and are managed alongside the
// matching text in Portal → Story.

export interface StoryValue { title: string; body: string }

export interface StoryContent {
  hero: { eyebrow: string; heading: string }
  founder: { eyebrow: string; paragraphs: string[]; signature: string }
  values: StoryValue[]
  traced: { eyebrow: string; heading: string; body: string }
  whySimple: { eyebrow: string; body: string; tagline: string }
  french: { eyebrow: string; paragraphs: string[]; tagline: string }
}

export const DEFAULT_STORY_CONTENT: StoryContent = {
  hero: {
    eyebrow: 'Our Story',
    heading: 'Born from a belief that beginnings deserve to be beautiful',
  },
  founder: {
    eyebrow: 'A Letter from the Founder',
    paragraphs: [
      "When my daughter was born, I found myself surrounded by well-meaning gifts — synthetic fabrics in shrieking plastic packaging, items that felt like they were designed for a big-box store, not for a baby I'd carry in my heart forever.",
      'I wanted something different. Something that felt like it was made with intention — organic, artisan, beautiful. Something the mother would open and feel, for a moment, that she was being celebrated too. I couldn’t find it. So I built it.',
      'Petite Lavande started at my kitchen table, sourcing directly from makers who share our values: no shortcuts, no synthetics, no compromises on what touches a newborn’s skin. Every item in every box is something I would give my own child.',
      'We seal every box with our signature seal, wrap every letter by hand, and ship every order with the care it deserves. Because a birth is not just a delivery — it’s a beginning. And beginnings deserve to be luminous.',
    ],
    signature: '— Émilie, Founder',
  },
  values: [
    { title: 'Organic Cotton, Thoughtfully Sourced', body: 'Selected textiles are made with organic cotton, and we choose natural materials across the box wherever we can. Material and certification details are listed on individual product pages where applicable.' },
    { title: 'Artisan-Made', body: "We source from small makers and family studios. The hands that made your gift cared deeply about it — and that's not something you can mass-produce." },
    { title: 'Every Detail', body: 'Hand-sealed boxes, personalized cards, tissue and ribbon — because the unboxing is part of the gift. We believe in the beauty of ceremony.' },
  ],
  traced: {
    eyebrow: 'Traced to the Source',
    heading: "We don't curate. We trace.",
    body: 'Every ingredient, every material — traced to its origin. Provence lavender fields. Pacific Northwest farms. Small American makers, ethical European sources. Everything tagged. Everything traceable. Everything chosen the way a daughter would choose for her own mother.',
  },
  whySimple: {
    eyebrow: 'Why Simple',
    body: "We don't add what doesn't belong. We don't pad the box with filler. Every item here exists because a new mother and a newborn baby will actually use it and love it.",
    tagline: "Simplicity isn't a shortcut. It's the harder choice.",
  },
  french: {
    eyebrow: 'French Apothecary Soul, PNW Heart',
    paragraphs: [
      'The aesthetic comes from old French apothecaries — kraft paper, glass tubes, hand-pressed seals, twine, dried herbs. A time when remedies came with care, and care came with beauty.',
      'The ingredients come from two worlds — Provence lavender fields, Pacific Northwest farms, small American makers, ethical European sources.',
    ],
    tagline: 'A gift that feels both somewhere far away and grown close to home.',
  },
}

const KEY = 'story.content'

function merge<T>(def: T, over: Partial<T> | undefined): T {
  if (!over || typeof over !== 'object') return def
  const out = { ...def } as Record<string, unknown>
  for (const k of Object.keys(def as Record<string, unknown>)) {
    const o = (over as Record<string, unknown>)[k]
    if (o === undefined) continue
    out[k] = o
  }
  return out as T
}

/** Read the editable Story copy, merged over the in-code defaults. */
export async function getStoryContent(): Promise<StoryContent> {
  try {
    const { data } = await supabaseAdmin.from('site_content').select('value').eq('key', KEY).maybeSingle()
    const stored = data?.value as Partial<StoryContent> | undefined
    if (!stored) return DEFAULT_STORY_CONTENT
    return {
      hero: merge(DEFAULT_STORY_CONTENT.hero, stored.hero),
      founder: merge(DEFAULT_STORY_CONTENT.founder, stored.founder),
      values: Array.isArray(stored.values) && stored.values.length ? stored.values : DEFAULT_STORY_CONTENT.values,
      traced: merge(DEFAULT_STORY_CONTENT.traced, stored.traced),
      whySimple: merge(DEFAULT_STORY_CONTENT.whySimple, stored.whySimple),
      french: merge(DEFAULT_STORY_CONTENT.french, stored.french),
    }
  } catch {
    return DEFAULT_STORY_CONTENT
  }
}

/** Persist the Story copy (one JSON row). */
export async function saveStoryContent(content: StoryContent): Promise<void> {
  const { error } = await supabaseAdmin
    .from('site_content')
    .upsert({ key: KEY, value: content, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (error) throw error
}
