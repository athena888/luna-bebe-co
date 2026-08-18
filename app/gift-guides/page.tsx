import type { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import Link from 'next/link'
import { Footer } from '@/components/layout/Footer'
import { SlotBackground } from '@/components/ui/SlotBackground'
import { getAllGuides } from '@/lib/landing-content'
import { getSiteImages } from '@/lib/site-images'
import { GuidesGrid, type GuideCard } from './GuidesGrid'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com'

export const revalidate = 3600

export const metadata: Metadata = {
  title: { absolute: 'Gifting Ideas — Baby & New-Mama Gift Guides | Petite Lavande' },
  description: 'Find the perfect gift — organic newborn boxes, gender-neutral sets, postpartum care for mama, luxury baby-shower gifts and corporate gifting. One place, filter by occasion.',
  alternates: { canonical: `${BASE}/gift-guides` },
  openGraph: { title: 'Gifting Ideas | Petite Lavande', description: 'Every Petite Lavande gift guide in one place — filter by occasion.', url: `${BASE}/gift-guides`, type: 'website' },
}

export default async function GiftGuidesHub() {
  const guides = await getAllGuides()
  const heroKeys = guides.map(g => `gifts.${g.slug}.hero`)
  const images = await getSiteImages(heroKeys)

  const cards: GuideCard[] = guides.map(g => ({
    slug: g.slug,
    href: `/gifts/${g.slug}`,
    h1: g.h1,
    eyebrow: g.eyebrow,
    blurb: g.intro[0] ?? '',
    tag: g.tag,
    image: images[`gifts.${g.slug}.hero`]?.public_url ?? null,
  }))

  // Corporate has its own managed page — surface it here so the hub is the one
  // true "Gifting Ideas" destination.
  const corpImg = await getSiteImages(['gifts.corporate.card', 'corporate.hero_bg'])
  cards.push({
    slug: 'corporate',
    href: '/corporate',
    h1: 'Corporate & Team Gifting',
    eyebrow: 'For Business',
    blurb: 'Thoughtful, beautifully finished gifts for clients, teams and new-parent colleagues — handled end to end, at any scale.',
    tag: 'Corporate',
    image: corpImg['gifts.corporate.card']?.public_url ?? corpImg['corporate.hero_bg']?.public_url ?? null,
  })

  return (
    <>
      <Header />
      <main className="bg-cream-50 min-h-screen">

        <SlotBackground slotKey="guide.header_bg" scrim="bg-cream-50/80" className="border-b border-cream-300">
          <section className="px-6 sm:px-8 py-16 sm:py-24 text-center">
            <div className="max-w-2xl mx-auto">
              <p className="font-sans text-[11px] tracking-[0.18em] uppercase text-gold-400 mb-4">Gifting Ideas</p>
              <h1 className="font-serif text-[2.5rem] sm:text-[3.5rem] text-espresso leading-[1.05] mb-5">Find the perfect gift</h1>
              <p className="font-cormorant text-lg sm:text-xl text-bark-400 leading-loose">
                Whether it&rsquo;s for a newborn, the new mama, a baby shower or a whole team — every Petite Lavande gift guide, in one place. Filter by the occasion and let us do the rest.
              </p>
            </div>
          </section>
        </SlotBackground>

        <section className="px-6 sm:px-10 py-16 sm:py-20">
          <div className="max-w-6xl mx-auto">
            <GuidesGrid guides={cards} />
          </div>
        </section>

        <p className="max-w-6xl mx-auto px-6 pb-14 font-sans text-sm text-bark-400">
          Prefer longer reads? <Link href="/journal" className="underline underline-offset-2 hover:text-bark-600">Visit the journal</Link>.
        </p>
      </main>
      <Footer />
    </>
  )
}
