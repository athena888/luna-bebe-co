import { getSiteImage } from './site-images.ts'

// Pages that declare their own `openGraph` REPLACE the root layout's block
// wholesale in Next's metadata merge — they don't inherit its image. That is
// why /corporate and every /gifts page shared with no image at all: each set a
// title and description and silently dropped the site default.
//
// Prefers the page's own managed hero slot, falls back to the brand OG image,
// and returns [] if neither is set so the tag is simply omitted.
export async function ogImages(preferredSlot?: string): Promise<Array<{ url: string; alt: string }>> {
  try {
    if (preferredSlot) {
      const own = await getSiteImage(preferredSlot)
      if (own?.public_url) return [{ url: own.public_url, alt: own.alt_text || 'Petite Lavande' }]
    }
    const fallback = await getSiteImage('global.og_image')
    if (fallback?.public_url) return [{ url: fallback.public_url, alt: fallback.alt_text || 'Petite Lavande' }]
  } catch { /* metadata must never break a page */ }
  return []
}
