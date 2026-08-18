import { supabaseAdmin } from './supabase.ts'
import { LANDING_PAGES, type LandingPage } from './landing-pages.ts'
import type { ProductCategory } from '@/types'

// Admin-editable layer over the hardcoded gift-guide landing pages. Each guide's
// overrides live in one `site_content` row (key `landing.<slug>` → JSON). When a
// field is missing we fall back to the in-code default in landing-pages.ts, so
// the guides always render even before anything is saved in the portal.
//
// The individual SEO pages stay at /gifts/<slug>; the /gift-guides hub lists
// them all and filters by `tag`.

export interface LandingOverride {
  eyebrow?: string
  h1?: string
  title?: string
  metaDescription?: string
  intro?: string[]
  highlights?: string[]
  tag?: string
  // Explicit products to feature. When empty/absent we fall back to the guide's
  // category filter (the original behaviour).
  productIds?: string[]
}

// A guide resolved for rendering — the base landing page plus its tag and any
// explicit product picks.
export interface ResolvedGuide extends LandingPage {
  tag: string
  productIds: string[]
}

// Default hub tag per guide (admin can override). Drives the /gift-guides filter.
const DEFAULT_TAGS: Record<string, string> = {
  'organic-newborn-gift-box': 'Newborn',
  'gender-neutral-baby-gift-box': 'Gender-Neutral',
  'postpartum-care-package': 'For Mama',
  'organic-baby-clothes-gift-set': 'Clothing',
  'french-baby-gifts': 'French',
  'luxury-baby-shower-gift': 'Baby Shower',
  'baby-shower-gift-for-mom': 'Baby Shower',
  'new-mom-gift-box': 'For Mama',
  'newborn-gift-set': 'Newborn',
  'gift-for-second-baby': 'Second Baby',
  'twin-baby-gifts': 'Twins',
  'baby-gift-from-coworkers': 'From the Office',
  'c-section-care-package': 'For Mama',
}

function defaultTag(slug: string): string {
  return DEFAULT_TAGS[slug] ?? 'Gifts'
}

function merge(base: LandingPage, ov: LandingOverride | undefined): ResolvedGuide {
  return {
    ...base,
    eyebrow: ov?.eyebrow ?? base.eyebrow,
    h1: ov?.h1 ?? base.h1,
    title: ov?.title ?? base.title,
    metaDescription: ov?.metaDescription ?? base.metaDescription,
    intro: ov?.intro?.length ? ov.intro : base.intro,
    highlights: ov?.highlights?.length ? ov.highlights : base.highlights,
    tag: ov?.tag?.trim() || defaultTag(base.slug),
    productIds: ov?.productIds ?? [],
  }
}

const KEY = (slug: string) => `landing.${slug}`

/** One guide, merged over its in-code default. Returns null for unknown slugs. */
// Landing copy carries {PRICE_LOW}/{PRICE_HIGH} instead of hardcoded prices —
// 7 of the 15 guides advertised "$85 to $200" long after the lineup moved to
// $65–$165. Resolving here, at the single point every guide (page metadata,
// body, FAQs, hub cards) reads through, means portal-authored overrides can use
// the tokens too and no surface can drift again.
async function resolvePrices<T>(guide: T): Promise<T> {
  const { boxPriceRange, fillPrices } = await import('./box-price-range.ts')
  const range = await boxPriceRange()
  const walk = (v: unknown): unknown => {
    if (typeof v === 'string') return fillPrices(v, range)
    if (Array.isArray(v)) return v.map(walk)
    if (v && typeof v === 'object') {
      return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, walk(val)]))
    }
    return v
  }
  return walk(guide) as T
}

export async function getLandingContent(slug: string): Promise<ResolvedGuide | null> {
  const base = LANDING_PAGES.find(p => p.slug === slug)
  if (!base) return null
  try {
    const { data, error } = await supabaseAdmin
      .from('site_content').select('value').eq('key', KEY(slug)).maybeSingle()
    if (error) throw error
    return resolvePrices(merge(base, (data?.value as LandingOverride | undefined) ?? undefined))
  } catch {
    return resolvePrices(merge(base, undefined))
  }
}

/** Every guide, merged over defaults, in landing-pages.ts order. */
export async function getAllGuides(): Promise<ResolvedGuide[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('site_content').select('key, value')
      .in('key', LANDING_PAGES.map(p => KEY(p.slug)))
    if (error) throw error
    const map = new Map((data ?? []).map(r => [r.key as string, r.value as LandingOverride]))
    return Promise.all(LANDING_PAGES.map(p => resolvePrices(merge(p, map.get(KEY(p.slug))))))
  } catch {
    return Promise.all(LANDING_PAGES.map(p => resolvePrices(merge(p, undefined))))
  }
}

/** Persist one guide's overrides. */
export async function saveLandingContent(slug: string, override: LandingOverride): Promise<void> {
  if (!LANDING_PAGES.some(p => p.slug === slug)) throw new Error('Unknown guide')
  const { error } = await supabaseAdmin.from('site_content')
    .upsert({ key: KEY(slug), value: override, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (error) throw error
}

// Re-export so callers don't need a second import.
export type { ProductCategory }
