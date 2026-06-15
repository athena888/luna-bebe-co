import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { firstYearEnabled, FIRST_YEAR_SHIPMENTS } from '@/lib/first-year'
import { FirstYearCTA } from './FirstYearCTA'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com'

export const metadata: Metadata = {
  title: { absolute: 'The First Year — by Petite Lavande' },
  description: "One present that arrives again and again — a hand-finished outfit at birth, six months, and baby's first birthday.",
  alternates: { canonical: `${BASE}/the-first-year` },
  robots: { index: false }, // dark until the line is fully launched
}

// Sub-line landing page — its own room, shared brand DNA. Additive + flag-gated:
// hidden entirely unless NEXT_PUBLIC_FIRST_YEAR_ENABLED='true'. Styling is scoped
// (local Tailwind classes only) so nothing global changes.
export default function FirstYearPage() {
  if (!firstYearEnabled()) notFound()

  return (
    <>
      <Header />
      <main className="bg-[#FBF4EA] text-espresso">

        {/* Sub-wordmark + hero */}
        <section className="relative overflow-hidden px-6 py-24 sm:py-32 text-center">
          {/* Decorative sprig wash (reuses the brand's botanical feel via palette) */}
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06] bg-gradient-to-b from-[#9A80BD] via-transparent to-[#A7AE95]" />
          <div className="relative max-w-3xl mx-auto">
            <p className="font-sans text-[10px] tracking-[0.5em] uppercase text-[#9A80BD] mb-5">A Petite Lavande Sub-Line</p>
            <h1 className="font-serif uppercase leading-[0.95] text-espresso" style={{ fontSize: 'clamp(2.6rem, 9vw, 5rem)', letterSpacing: '0.06em' }}>
              The First Year
            </h1>
            <p className="font-serif italic text-lg sm:text-xl text-[#6F5B4D] mt-3">by Petite Lavande</p>

            <p className="font-serif text-2xl sm:text-3xl text-espresso leading-snug max-w-2xl mx-auto mt-12">
              Give more than a gift. Give the whole first year.
            </p>
            <p className="font-cormorant text-lg sm:text-xl text-[#6F5B4D] leading-loose max-w-2xl mx-auto mt-5">
              One present that arrives again and again — a beautiful outfit at birth, at six months, and at baby&rsquo;s
              first birthday. Each one hand-finished, sized to the moment, and wrapped to be remembered.
            </p>

            <div className="mt-10 flex justify-center">
              <FirstYearCTA />
            </div>
          </div>
        </section>

        {/* The three shipments as a visual sequence */}
        <section className="px-6 py-16 sm:py-24 border-t border-[#e7ddc9]">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <p className="font-sans text-[10px] tracking-[0.45em] uppercase text-[#9A80BD] mb-2">Three arrivals, one year</p>
              <h2 className="font-serif text-2xl sm:text-3xl text-espresso">How it unfolds</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
              {FIRST_YEAR_SHIPMENTS.map(s => (
                <div key={s.index} className="text-center">
                  <div className="mx-auto w-20 h-20 rounded-full border border-[#A7AE95] flex items-center justify-center mb-5 pl-round-full">
                    <span className="font-serif text-3xl text-[#A7AE95]">{s.numeral}</span>
                  </div>
                  <p className="font-sans text-[10px] tracking-[0.35em] uppercase text-[#9A80BD] mb-1">{s.label}</p>
                  <h3 className="font-serif text-xl text-espresso mb-1">{s.milestone}</h3>
                  <p className="font-sans text-[11px] tracking-[0.15em] uppercase text-[#A7AE95] mb-3">Size {s.sizeRange}</p>
                  <p className="font-cormorant text-base text-[#6F5B4D] leading-relaxed">{s.blurb}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Closing */}
        <section className="px-6 py-20 text-center border-t border-[#e7ddc9]">
          <p className="font-serif italic text-2xl text-[#9A80BD]">Fait avec amour, pour vous.</p>
          <div className="mt-8">
            <Link href="/" className="font-sans text-[11px] tracking-[0.25em] uppercase text-[#6F5B4D] hover:text-espresso transition-colors underline underline-offset-4">
              Return to Petite Lavande
            </Link>
          </div>
        </section>

      </main>
      <Footer />
    </>
  )
}
