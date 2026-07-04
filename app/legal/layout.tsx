import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { SlotBackground } from '@/components/ui/SlotBackground'

// One shared background (legal.bg + legal.bg.mobile, Portal → Pages & Content
// → Legal) behind all three legal pages — they render inside this layout.
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream-50">
        <SlotBackground slotKey="legal.bg" scrim="bg-cream-50/85" className="min-h-screen">
          <div className="max-w-3xl mx-auto px-6 py-16 sm:py-24">
            {children}
          </div>
        </SlotBackground>
      </main>
      <Footer />
    </>
  )
}
