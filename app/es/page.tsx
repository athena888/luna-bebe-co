import type { Metadata } from 'next'
import HomeView from '@/app/HomeView'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: { absolute: 'Petite Lavande — Canastillas de Regalo Orgánicas para Bebé y Mamá' },
  description: 'Canastillas de regalo orgánicas armadas a mano — para la mamá tanto como para el bebé. Algodón orgánico, cuidado botánico y una tarjeta escrita para ellos.',
  alternates: {
    canonical: '/es',
    languages: { en: '/', 'es-US': '/es', 'x-default': '/' },
  },
}

// The REAL homepage — identical sections, photos and carousels — rendered
// with the Spanish strings. DB-copy sections without seeded translations
// fall back to English until their phase.
export default function EsHomePage() {
  return <HomeView locale="es" />
}
