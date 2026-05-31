import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { PREBUILT_BOXES, boxItemTotal } from '@/lib/prebuilt-boxes'
import { BOX_BASE_PRICE } from '@/lib/products'

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(0)}`
}

export const metadata = {
  title: 'Shop by Aesthetic — Petite Lavande',
  description: 'Curated-style baby gift boxes — Boho, Garden, and Classique, each in neutral and girl editions. 7 items per box, every detail chosen.',
}

const STYLES = ['Bohemian', 'Botanical', 'Heirloom'] as const

export default function BoxesPage() {
  const byStyle = STYLES.map(style => ({
    style,
    boxes: PREBUILT_BOXES.filter(b => b.style === style),
  }))

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream-100">

        {/* Page header */}
        <div className="bg-cream-50 border-b border-cream-300 py-16 px-6 text-center">
          <p className="font-sans text-[9px] tracking-[0.5em] uppercase text-gold-400 mb-4">Curated Styles</p>
          <h1 className="font-serif text-[2.5rem] sm:text-[3.5rem] text-bark-600 mb-4">Shop by Aesthetic</h1>
          <p className="font-sans text-sm text-bark-400 max-w-md mx-auto leading-relaxed">
            Three styles, two editions each — 7 curated items per box. Every detail already decided.
          </p>
        </div>

        {/* Grouped by style */}
        <div className="max-w-6xl mx-auto px-6 py-14 space-y-16">
          {byStyle.map(({ style, boxes }) => (
            <div key={style}>
              <div className="mb-6 pb-4 border-b border-cream-300 flex items-baseline gap-4">
                <p className="font-sans text-[9px] tracking-[0.4em] uppercase text-gold-400">{style}</p>
                <p className="font-sans text-[10px] text-bark-300">{boxes[0]?.aesthetic}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {boxes.map((box) => {
                  const items = Object.values(box.selection).filter(Boolean) as NonNullable<typeof box.selection.swaddle>[]
                  const total = BOX_BASE_PRICE + boxItemTotal(box.selection)
                  return (
                    <Link
                      key={box.slug}
                      href={`/boxes/${box.slug}`}
                      className="bg-cream-50 border border-cream-200 rounded-2xl p-8 flex flex-col group hover:border-bark-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <p className="font-sans text-[9px] tracking-[0.4em] uppercase text-gold-400">{style}</p>
                        <span className={`font-sans text-[9px] tracking-[0.15em] uppercase px-2.5 py-1 rounded-full ${box.variant === 'girl' ? 'bg-rose-100/60 text-rose-400' : 'bg-cream-200 text-bark-400'}`}>
                          {box.variant === 'girl' ? 'Girl' : 'Neutral'}
                        </span>
                      </div>
                      <h2 className="font-serif text-2xl text-bark-600 mb-1">{box.name}</h2>
                      <p className="font-cormorant text-base italic text-bark-400 mb-1 leading-snug">{box.tagline}</p>
                      <p className="font-sans text-[9px] tracking-[0.15em] text-bark-300 mb-5">{box.aesthetic}</p>
                      <p className="font-sans text-xs text-bark-400 leading-relaxed mb-6 flex-1">{box.description}</p>
                      <ul className="space-y-1.5 mb-8">
                        {items.map(item => (
                          <li key={item.id} className="flex items-center gap-2.5">
                            <span className="w-3 h-px bg-gold-300 shrink-0" />
                            <span className="font-sans text-[10px] text-bark-500">{item.name}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="flex items-center justify-between pt-4 border-t border-cream-200">
                        <span className="font-serif text-xl text-bark-600">{fmt(total)}</span>
                        <span className="font-sans text-[9px] tracking-[0.2em] uppercase text-bark-400 group-hover:text-bark-600 transition-colors">
                          Shop This Style →
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Custom box CTA */}
        <div className="border-t border-cream-300 py-16 px-6 text-center">
          <p className="font-serif text-xl italic text-bark-400 mb-2">Prefer to choose yourself?</p>
          <p className="font-sans text-xs text-bark-400 mb-6 tracking-wide">Build your own custom box — pick exactly what goes inside.</p>
          <Link
            href="/build"
            className="border border-bark-600 text-bark-600 font-sans text-[10px] tracking-[0.25em] uppercase px-10 py-3.5 hover:bg-bark-600 hover:text-cream-50 transition-colors inline-block"
          >
            Build a Custom Box
          </Link>
        </div>

      </main>
      <Footer />
    </>
  )
}
