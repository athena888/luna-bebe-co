import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

// Friendly "launching soon" screen shown in place of the main checkout / gift-card
// purchase forms while NEXT_PUBLIC_STORE_OPEN is not 'true'.
export function ShopClosed() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream-50 flex items-center justify-center px-6 py-24">
        <div className="max-w-md text-center">
          <p className="font-sans text-[10px] tracking-[0.35em] uppercase text-gold-400 mb-4">Launching Soon</p>
          <h1 className="font-serif text-4xl sm:text-5xl text-espresso mb-4">Our boutique is almost ready</h1>
          <p className="font-sans text-sm text-bark-500 leading-relaxed mb-8">
            We&rsquo;re putting the finishing touches on our collection. Online checkout is
            paused for just a little while — thank you for your patience.
          </p>
          <div className="flex flex-col items-center gap-3">
            <Link href="/" className="font-sans text-xs tracking-[0.15em] uppercase text-bark-400 hover:text-espresso transition-colors">
              Back to home
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
