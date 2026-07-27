import type { Metadata } from 'next'
import { CONTACT_EMAIL } from '@/lib/site-config'

export const metadata: Metadata = {
  title: 'Returns & Refund Policy',
  description: 'Petite Lavande return, exchange, and refund policy.',
  alternates: {
    canonical: '/legal/returns',
    ...(process.env.NEXT_PUBLIC_SPANISH_ACTIVE === 'true' || process.env.SPANISH_ACTIVE === 'true'
      ? { languages: { en: '/legal/returns', 'es-US': '/es/legal/devoluciones', 'x-default': '/legal/returns' } } : {}),
  },
}

export default function ReturnsPage() {
  return (
    <article className="font-sans text-bark-600">
      <p className="font-sans text-[11px] tracking-[0.3em] uppercase text-gold-400 mb-4">Legal</p>
      <h1 className="font-serif text-4xl font-normal text-espresso mb-2">Returns &amp; Refund Policy</h1>
      <p className="text-bark-400 text-sm mb-10">Last updated: June 2026</p>

      <Section title="Our Commitment">
        Every Petite Lavande box is handcrafted with care. If something isn&apos;t right, we want to make it right.
      </Section>

      <Section title="Damaged or Incorrect Items">
        If your order arrives damaged or contains the wrong items, please contact us within <strong>7 days</strong> of delivery with photos. We will reship the correct items at no cost or issue a full refund — your choice.
      </Section>

      <Section title="Change of Mind Returns">
        Because each box is assembled to order, we are unable to accept returns for change of mind once your box has been shipped. If you need to cancel, please contact us within <strong>24 hours</strong> of placing your order.
      </Section>

      <Section title="Return Shipping">
        For damaged or incorrect items, we cover return shipping. For any other approved return, return shipping is the customer&apos;s responsibility.
      </Section>

      <Section title="Gift Orders">
        If you received a Petite Lavande box as a gift and there&apos;s an issue with any item, please contact us with your order reference number (included in the box) and we&apos;ll assist you directly.
      </Section>

      <Section title="Refund Timeline">
        Approved refunds are processed within <strong>3–5 business days</strong> and will appear on your original payment method within 5–10 business days depending on your bank.
      </Section>

      <Section title="Non-Returnable Items">
        For hygiene and safety reasons, opened skincare, bath products, and consumables cannot be returned unless defective.
      </Section>

      <Section title="How to Contact Us">
        Email <a href={`mailto:${CONTACT_EMAIL}`} className="text-bark-600 underline underline-offset-2">{CONTACT_EMAIL}</a> with your order number and a description of the issue. We aim to respond within 24 hours.
      </Section>
    </article>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="font-serif text-xl text-bark-600 mb-3 font-normal">{title}</h2>
      <p className="font-sans text-sm text-bark-500 leading-relaxed">{children}</p>
    </div>
  )
}
