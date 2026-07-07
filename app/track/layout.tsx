import type { Metadata } from 'next'

// /track is a client page — metadata lives here so it doesn't inherit the
// root default title (it's in the sitemap and deserves its own).
export const metadata: Metadata = {
  title: 'Track Your Order',
  description: 'Check the status of your Petite Lavande order — enter your email and order reference to see where your gift box is.',
  alternates: { canonical: '/track' },
}

export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return children
}
