'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { PREBUILT_BOXES, boxItemTotal } from '@/lib/prebuilt-boxes'
import { BOX_BASE_PRICE, CATEGORY_LABELS } from '@/lib/products'
import type { BoxSelection } from '@/types'

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(0)}`
}

function shopThisBox(selection: BoxSelection) {
  sessionStorage.setItem('pl_box_selection', JSON.stringify(selection))
}

export default function ShopPage() {
  const router = useRouter()

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream-50">

        {/* Hero */}
        <div className="border-b border-cream-300 px-6 py-16 text-center">
          <p className="font-sans text-[10px] tracking-[0.35em] uppercase text-gold-400 mb-3">Curated Styles</p>
          <h1 className="font-serif text-4xl sm:text-5xl text-bark-600 mb-4">Gift Box Catalog</h1>
          <p className="font-sans text-sm text-bark-400 max-w-md mx-auto leading-relaxed">
            Every box is thoughtfully assembled, gift-wrapped, and sealed with our signature wax stamp. Choose a curated style or build your own.
          </p>
        </div>

        {/* Box cards */}
        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {PREBUILT_BOXES.map(box => {
              const items = Object.values(box.selection).filter(Boolean) as NonNullable<typeof box.selection.swaddle>[]
              const total = boxItemTotal(box.selection) + BOX_BASE_PRICE

              return (
                <div key={box.slug} className="flex flex-col border border-cream-200 bg-white">
                  <div className="h-1 w-full bg-gold-300" />

                  <div className="px-6 pt-7 pb-5 border-b border-cream-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-block font-sans text-[9px] tracking-[0.3em] uppercase px-2.5 py-1 bg-cream-100 text-bark-400">{box.style}</span>
                      <span className={`font-sans text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 rounded-full ${box.variant === 'girl' ? 'bg-rose-100/60 text-rose-400' : 'bg-cream-200 text-bark-400'}`}>
                        {box.variant === 'girl' ? 'Girl' : 'Neutral'}
                      </span>
                    </div>
                    <h2 className="font-serif text-2xl text-bark-600 mb-1">{box.name}</h2>
                    <p className="font-cormorant italic text-base text-bark-400 mb-1 leading-snug">{box.tagline}</p>
                    <p className="font-sans text-[9px] tracking-[0.15em] text-bark-300 mb-3">{box.aesthetic}</p>
                    <p className="font-sans text-xs text-bark-400 leading-relaxed">{box.description}</p>
                  </div>

                  <div className="px-6 py-5 flex-1 border-b border-cream-200">
                    <p className="font-sans text-[9px] tracking-[0.25em] uppercase text-bark-400 mb-1">What&apos;s Inside</p>
                    <p className="font-sans text-[10px] text-bark-300 mb-3">{items.length} curated items</p>
                    <div className="space-y-2.5">
                      {items.map(product => (
                        <div key={product.id} className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-sans text-[9px] tracking-[0.15em] uppercase text-bark-400/60">{CATEGORY_LABELS[product.category as keyof typeof CATEGORY_LABELS] ?? product.category}</p>
                            <p className="font-sans text-xs text-bark-600 leading-snug">{product.name}</p>
                          </div>
                          <span className="font-sans text-xs text-bark-400 shrink-0">${(product.price / 100).toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="px-6 py-4 border-b border-cream-200 space-y-1">
                    <div className="flex justify-between font-sans text-xs text-bark-400">
                      <span>Box & Experience</span><span>${(BOX_BASE_PRICE / 100).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between font-sans text-sm font-medium text-bark-600">
                      <span>Total (+ shipping)</span><span>From {formatPrice(total)}</span>
                    </div>
                  </div>

                  <div className="px-6 py-5 flex flex-col gap-2.5">
                    <button
                      onClick={() => { shopThisBox(box.selection); router.push('/checkout') }}
                      className="w-full bg-bark-600 text-cream-50 font-sans text-[11px] tracking-[0.2em] uppercase py-3.5 hover:bg-bark-700 transition-colors"
                    >
                      Shop This Style
                    </button>
                    <button
                      onClick={() => { shopThisBox(box.selection); router.push('/build') }}
                      className="w-full border border-cream-300 text-bark-500 font-sans text-[11px] tracking-[0.2em] uppercase py-3.5 hover:border-bark-400 hover:text-bark-600 transition-colors"
                    >
                      Customize
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-16 text-center border-t border-cream-300 pt-12">
            <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark-400 mb-3">Or start from scratch</p>
            <h2 className="font-serif text-2xl text-bark-600 mb-4">Build Your Own Box</h2>
            <p className="font-sans text-sm text-bark-400 mb-6 max-w-sm mx-auto">
              Choose exactly what goes inside — five categories, one perfect gift.
            </p>
            <Link
              href="/build"
              className="inline-block bg-bark-600 text-cream-50 font-sans text-[11px] tracking-[0.2em] uppercase px-8 py-3.5 hover:bg-bark-700 transition-colors"
            >
              Start Building
            </Link>
          </div>
        </div>

      </main>
      <Footer />
    </>
  )
}
