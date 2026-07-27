import type { Metadata } from 'next'
import StoryView from './StoryView'

export const metadata: Metadata = {
  title: 'Our Story',
  description: 'The story behind Petite Lavande — why we believe every new baby deserves a gift as extraordinary as they are.',
  alternates: {
    canonical: '/story',
    ...(process.env.NEXT_PUBLIC_SPANISH_ACTIVE === 'true' || process.env.SPANISH_ACTIVE === 'true'
      ? { languages: { en: '/story', 'es-US': '/es/historia', 'x-default': '/story' } } : {}),
  },
}

export const revalidate = 60

export default function StoryPage() {
  return <StoryView locale="en" />
}
