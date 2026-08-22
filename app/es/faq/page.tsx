import type { Metadata } from 'next'
import FaqView from '@/app/faq/FaqView'
import { esOpenGraph } from '@/lib/es-meta'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com'
const DESCRIPTION = 'Tallas, seguridad, envíos, notas de regalo y cambios — todo sobre las canastillas de Petite Lavande, respondido.'

export const metadata: Metadata = {
  title: 'Preguntas frecuentes',
  description: DESCRIPTION,
  openGraph: esOpenGraph({ path: '/es/faq', title: 'Preguntas frecuentes | Petite Lavande', description: DESCRIPTION }),
  alternates: {
    canonical: `${BASE}/es/faq`,
    languages: { en: `${BASE}/faq`, 'es-US': `${BASE}/es/faq`, 'x-default': `${BASE}/faq` },
  },
}

export default function EsFaqPage() {
  return <FaqView locale="es" />
}
