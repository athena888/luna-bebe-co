import type { Metadata } from 'next'
import StoryView from '@/app/story/StoryView'
import { esOpenGraph } from '@/lib/es-meta'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Nuestra historia',
  description: 'La historia de Petite Lavande — nacida de la certeza de que los comienzos merecen ser hermosos.',
  openGraph: esOpenGraph({ path: '/es/historia', title: 'Nuestra historia | Petite Lavande', description: 'La historia de Petite Lavande — nacida de la certeza de que los comienzos merecen ser hermosos.' }),
  alternates: {
    canonical: '/es/historia',
    languages: { en: '/story', 'es-US': '/es/historia', 'x-default': '/story' },
  },
}

export default function EsStoryPage() {
  return <StoryView locale="es" />
}
