import type { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com'

export const metadata: Metadata = {
  title: 'Our Cotton — Certified Organic',
  description: 'Why Petite Lavande uses GOTS-certified organic cotton: pure, soft on newborn skin, and traceable from field to finished garment.',
  alternates: {
    canonical: `${BASE}/our-cotton`,
    languages: { en: `${BASE}/our-cotton`, 'es-US': `${BASE}/es/nuestro-algodon`, 'x-default': `${BASE}/our-cotton` },
  },
}

export default function OurCottonPage() {
  return (
    <>
      <Header />
      <main className="bg-white min-h-screen">
        <section className="max-w-2xl mx-auto px-6 py-16">
          <h1 className="font-serif text-4xl text-espresso mb-8">Our cotton, in plain words</h1>
          <div className="space-y-5 font-sans text-[15px] text-bark-600 leading-relaxed">
            <p>
              A newborn&apos;s skin is the softest thing they own. That&apos;s why every organic cotton piece
              we pack is pure and gentle against it — grown without harsh chemicals, and finished without them too.
            </p>
            <p>
              The cotton makers we work with hold GOTS certification — the Global Organic Textile Standard. In plain
              language, it means an independent organization traces the cotton from the field to the finished
              garment: how it&apos;s grown, how it&apos;s dyed, and how the people who make it are treated.
              We don&apos;t have to take anyone&apos;s word for it, and neither do you.
            </p>
            <p>
              Not everything in a box is cotton — wooden rattles, dried lavender, botanical bath melts. For those
              we hold the same line: simple materials, small workshops, made with love.
            </p>
            <p>
              Look for the badge on any product page — if it&apos;s there, that piece is certified organic cotton.
            </p>
          </div>
          <p className="mt-10">
            <Link href="/boxes" className="font-sans text-sm text-bark-600 underline underline-offset-2 hover:text-espresso">
              See the gift boxes →
            </Link>
          </p>
        </section>
      </main>
      <Footer />
    </>
  )
}
