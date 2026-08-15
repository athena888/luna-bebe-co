import type { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

// Private account area. robots.txt already disallows /account, but that blocks
// CRAWLING, not INDEXING — a disallowed URL can still be indexed from inbound
// links. The meta noindex is what actually keeps it out of the index.
export const metadata: Metadata = {
  title: 'My Account',
  description: 'View your Petite Lavande orders, saved items, and account details.',
  robots: { index: false },
}

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="sm:min-h-[90vh] bg-cream-50">
        {children}
      </main>
      <Footer />
    </>
  )
}
