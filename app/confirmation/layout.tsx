import type { Metadata } from 'next'

// /confirmation is a client page — metadata lives here so GA page reports show
// a real title instead of the root default. Transactional → noindex.
export const metadata: Metadata = {
  title: 'Order Confirmation',
  robots: { index: false },
}

export default function ConfirmationLayout({ children }: { children: React.ReactNode }) {
  return children
}
