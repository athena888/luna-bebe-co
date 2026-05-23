import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Gift Guide — Find the Perfect Box',
  description: 'Answer a few questions and our AI gift guide will recommend the perfect La Lumière box for your occasion, budget, and recipient.',
  openGraph: { title: 'La Lumière Gift Guide', description: 'Let our AI help you build the perfect luxury baby gift box.' },
}

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return children
}
