import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { getBoxBySlug, boxItemTotal } from '@/lib/prebuilt-boxes'
import { BOX_BASE_PRICE, SHIPPING } from '@/lib/products'
import { BuyButton } from './BuyButton'
import { ArrowLeft } from 'lucide-react'

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

export default async function BoxDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const box = getBoxBySlug(slug)
  if (!box) notFound()

  const items = Object.values(box.selection).filter(Boolean) as NonNullable<typeof box.selection.swaddle>[]
  const boxTotal = BOX_BASE_PRICE + boxItemTotal(box.selection)

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream-100">

        {/* Breadcrumb */}
        <div className="bg-cream-50 border-b border-cream-300">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
            <Link
              href="/boxes"
              className="inline-flex items-center gap-2 font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 hover:text-bark-600 transition-colors"
            >
              <ArrowLeft size={12} />
              All Styles
            </Link>
            <span className="text-bark-300">·</span>
            <span className={`font-sans text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 rounded-full ${box.variant === 'girl' ? 'bg-rose-100/60 text-rose-400' : 'bg-cream-200 text-bark-400'}`}>
              {box.variant === 'girl' ? 'Girl' : 'Neutral'}
            </span>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-2 gap-14 items-start">

          {/* Left: box details */}
          <div>
            <p className="font-sans text-[9px] tracking-[0.45em] uppercase text-gold-400 mb-3">{box.style}</p>
            <h1 className="font-serif text-[3rem] sm:text-[4rem] text-bark-600 leading-tight mb-2">
              {box.name}
            </h1>
            <p className="font-cormorant text-xl italic text-bark-400 mb-1 leading-relaxed">{box.tagline}</p>
            <p className="font-sans text-[10px] tracking-[0.2em] text-bark-300 mb-8">{box.aesthetic}</p>
            <p className="font-sans text-sm text-bark-500 leading-loose mb-10">{box.description}</p>

            {/* What's inside */}
            <div className="border-t border-cream-300 pt-8">
              <p className="font-sans text-[9px] tracking-[0.3em] uppercase text-bark-400 mb-2">What&apos;s Inside</p>
              <p className="font-sans text-[10px] text-bark-300 mb-6">{items.length} curated items</p>
              <ul className="space-y-5">
                {items.map(item => (
                  <li key={item.id} className="flex items-start gap-4">
                    <span className="text-2xl shrink-0 leading-none mt-0.5">{item.imageEmoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="font-sans text-sm font-medium text-bark-600">{item.name}</p>
                        <span className="font-serif text-sm text-bark-400 shrink-0">{fmt(item.price)}</span>
                      </div>
                      <p className="font-sans text-xs text-bark-400 mt-1 leading-relaxed">{item.description}</p>
                      {item.tag && (
                        <span className="inline-block mt-1.5 font-sans text-[9px] tracking-[0.15em] uppercase text-gold-500 bg-gold-100/40 px-2 py-0.5 rounded-full">
                          {item.tag}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Always included */}
            <div className="mt-10 pt-8 border-t border-cream-300">
              <p className="font-sans text-[9px] tracking-[0.3em] uppercase text-bark-400 mb-4">Every Box Also Includes</p>
              <ul className="space-y-2">
                {['Premium magnetic gift box', 'Satin ribbon pull', 'Wax seal & dried lavender', 'Handwritten personal letter'].map(perk => (
                  <li key={perk} className="flex items-center gap-3 font-sans text-xs text-bark-400">
                    <span className="w-4 h-px bg-gold-300 shrink-0" />
                    {perk}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right: sticky order card */}
          <div className="lg:sticky lg:top-8">
            <div className="bg-cream-50 border border-cream-200 rounded-2xl p-8">
              <p className="font-sans text-[9px] tracking-[0.3em] uppercase text-bark-400 mb-6">Order Summary</p>

              <div className="space-y-3 pb-5 mb-5 border-b border-cream-200">
                <div className="flex justify-between">
                  <span className="font-sans text-xs text-bark-400">Petite Lavande Box</span>
                  <span className="font-sans text-xs text-bark-600">{fmt(BOX_BASE_PRICE)}</span>
                </div>
                {items.map(item => (
                  <div key={item.id} className="flex justify-between gap-4">
                    <span className="font-sans text-xs text-bark-400 truncate">{item.name}</span>
                    <span className="font-sans text-xs text-bark-600 shrink-0">{fmt(item.price)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between mb-1.5">
                <span className="font-sans text-sm text-bark-500">Subtotal</span>
                <span className="font-serif text-xl text-bark-600">{fmt(boxTotal)}</span>
              </div>
              <div className="flex justify-between mb-8">
                <span className="font-sans text-xs text-bark-400">Shipping</span>
                <span className="font-sans text-xs text-bark-400">from {fmt(SHIPPING.standard.price)}</span>
              </div>

              <BuyButton selection={box.selection} />

              <p className="font-sans text-[10px] text-bark-400/70 text-center mt-4 leading-relaxed">
                Add a handwritten letter, choose shipping speed,<br />and apply promo codes at checkout.
              </p>

              <div className="mt-6 pt-6 border-t border-cream-200 text-center">
                <p className="font-sans text-[9px] tracking-[0.2em] uppercase text-bark-400 mb-1">Prefer to customize?</p>
                <Link href="/build" className="font-sans text-[10px] text-bark-400 hover:text-bark-600 underline underline-offset-2 transition-colors">
                  Build your own box →
                </Link>
              </div>
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </>
  )
}
