import type { Metadata } from 'next'

// /checkout is a client page — metadata lives here so GA page reports show a
// real title instead of the root default. Transactional → noindex.
export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false },
}

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children
}
