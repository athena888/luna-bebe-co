import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { JsonLd } from '@/components/ui/JsonLd'
import { SameDayCountdown } from '@/components/ui/SameDayCountdown'
import { FaqAccordion } from '@/components/ui/FaqAccordion'
import { getBoxProducts, priceRange } from '@/lib/catalog-db'

export const dynamic = 'force-dynamic'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com'

const CITIES = ['Seattle', 'Bellevue', 'Kirkland', 'Redmond', 'Mercer Island', 'Sammamish', 'Issaquah', 'Bothell', 'Woodinville', 'Newcastle', 'Renton', 'Shoreline']

const FAQS = [
  { q: 'What is the same-day cutoff?', a: 'Order by 1:00 PM Pacific and your box is hand-packed and delivered the same evening between 5–9 PM. Orders after 1 PM arrive the following evening.' },
  { q: 'How much is delivery, and where do you go?', a: `Same-day courier delivery is a flat $15 across ${CITIES.slice(0, 4).join(', ')} and nearby Eastside cities. Everywhere else in the US, we ship nationwide in 2–5 business days.` },
  { q: 'Can you deliver to a hospital?', a: 'Yes — we deliver to maternity units across Seattle. Add the hospital name, unit or room, and the family name in the delivery notes at checkout, and our courier hands it to the front desk for the family.' },
  { q: 'Is the gift message really handwritten?', a: 'Every box includes a personalized card, hand-finished with your message — written out for you, never a printed slip tossed in the box.' },
  { q: 'What if the recipient is not home?', a: 'Our courier will leave the box in a safe covered spot and text a photo, or — if you prefer — we\'ll call ahead to arrange a time. Tell us in the delivery notes at checkout.' },
]

