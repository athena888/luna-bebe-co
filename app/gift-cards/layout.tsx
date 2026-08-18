import type { Metadata } from 'next'
import { SPANISH_ACTIVE } from '@/lib/i18n'

export const metadata: Metadata = {
  title: 'Baby Gift Cards',
  description: 'Give the gift of choice — a Petite Lavande gift card for luxury organic newborn & postpartum gifts. $50–$200, delivered instantly by email.',
  openGraph: { title: 'Petite Lavande Gift Cards', description: 'A gift card for luxury organic baby & new-mama gifts — delivered instantly by email.' },
  alternates: {
    canonical: '/gift-cards',
    // /es/tarjetas-regalo already points back here; hreflang only counts when
    // both sides declare the pair.
    ...(SPANISH_ACTIVE
      ? { languages: { en: '/gift-cards', 'es-US': '/es/tarjetas-regalo', 'x-default': '/gift-cards' } } : {}),
  },
}

export default function GiftCardsLayout({ children }: { children: React.ReactNode }) {
  return children
}
