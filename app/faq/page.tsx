import type { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { JsonLd } from '@/components/ui/JsonLd'
import { SlotBackground } from '@/components/ui/SlotBackground'
import { SITE_FAQS } from '@/lib/faqs'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com'

export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description: 'Sizing, safety, shipping, gift notes and swaps — everything about Petite Lavande gift boxes, answered.',
  alternates: { canonical: `${BASE}/faq` },
}

// Background photo + scrim swatch managed from Portal → Gift Boxes → Page
// backgrounds (slot faq.page_bg, mobile variant faq.page_bg.mobile).
export default function FaqPage() {
  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: SITE_FAQS.map(f => ({
          '@type': 'Question', name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      }} />
      <Header />
      <main className="min-h-screen bg-white">
        <SlotBackground slotKey="faq.page_bg" scrim="bg-white/80" className="min-h-screen">
          <section className="max-w-2xl mx-auto px-6 py-16">
            <h1 className="font-serif text-4xl text-espresso mb-10">Questions, answered</h1>
            <div className="space-y-8">
              {SITE_FAQS.map((f, i) => (
                <div key={i}>
                  <p className="font-sans text-sm font-medium text-bark-600 mb-1.5">{f.q}</p>
                  <p className="font-sans text-sm text-bark-500 leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </section>
        </SlotBackground>
      </main>
      <Footer />
    </>
  )
}