export const metadata: Metadata = {
  title: { absolute: 'Same-Day Baby Gift Delivery Seattle | Petite Lavande' },
  description: 'Same day baby gift delivery in Seattle & the Eastside — organic newborn and postpartum gift boxes, hand-packed with a hand-finished card and couriered this evening. Order by 1 PM.',
  alternates: { canonical: `${BASE}/same-day-delivery` },
  openGraph: {
    title: 'Same-Day Baby Gift Delivery in Seattle',
    description: 'Order by 1 PM — a hand-packed organic baby gift box, delivered this evening across Seattle and the Eastside.',
    url: `${BASE}/same-day-delivery`,
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
}

export default async function SameDayDeliveryPage() {
  const boxes = (await getBoxProducts()).slice(0, 4)

  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: 'Same-Day Baby Gift Delivery',
        serviceType: 'Same-day gift delivery',
        description: 'Same-day courier delivery of organic newborn and postpartum gift boxes across Seattle and the Eastside. Order by 1 PM for evening delivery.',
        areaServed: CITIES.map(c => ({ '@type': 'City', name: c })),
        provider: {
          '@type': 'LocalBusiness',
          name: 'Petite Lavande',
          url: BASE,
          image: `${BASE}/logo-color.png`,
          areaServed: 'Seattle metropolitan area',
        },
        offers: { '@type': 'Offer', price: '15.00', priceCurrency: 'USD', description: 'Flat same-day delivery fee, evenings 5–9 PM' },
      }} />
      <Header />
      <main className="bg-white min-h-screen">
        {/* Hero */}
        <section className="bg-cream-50 border-b border-cream-300 px-6 py-16 sm:py-20 text-center">
          <p className="font-sans text-[11px] tracking-[0.3em] uppercase text-gold-400 mb-5">Seattle &amp; the Eastside · Same-Day</p>
          <h1 className="font-serif text-4xl sm:text-5xl text-espresso leading-tight max-w-2xl mx-auto">
            The baby arrived today. So can the gift.
          </h1>
          <p className="font-playfair text-base sm:text-lg text-espresso-light leading-loose max-w-xl mx-auto mt-6">
            French countryside–inspired organic newborn and postpartum gift boxes — hand-packed in Seattle
            and couriered to their door (or hospital room) this evening.
          </p>
          <div className="mt-6 flex flex-col items-center gap-5">
            <SameDayCountdown />
            <Link
              href="/boxes"
              className="inline-block bg-[#7A8E7C] text-white font-sans text-[11px] tracking-[0.25em] uppercase px-10 py-4 hover:bg-[#6d8070] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-espresso"
            >
              Shop Gift Boxes
            </Link>
          </div>
        </section>

        {/* How it works */}
        <section className="max-w-4xl mx-auto px-6 py-14">
          <h2 className="font-serif text-2xl text-espresso text-center mb-10">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            {[
              { n: '1', t: 'Order by 1 PM', d: 'Choose a ready-made box or build your own, any day of the week.' },
              { n: '2', t: 'Packed by hand', d: 'Nested in a seagrass basket with your hand-finished personalized card.' },
              { n: '3', t: 'Delivered this evening', d: 'Our courier arrives between 5–9 PM — home, office, or maternity unit.' },
            ].map(s => (
              <div key={s.n}>
                <p className="font-serif text-3xl text-[#8E7F9E] mb-2" aria-hidden="true">{s.n}</p>
                <p className="font-sans text-sm font-medium text-bark-600 mb-1.5">{s.t}</p>
                <p className="font-sans text-sm text-bark-500 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Boxes available today */}
        {boxes.length > 0 && (
          <section className="bg-cream-50 border-y border-cream-300 px-6 py-14">
            <div className="max-w-6xl mx-auto">
              <h2 className="font-serif text-2xl text-espresso text-center mb-10">Ready to send today</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {boxes.map(b => {
                  const { low, high } = priceRange(b)
                  const cover = ((b.story as { hub_image?: string })?.hub_image) || b.variants[0]?.images[0]
                  return (
                    <Link key={b.slug} href={`/boxes/${b.slug}`} className="group block bg-white border border-cream-300 hover:border-espresso-light transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-espresso">
                      <div className="relative aspect-[3/4] bg-cream-100">
                        {cover
                          ? <Image src={cover} alt={b.name} fill className="object-cover" unoptimized sizes="(max-width:640px) 90vw, 300px" />
                          : <div className="absolute inset-0 flex items-center justify-center font-sans text-[10px] tracking-[0.2em] uppercase text-bark-300">Photography coming soon</div>}
                      </div>
                      <div className="p-4">
                        <h3 className="font-serif text-lg text-espresso group-hover:text-bark-600">{b.name}</h3>
                        <p className="font-sans text-sm text-bark-600 mt-1">{low === high ? `$${low / 100}` : `$${low / 100} – $${high / 100}`}</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {/* Delivery area */}
        <section className="max-w-3xl mx-auto px-6 py-14 text-center">
          <h2 className="font-serif text-2xl text-espresso mb-4">Where we deliver same-day</h2>
          <p className="font-sans text-sm text-bark-500 mb-6">
            Flat <strong className="text-bark-600">$15</strong> same-day courier delivery, evenings <strong className="text-bark-600">5–9 PM</strong>.
          </p>
          <ul className="flex flex-wrap justify-center gap-2" aria-label="Same-day delivery cities">
            {CITIES.map(c => (
              <li key={c} className="font-sans text-[12px] tracking-wide text-bark-600 border border-cream-300 bg-cream-50 px-3 py-1.5">{c}</li>
            ))}
          </ul>
          <p className="font-sans text-xs text-bark-400 mt-6">
            Outside the Seattle area? We ship nationwide — 2–5 business days.
          </p>
        </section>

        {/* FAQ */}
        <section className="max-w-2xl mx-auto px-6 pb-16">
          <h2 className="font-serif text-2xl text-espresso mb-6">Questions, answered</h2>
          <FaqAccordion items={FAQS} />
        </section>
      </main>
      <Footer />
    </>
  )
}
