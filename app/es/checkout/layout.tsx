import type { Metadata } from 'next'

// /es/checkout re-exports the English checkout PAGE (app/es/checkout/page.tsx),
// but a re-export does not inherit app/checkout/layout.tsx — so without this
// file the route fell through to the root layout's `index: true, follow: true`
// and the Spanish checkout was indexable. Transactional → noindex, same as the
// English route.
export const metadata: Metadata = {
  title: 'Pago',
  robots: { index: false },
}

export default function EsCheckoutLayout({ children }: { children: React.ReactNode }) {
  return children
}
