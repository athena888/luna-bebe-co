import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Build Your Own Organic Baby Gift Box',
  description: 'Curate your own luxury baby gift box — choose soft organic-cotton clothing, gentle botanical care, keepsakes and a mama gift, then add a personalized printed card. Built item by item, finished by hand.',
  openGraph: { title: 'Build Your Own Organic Baby Gift Box | Petite Lavande', description: 'Choose swaddles, garments, bath & body, keepsakes and mama gifts — then add a personalized printed card.' },
}

export default function BuildLayout({ children }: { children: React.ReactNode }) {
  return children
}
