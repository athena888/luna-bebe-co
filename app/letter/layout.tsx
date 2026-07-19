import type { Metadata } from 'next'

// /letter is a client page (card-writing step) — metadata lives here so GA
// page reports show a real title. Part of the checkout flow → noindex.
export const metadata: Metadata = {
  title: 'Write Your Card',
  robots: { index: false },
}

export default function LetterLayout({ children }: { children: React.ReactNode }) {
  return children
}
