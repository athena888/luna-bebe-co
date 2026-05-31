import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Petite Lavande collects, uses, and protects your personal information.',
}

export default function PrivacyPage() {
  return (
    <article className="prose prose-sm max-w-none font-sans text-bark-600">
      <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-gold-400 mb-4">Legal</p>
      <h1 className="font-serif text-4xl font-normal text-bark-600 mb-2">Privacy Policy</h1>
      <p className="text-bark-400 text-sm mb-10">Last updated: May 2025</p>

      <Section title="1. Information We Collect">
        When you place an order, we collect your name, email address, phone number, shipping address, and payment information. Payment data is processed directly by Stripe and is never stored on our servers. We may also collect usage data (pages visited, time on site) to improve our experience.
      </Section>

      <Section title="2. How We Use Your Information">
        We use your information to process and fulfill orders, send order confirmations and shipping updates, respond to customer service inquiries, and — with your consent — send occasional marketing emails. We do not sell or rent your personal information to third parties.
      </Section>

      <Section title="3. Cookies">
        Our site uses cookies to remember your preferences and support analytics (Google Analytics). You may decline non-essential cookies using the cookie banner when you first visit our site. Essential cookies required for checkout cannot be disabled.
      </Section>

      <Section title="4. Third-Party Services">
        We use the following third-party services that may process your data:
        <ul className="mt-2 space-y-1 list-disc list-inside text-bark-500">
          <li>Stripe — payment processing</li>
          <li>Shippo — shipping label generation</li>
          <li>Resend — transactional email</li>
          <li>Supabase — order and product data storage</li>
          <li>Google Analytics — anonymous site usage analytics</li>
        </ul>
      </Section>

      <Section title="5. Data Retention">
        We retain order records for up to 7 years for accounting and legal compliance. You may request deletion of your personal data (excluding records required by law) by contacting us.
      </Section>

      <Section title="6. Your Rights">
        Depending on your location, you may have rights to access, correct, or delete your personal data; to opt out of marketing communications; and to file a complaint with a data protection authority. To exercise these rights, contact us at the address below.
      </Section>

      <Section title="7. California Residents (CCPA)">
        California residents have the right to know what personal information we collect, to request deletion of their data, and to opt out of the sale of their data. We do not sell personal information.
      </Section>

      <Section title="8. Children's Privacy">
        Our site is not directed at children under 13. We do not knowingly collect personal information from children.
      </Section>

      <Section title="9. Contact">
        For privacy-related requests, email <a href="mailto:hello@petitelavande.com" className="text-bark-600 underline underline-offset-2">hello@petitelavande.com</a>.
      </Section>
    </article>
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
