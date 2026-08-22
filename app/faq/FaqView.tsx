import { JsonLd } from '@/components/ui/JsonLd'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { SlotBackground } from '@/components/ui/SlotBackground'
import { SITE_FAQS, SITE_FAQS_ES } from '@/lib/faqs'

// One layout, both locales — /faq and /es/faq render this. The background
// photo + scrim swatch stay managed from Portal → Gift Boxes → Page
// backgrounds (slot faq.page_bg, mobile variant faq.page_bg.mobile), so the
// Spanish page reuses the same photography rather than needing its own.
export default function FaqView({ locale = 'en' }: { locale?: 'en' | 'es' }) {
  const isEs = locale === 'es'
  const faqs = isEs ? SITE_FAQS_ES : SITE_FAQS

  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        inLanguage: isEs ? 'es-US' : 'en-US',
        mainEntity: faqs.map(f => ({
          '@type': 'Question', name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      }} />
      <Header />
      <main className="min-h-screen bg-white">
        <SlotBackground slotKey="faq.page_bg" scrim="bg-white/80" className="min-h-screen">
          <section className="max-w-2xl mx-auto px-6 py-16">
            <h1 className="font-serif text-4xl text-espresso mb-10">{isEs ? 'Tus preguntas, respondidas' : 'Questions, answered'}</h1>
            <div className="space-y-8">
              {faqs.map((f, i) => (
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
