// Spanish gift cards — same component; the /es pathname flips its strings.
const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com'
export const metadata = {
  title: 'Tarjetas de regalo',
  description: 'Tarjetas de regalo Petite Lavande — deja que elijan su canastilla perfecta.',
  alternates: {
    canonical: `${BASE}/es/tarjetas-regalo`,
    languages: { en: `${BASE}/gift-cards`, 'es-US': `${BASE}/es/tarjetas-regalo`, 'x-default': `${BASE}/gift-cards` },
  },
}
export { default } from '@/app/gift-cards/page'
