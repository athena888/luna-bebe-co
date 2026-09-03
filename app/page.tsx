import type { Metadata } from 'next'
import GiftingHome from './GiftingHome'
import { FREE_SHIPPING_THRESHOLD } from '@/lib/products'

export const metadata: Metadata = {
  // `absolute` so the "| Petite Lavande" template isn't appended (avoids the
  // brand name appearing twice in the homepage title).
  title: { absolute: 'Petite Lavande — Baby Gifts That Remember the Mother, Too' },
  // The threshold is read from the one constant every surface reads, so the
  // search snippet can never advertise a bar the cart doesn't honour.
  description: `Gifts for baby showers, new arrivals and the mothers at the heart of them — hand-packed in a woven basket with your message on the card. Free shipping over $${Math.round(FREE_SHIPPING_THRESHOLD / 100)}.`,
  keywords: ['baby shower gift', 'new mom gift', 'newborn gift basket', 'baby gift basket', 'gift for new mother'],
  alternates: {
    canonical: process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com',
    ...(process.env.NEXT_PUBLIC_SPANISH_ACTIVE === 'true' || process.env.SPANISH_ACTIVE === 'true'
      ? { languages: { en: '/', 'es-US': '/es', 'x-default': '/' } } : {}),
  },
  openGraph: { title: 'Petite Lavande — For the baby. For her, too.', description: 'Beautifully prepared gifts for baby showers, new arrivals, and the mothers at the heart of them.' },
}

// Revalidate bestsellers periodically so they reflect real sales
export const revalidate = 300

export default function HomePage() {
  return <GiftingHome />
}
