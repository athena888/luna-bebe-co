import type { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'My Account',
  description: 'View your La Lumiere orders, saved items, and account details.',
}

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream-50">
        {children}
      </main>
      <Footer />
    </>
  )
}
