import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Build Your Box',
  description: 'Curate your own luxury baby gift box — pick 5 premium organic items, write a heartfelt letter, and we\'ll handle the rest.',
  openGraph: { title: 'Build Your Petite Lavande Box', description: 'Choose swaddles, garments, bath items, keepsakes, and mama gifts — then add a handwritten letter.' },
}

export default function BuildLayout({ children }: { children: React.ReactNode }) {
  return children
}
