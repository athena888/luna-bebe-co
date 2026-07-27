import type { Metadata } from 'next'
import HomeView from './HomeView'

export const metadata: Metadata = {
  // `absolute` so the "| Petite Lavande" template isn't appended (avoids the
  // brand name appearing twice in the homepage title).
  title: { absolute: 'Petite Lavande — Luxury Organic Baby & New-Mama Gift Boxes' },
  description: 'Bespoke luxury baby gift boxes — organic cotton clothing from GOTS-certified makers, gentle botanical care, and a personalized printed card. Newborn & postpartum gifts, finished by hand and shipped with love.',
  keywords: ['organic baby gift box', 'luxury baby gift', 'newborn gift box', 'postpartum gift', 'new mama gift'],
  alternates: {
    canonical: process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com',
    ...(process.env.NEXT_PUBLIC_SPANISH_ACTIVE === 'true' || process.env.SPANISH_ACTIVE === 'true'
      ? { languages: { en: '/', 'es-US': '/es', 'x-default': '/' } } : {}),
  },
  openGraph: { title: 'Petite Lavande — Luxury Organic Baby Gifts', description: 'Organic newborn & postpartum gift boxes — built item by item, finished by hand, shipped with love.' },
}

// Revalidate bestsellers periodically so they reflect real sales
export const revalidate = 300

export default function HomePage() {
  return <HomeView locale="en" />
}
