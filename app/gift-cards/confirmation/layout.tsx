import type { Metadata } from 'next'

// Client page — metadata lives here so GA page reports show a real title
// instead of the parent /gift-cards title. Transactional → noindex.
export const metadata: Metadata = {
  title: 'Gift Card Confirmation',
  robots: { index: false },
}

export default function GiftCardConfirmationLayout({ children }: { children: React.ReactNode }) {
  return children
}
