import { SPANISH_ACTIVE } from './i18n'

const BASE = (process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com').replace(/\/$/, '')

// Every /es page already carried a Spanish <title> and description, but none
// set openGraph — so Next cascaded the ROOT layout's English block down, and
// every Spanish page shared to Facebook/WhatsApp with an English title, an
// English description and og:url pointing at the English homepage. These two
// helpers reuse the page's own Spanish strings; no new copy is invented.

export function esOpenGraph({ path, title, description, images }: {
  path: string
  title: string
  description: string
  images?: Array<{ url: string; alt?: string }>
}) {
  return {
    title,
    description,
    url: `${BASE}${path}`,
    siteName: 'Petite Lavande',
    locale: 'es_US',
    type: 'website' as const,
    ...(images?.length ? { images } : {}),
  }
}

/** Canonical + the en/es pair. hreflang is discarded unless BOTH sides declare
 *  it, so the English twin has to carry the mirror of this. */
export function esAlternates(esPath: string, enPath: string) {
  return {
    canonical: `${BASE}${esPath}`,
    ...(SPANISH_ACTIVE
      ? { languages: { en: `${BASE}${enPath}`, 'es-US': `${BASE}${esPath}`, 'x-default': `${BASE}${enPath}` } }
      : {}),
  }
}
