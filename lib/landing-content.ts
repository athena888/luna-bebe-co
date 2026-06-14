import { supabaseAdmin } from './supabase'
import { LANDING_PAGES, type LandingPage } from './landing-pages'
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
export async function getLandingContent(slug: string): Promise<ResolvedGuide | null> {
  const base = LANDING_PAGES.find(p => p.slug === slug)
  if (!base) return null
  try {
    const { data, error } = await supabaseAdmin
      .from('site_content').select('value').eq('key', KEY(slug)).maybeSingle()
    if (error) throw error
    return merge(base, (data?.value as LandingOverride | undefined) ?? undefined)
  } catch {
    return merge(base, undefined)
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
    return LANDING_PAGES.map(p => merge(p, map.get(KEY(p.slug))))
  } catch {
    return LANDING_PAGES.map(p => merge(p, undefined))
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
