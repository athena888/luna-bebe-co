import type { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { SlotBackground } from '@/components/ui/SlotBackground'
import { CONTACT_EMAIL } from '@/lib/site-config'
import { LEGAL_NAME, businessAddress } from '@/lib/business-info'

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Contact Petite Lavande customer support about an order, product, shipping, or return.',
  alternates: {
    canonical: '/contact',
    ...(process.env.NEXT_PUBLIC_SPANISH_ACTIVE === 'true' || process.env.SPANISH_ACTIVE === 'true'
      ? { languages: { en: '/contact', 'es-US': '/es/contacto', 'x-default': '/contact' } } : {}),
  },
}

// Same legal identity and configured mailing address as the Terms page
// (lib/business-info.ts). No phone number: none is configured for customers.
const ADDRESS = businessAddress()

export default function ContactPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream-50">
        <SlotBackground slotKey="legal.bg" scrim="bg-cream-50/85" className="min-h-screen">
          <div className="max-w-3xl mx-auto px-6 py-16 sm:py-24">
            <article className="font-sans text-bark-600">
              <p className="font-sans text-[11px] tracking-[0.18em] uppercase text-gold-400 mb-4">Customer Care</p>
              <h1 className="font-serif text-4xl font-normal text-espresso mb-10">Contact Us</h1>

              <Section title="Customer Support">
                Questions about an order, product, shipping, or return? Contact us at{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-bark-600 underline underline-offset-2">{CONTACT_EMAIL}</a>.
                {' '}We respond to customer inquiries during regular business days. Please include your order number if your question is about an existing order.
              </Section>

              <Section title="Business Information">
                <span className="block">{LEGAL_NAME}</span>
                <span className="block">Doing business as Petite Lavande</span>
                {ADDRESS && <span className="block mt-3">Business mailing address: {ADDRESS}</span>}
                <span className="block mt-3">Email: <a href={`mailto:${CONTACT_EMAIL}`} className="text-bark-600 underline underline-offset-2">{CONTACT_EMAIL}</a></span>
              </Section>

              <Section title="Helpful Links">
                <ul className="space-y-1 list-disc list-inside text-bark-500">
                  <li><a href="/track" className="text-bark-600 underline underline-offset-2">Track Order</a></li>
                  <li><a href="/legal/shipping" className="text-bark-600 underline underline-offset-2">Shipping Policy</a></li>
                  <li><a href="/legal/returns" className="text-bark-600 underline underline-offset-2">Returns &amp; Refund Policy</a></li>
                  <li><a href="/faq" className="text-bark-600 underline underline-offset-2">Frequently Asked Questions</a></li>
                </ul>
              </Section>
            </article>
          </div>
        </SlotBackground>
      </main>
      <Footer />
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="font-serif text-xl text-bark-600 mb-3 font-normal">{title}</h2>
      <div className="font-sans text-sm text-bark-500 leading-relaxed">{children}</div>
    </div>
  )
}
