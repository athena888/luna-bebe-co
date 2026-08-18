import { esOpenGraph } from '@/lib/es-meta'
// Spanish builder — same component; the /es pathname flips its strings.
const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com'
export const metadata = {
  title: 'Arma tu canastilla',
  description: 'Elige cada pieza — canastillas orgánicas para bebé y mamá, armadas a mano.',
  openGraph: esOpenGraph({ path: '/es/build', title: 'Arma tu canastilla | Petite Lavande', description: 'Elige cada pieza — canastillas orgánicas para bebé y mamá, armadas a mano.' }),
  alternates: {
    canonical: `${BASE}/es/build`,
    languages: { en: `${BASE}/build`, 'es-US': `${BASE}/es/build`, 'x-default': `${BASE}/build` },
  },
}
export { default } from '@/app/build/page'
