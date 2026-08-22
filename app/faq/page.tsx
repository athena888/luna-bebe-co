import type { Metadata } from 'next'
import FaqView from './FaqView'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com'

export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description: 'Sizing, safety, shipping, gift notes and swaps — everything about Petite Lavande gift boxes, answered.',
  // hreflang is discarded unless BOTH sides declare it, so this mirrors the
  // pair advertised by /es/faq.
  alternates: {
    canonical: `${BASE}/faq`,
    languages: { en: `${BASE}/faq`, 'es-US': `${BASE}/es/faq`, 'x-default': `${BASE}/faq` },
  },
}

export default function FaqPage() {
  return <FaqView locale="en" />
}
