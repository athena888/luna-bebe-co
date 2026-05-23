import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream-50">
        <div className="max-w-3xl mx-auto px-6 py-16 sm:py-24">
          {children}
        </div>
      </main>
      <Footer />
    </>
  )
}
