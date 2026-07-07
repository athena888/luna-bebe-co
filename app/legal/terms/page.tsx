import type { Metadata } from 'next'
import { CONTACT_EMAIL } from '@/lib/site-config'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms and conditions for purchasing from Petite Lavande',
  alternates: { canonical: '/legal/terms' },
}

export default function TermsPage() {
  return (
    <article className="prose prose-sm max-w-none font-sans text-bark-600">
      <p className="font-sans text-[11px] tracking-[0.3em] uppercase text-gold-400 mb-4">Legal</p>
      <h1 className="font-serif text-4xl font-normal text-espresso mb-2">Terms of Service</h1>
      <p className="text-bark-400 text-sm mb-10">Last updated: June 2026</p>

      <Section title="1. Overview">
        By placing an order with Petite Lavande &amp; Co. (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;), you agree to these Terms of Service. Please read them carefully before completing your purchase.
      </Section>

      <Section title="2. Products">
        All items in our gift boxes are organic, sustainably sourced, and curated for newborns and new mothers. Product descriptions, ingredients, and imagery are as accurate as possible. Minor variations in handcrafted items are expected and part of their artisan quality.
      </Section>

      <Section title="3. Orders & Payment">
        Orders are processed through Stripe, a PCI-compliant payment processor. We accept all major credit cards. Payment is charged at the time of checkout. Order confirmation is sent by email.
      </Section>

      <Section title="4. Pricing">
        All prices are listed in USD. We reserve the right to modify pricing at any time; changes will not affect orders already placed. Shipping costs are calculated at checkout based on the selected shipping method.
      </Section>

      <Section title="5. Shipping">
        We ship within the United States only. Standard shipping takes 5–7 business days; premium rush shipping takes 1–2 business days. Shipping timelines begin after your box is assembled (within 24 hours of your order). We are not responsible for delays caused by carriers.
      </Section>

      <Section title="6. Cancellations">
        Orders may be cancelled within 2 hours of placement by contacting us immediately. Because each box is assembled by hand, we cannot cancel orders once assembly has begun.
      </Section>

      <Section title="7. Returns & Refunds">
        Please see our <a href="/legal/returns" className="text-bark-600 underline underline-offset-2">Returns &amp; Refund Policy</a> for full details.
      </Section>

      <Section title="8. Intellectual Property">
        All content on this website — including imagery, copy, and brand design — is the property of Petite Lavande &amp; Co. and may not be reproduced without written permission.
      </Section>

      <Section title="9. Limitation of Liability">
        To the extent permitted by law, Petite Lavande &amp; Co. is not liable for any indirect, incidental, or consequential damages arising from your use of our site or products.
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
