import type { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { SlotBackground } from '@/components/ui/SlotBackground'
import { SlotImage } from '@/components/ui/SlotImage'
import { HandHeart, Leaf, Phone } from 'lucide-react'
import { ScrollFlyIn } from '@/components/ui/ScrollFlyIn'
import { CONTACT_EMAIL } from '@/lib/site-config'
import { ogImages } from '@/lib/og-image'
import { CorporateForm } from './CorporateForm'

// Closing line at the bottom of the three-points band — the low-friction
// alternative to the lead form below.
function ContactLine({ className = '', olive = false }: { className?: string; olive?: boolean }) {
  return (
    <p className={`text-center font-playfair text-base sm:text-lg ${olive ? 'text-white/95' : 'text-cream-50/90'} ${className}`}>
      Contact{' '}
      <a href={`mailto:${CONTACT_EMAIL}`} className={`underline underline-offset-4 transition-colors ${olive ? 'text-white hover:text-cream-100' : 'text-gold-300 hover:text-gold-200'}`}>{CONTACT_EMAIL}</a>
      {' '}for your team and organization.
    </p>
  )
}

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com'

const DESCRIPTION = "Thoughtful organic newborn gift boxes for your employees' growing families. Hand-packed, traceable, delivered. Volume pricing for People & HR teams."

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: { absolute: 'Corporate Baby Gifts for Employees | Petite Lavande' },
    description: DESCRIPTION,
    alternates: { canonical: `${BASE}/corporate` },
    openGraph: {
      title: 'Corporate & Team Baby Gifts',
      description: DESCRIPTION,
      url: `${BASE}/corporate`,
      type: 'website',
      // Declaring openGraph drops the root layout's image, so this page had
      // none at all — it shared as a bare link. Uses the corporate hero if one
      // is uploaded, else the brand default.
      images: await ogImages('corporate.hero_bg'),
    },
  }
}

const POINTS = [
  {
    Icon: HandHeart,
    title: 'One less thing for your team',
    body: 'Tell us the due date and the address; we handle the rest, including a personalized card from your company.',
  },
  {
    Icon: Leaf,
    title: 'Traceable, not generic',
    body: 'Organic cotton garments, botanical bath goods, and a card that tells the story of every item. We don’t curate. We trace.',
  },
  {
    Icon: Phone,
    title: 'Simple to run',
    body: 'Volume pricing, invoicing available, and a single point of contact who answers same-day.',
  },
]

// The three selling points — centered, each rising in on scroll with a small
// stagger. `variant`: 'photo' = over the desktop photo band; 'olive' = inside
// the mobile framed olive panel (Unforgettable-panel styling).
function Points({ className = '', variant = 'photo' }: { className?: string; variant?: 'photo' | 'olive' }) {
  const olive = variant === 'olive'
  return (
    <div className={`grid text-center ${className}`}>
      {POINTS.map(({ Icon, title, body }, i) => (
        <ScrollFlyIn key={title} from="up" delay={i * 160}>
          <Icon size={26} strokeWidth={1.5} className={`${olive ? 'text-white' : 'text-gold-300'} mx-auto mb-4`} />
          <div className={`w-8 h-px ${olive ? 'bg-white/70' : 'bg-gold-400'} mb-5 mx-auto`} />
          {/* The desktop and mobile bands are mutually exclusive (hidden md:block
              / md:hidden), so a visitor never sees these twice — but BOTH are in
              the HTML, which gave the document six <h2>s for three points. The
              phone copy renders the same text as a <p>, so the outline has one
              heading per point while the page looks identical. */}
          {olive
            ? <p className="font-serif text-xl text-white mb-3 leading-snug">{title}</p>
            : <h2 className="font-serif text-xl text-cream-50 mb-3 leading-snug">{title}</h2>}
          <p className={`${olive ? 'font-playfair text-[15px] text-white/95' : 'font-sans text-sm text-cream-100/85'} leading-relaxed`}>{body}</p>
        </ScrollFlyIn>
      ))}
    </div>
  )
}

export default function CorporatePage() {
  return (
    <>
      <Header />
      <main className="bg-cream-50 min-h-screen">

        {/* Hero — background uploadable via Portal → Site Images → Corporate */}
        <SlotBackground slotKey="corporate.hero_bg" scrim="bg-cream-50/40" className="border-b border-cream-300">
          <section className="px-6 py-12 sm:py-16 text-center">
            <p className="font-sans text-[11px] tracking-[0.18em] uppercase text-gold-400 mb-5" style={{ animation: 'slideUp 0.7s ease-out both' }}>Corporate &amp; Team Gifting</p>
            <h1 className="font-serif text-3xl sm:text-5xl text-espresso leading-tight max-w-3xl mx-auto" style={{ animation: 'slideUp 0.9s ease-out 0.12s both' }}>
              When your people become parents
            </h1>
            <p className="font-playfair text-base sm:text-lg text-espresso-light leading-loose max-w-2xl mx-auto mt-6" style={{ animation: 'slideUp 0.9s ease-out 0.26s both' }}>
              A birth is the biggest week in an employee&rsquo;s life. Most companies send a logo mug. Send something
              that sees the moment — an organic newborn gift box that cares for the new parent as much as the baby,
              hand-packed and delivered to their door.
            </p>
          </section>
        </SlotBackground>

        {/* Three points. Background image uploadable in Portal → Contents →
            Corporate. Desktop: the whole photo shows and the points overlay it.
            Mobile: the photo alone isn't tall enough for three stacked points,
            so the photo sits on top and the points stack below on the dark band. */}
        <div className="border-b border-cream-300">
          {/* Desktop — points overlaid on the full-width photo */}
          <div className="hidden md:block bg-bark-800">
            <SlotBackground slotKey="corporate.points_bg" fit="natural" scrim="">
              <section className="px-6 py-16">
                <Points className="max-w-5xl mx-auto grid-cols-3 gap-12" />
                <ContactLine className="mt-14" />
              </section>
            </SlotBackground>
          </div>
          {/* Mobile — photo, then the points inside the framed olive panel
              (same design as the homepage "Create Something Unforgettable"). */}
          <div className="md:hidden">
            {/* Cropped to a tall 4:5 on phones so it carries the same visual
                weight as the other full-width photos (wide originals otherwise
                render as a short strip). Upload corporate.points_bg.mobile for
                a hand-tuned phone crop. */}
            <SlotImage slotKey="corporate.points_bg" className="block w-full aspect-[4/5] overflow-hidden" imgClassName="w-full h-full object-cover block" />
            <div className="bg-[#8A9B63]">
              <div className="relative px-9 py-14">
                {/* Double-line frame — heavier outer rule, thin inner rule */}
                <div className="pointer-events-none absolute inset-4 border-2 border-white">
                  <div className="absolute inset-[6px] border border-white" />
                </div>
                <div className="relative">
                  <Points variant="olive" className="grid-cols-1 gap-9" />
                  <ContactLine olive className="mt-10" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lead form — writes to b2b_leads + the outreach tracker (hot flag,
            team email) via the submitB2bLead server action. The mailto line
            above stays as the low-friction alternative. Background uploadable
            via Portal → Site Images → Corporate (web + mobile crops). */}
        <SlotBackground slotKey="corporate.form_bg" scrim="bg-cream-50/60">
          <section className="px-6 py-16 sm:py-20">
            <div className="max-w-xl mx-auto bg-cream-50/95 border border-cream-300 p-6 sm:p-8">
              <CorporateForm />
            </div>
          </section>
        </SlotBackground>

      </main>
      <Footer />
    </>
  )
}
