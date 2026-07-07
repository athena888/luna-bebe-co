import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Baby Gift Cards',
  description: 'Give the gift of choice — a Petite Lavande gift card for luxury organic newborn & postpartum gifts. $50–$200, delivered instantly by email.',
  openGraph: { title: 'Petite Lavande Gift Cards', description: 'A gift card for luxury organic baby & new-mama gifts — delivered instantly by email.' },
  alternates: { canonical: '/gift-cards' },
}

export default function GiftCardsLayout({ children }: { children: React.ReactNode }) {
  return children
}
