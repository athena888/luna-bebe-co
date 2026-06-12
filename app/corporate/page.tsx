import type { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { SlotBackground } from '@/components/ui/SlotBackground'
import { CorporateForm } from './CorporateForm'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com'

export const metadata: Metadata = {
  title: { absolute: 'Corporate Baby Gifts for Employees | Petite Lavande' },
  description: "Thoughtful organic newborn gift boxes for your employees' growing families. Hand-packed, traceable, delivered. Volume pricing for People & HR teams.",
  alternates: { canonical: `${BASE}/corporate` },
  openGraph: {
    title: 'Corporate Baby Gifts for Employees | Petite Lavande',
    description: "Thoughtful organic newborn gift boxes for your employees' growing families. Hand-packed, traceable, delivered. Volume pricing for People & HR teams.",
    url: `${BASE}/corporate`,
    type: 'website',
  },
}

const POINTS = [
  {
    title: 'One less thing for your team',
    body: 'Tell us the due date and the address; we handle the rest, including a hand-written card from your company.',
  },
  {
    title: 'Traceable, not generic',
    body: 'Organic cotton garments, botanical bath goods, and a card that tells the story of every item. We don’t curate. We trace.',
  },
  {
    title: 'Simple to run',
    body: 'Volume pricing, invoicing available, and a single point of contact who answers same-day.',
  },
]

export default function CorporatePage() {
  return (
    <>
      <Header />
      <main className="bg-cream-50 min-h-screen">

        {/* Hero — background uploadable via Portal → Site Images → Corporate */}
        <SlotBackground slotKey="corporate.hero_bg" scrim="bg-cream-50/40" className="border-b border-cream-300">
          <section className="px-6 py-20 sm:py-28 text-center">
            <p className="font-sans text-[10px] tracking-[0.4em] uppercase text-gold-400 mb-5">Corporate &amp; Team Gifting</p>
            <h1 className="font-serif text-4xl sm:text-6xl text-bark-600 leading-tight max-w-3xl mx-auto">
              When your people become parents
            </h1>
            <p className="font-cormorant text-lg sm:text-xl text-bark-400 leading-loose max-w-2xl mx-auto mt-6">
              A birth is the biggest week in an employee&rsquo;s life. Most companies send a logo mug. Send something
              that sees the moment — an organic newborn gift box that cares for the new parent as much as the baby,
              hand-packed and delivered to their door.
            </p>
          </section>
        </SlotBackground>

        {/* Three points — dark section, white text; background image uploadable
            via Portal → Site Images → Corporate. Whole image shown (not cropped). */}
        <SlotBackground slotKey="corporate.points_bg" fit="contain" scrim="" className="border-b border-cream-300 bg-bark-800">
          <section className="px-6 py-16 sm:py-20">
            <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-12">
              {POINTS.map(({ title, body }) => (
                <div key={title}>
                  <div className="w-8 h-px bg-gold-400 mb-5" />
                  <h2 className="font-serif text-xl text-cream-50 mb-3 leading-snug">{title}</h2>
                  <p className="font-sans text-sm text-cream-100/80 leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </section>
        </SlotBackground>

        {/* Lead form — background uploadable via Portal → Site Images → Corporate */}
        <SlotBackground slotKey="corporate.form_bg" scrim="bg-cream-50/85">
          <section className="px-6 py-16 sm:py-24">
            <div className="max-w-xl mx-auto">
              <CorporateForm />
            </div>
          </section>
        </SlotBackground>

      </main>
      <Footer />
    </>
  )
}
