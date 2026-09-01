import type { Metadata } from 'next'
import { BUSINESS_LEGAL_NAME, CONTACT_EMAIL, CANCELLATION_WINDOW_HOURS } from '@/lib/site-config'
import { FREE_SHIPPING_THRESHOLD, SHIPPING, formatDollars } from '@/lib/products'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms and conditions for purchasing from Petite Lavande',
  alternates: { canonical: '/legal/terms' },
}

export default function TermsPage() {
  return (
    <article className="prose prose-sm max-w-none font-sans text-bark-600">
      <p className="font-sans text-[11px] tracking-[0.18em] uppercase text-gold-400 mb-4">Legal</p>
      <h1 className="font-serif text-4xl font-normal text-espresso mb-2">Terms of Service</h1>
      <p className="text-bark-400 text-sm mb-10">Last updated: June 2026</p>

      <Section title="1. Overview">
        By placing an order with {BUSINESS_LEGAL_NAME}, trading as Petite Lavande (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;), you agree to these Terms of Service. Please read them carefully before completing your purchase.
      </Section>

      <Section title="2. Products">
        Our gift boxes contain a curated mix of organic-cotton textiles, natural-material baby items, and gifts for new mothers. Materials, ingredients, and certification information are stated on individual product pages where applicable. Product descriptions, ingredients, and imagery are as accurate as possible. Minor variations in handcrafted items are expected and part of their artisan quality.
      </Section>

      <Section title="3. Orders & Payment">
        Orders are processed through Stripe, a PCI-compliant payment processor. We accept all major credit cards. Payment is charged at the time of checkout. Order confirmation is sent by email.
      </Section>

      <Section title="4. Pricing">
        All prices are listed in USD. We reserve the right to modify pricing at any time; changes will not affect orders already placed. Shipping costs are calculated at checkout based on the selected shipping method.
      </Section>

      <Section title="5. Shipping">
        We currently ship within the United States. Orders placed before 1:00 PM Pacific Time, Monday to Friday, are typically dispatched the same business day; later orders, weekends and federal holidays are processed the next business day. Transit time is counted after dispatch: standard shipping is {SHIPPING.standard.days}, {SHIPPING.premium.label.toLowerCase()} is {SHIPPING.premium.days}. Standard shipping is free on orders of {formatDollars(FREE_SHIPPING_THRESHOLD)} or more. Delivery estimates are carrier estimates, not guarantees, and we are not responsible for delays caused by carriers. See our <a href="/legal/shipping" className="text-bark-600 underline underline-offset-2">Shipping Policy</a> for full details.
      </Section>

      <Section title="6. Cancellations">
        Orders may be cancelled within {CANCELLATION_WINDOW_HOURS} hours of placement by contacting us immediately. Because each box is assembled by hand, we cannot cancel orders once assembly has begun.
      </Section>

      <Section title="7. Returns & Refunds">
        Please see our <a href="/legal/returns" className="text-bark-600 underline underline-offset-2">Returns &amp; Refund Policy</a> for full details.
      </Section>

      <Section title="8. Intellectual Property">
        All content on this website — including imagery, copy, and brand design — is the property of {BUSINESS_LEGAL_NAME} and may not be reproduced without written permission.
      </Section>

      <Section title="9. Limitation of Liability">
        To the extent permitted by law, {BUSINESS_LEGAL_NAME} is not liable for any indirect, incidental, or consequential damages arising from your use of our site or products.
      </Section>

      <Section title="10. Governing Law">
        These terms are governed by the laws of the United States. Any disputes shall be resolved in the applicable jurisdiction.
      </Section>

      <Section title="11. Contact">
        Questions about these terms? Email us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-bark-600 underline underline-offset-2">{CONTACT_EMAIL}</a>.
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
