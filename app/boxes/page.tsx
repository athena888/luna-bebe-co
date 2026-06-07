import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { getBoxes } from '@/lib/prebuilt-boxes-db'
import { BOX_BASE_PRICE } from '@/lib/products'
import { SlotBackground } from '@/components/ui/SlotBackground'

export const dynamic = 'force-dynamic'

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(0)}`
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
function productImage(p: { id: string; image?: string | null }): string | null {
  return p.image ?? (SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/product-images/${p.id}.jpg` : null)
}

export const metadata = {
  title: 'Shop by Aesthetic — Petite Lavande',
  description: 'Curated baby gift boxes — each thoughtfully assembled with 7 items, every detail chosen.',
}

export default async function BoxesPage() {
  const boxes = await getBoxes()
  // Group by whichever styles actually exist
  const styles = Array.from(new Set(boxes.map(b => b.style)))
  const byStyle = styles.map(style => ({
    style,
    boxes: boxes.filter(b => b.style === style),
  }))

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream-100">

        {/* Page header */}
        <SlotBackground slotKey="boxes.header_bg" className="bg-cream-50 border-b border-cream-300 py-16 px-6 text-center">
          <p className="font-sans text-[9px] tracking-[0.5em] uppercase text-gold-400 mb-4">Curated Styles</p>
          <h1 className="font-serif text-[2.5rem] sm:text-[3.5rem] text-bark-600 mb-4">Shop by Aesthetic</h1>
          <p className="font-sans text-sm text-bark-500 max-w-md mx-auto leading-relaxed">
            Three styles, two editions each — 7 curated items per box. Every detail already decided.
          </p>
        </SlotBackground>

        {/* Grouped by style */}
        <div className="max-w-6xl mx-auto px-6 py-14 space-y-16">
          {byStyle.map(({ style, boxes }) => (
            <div key={style}>
              <div className="mb-6 pb-4 border-b border-cream-300 flex items-baseline gap-4">
                <p className="font-sans text-[9px] tracking-[0.4em] uppercase text-gold-400">{style}</p>
                <p className="font-sans text-[10px] text-bark-300">{boxes[0]?.aesthetic}</p>
              </div>
              <div className="grid grid-cols-1 gap-6">
                {boxes.map((box) => {
                  const items = box.items as Array<(typeof box.items)[number] & { selectedColor?: string; selectedSize?: string }>
                  const total = box.customPrice ?? (BOX_BASE_PRICE + items.reduce((s, p) => s + (p?.price ?? 0), 0))
                  return (
                    <Link
                      key={box.slug}
                      href={`/boxes/${box.slug}`}
                      className="bg-cream-50 border border-cream-200 rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-[300px_1fr] group hover:border-bark-300 hover:shadow-sm transition-all"
                    >
                      {/* Left — box cover photo */}
                      <div className="relative aspect-[4/3] md:aspect-auto md:h-full min-h-[220px] bg-cream-200">
                        {box.image ? (
                          <img src={box.image} alt={box.name} className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-bark-300">
                            <div className="w-8 h-px bg-gold-400" />
                            <span className="font-script text-2xl text-bark-400">Petite Lavande</span>
                            <div className="w-8 h-px bg-gold-400" />
                          </div>
                        )}
                        <span className={`absolute top-3 right-3 font-sans text-[9px] tracking-[0.15em] uppercase px-2.5 py-1 rounded-full capitalize ${box.variant === 'girl' ? 'bg-rose-100/80 text-rose-500' : box.variant === 'boy' ? 'bg-sky-100/80 text-sky-600' : 'bg-cream-100/90 text-bark-500'}`}>
                          {box.variant}
                        </span>
                      </div>

                      {/* Right — details + product list */}
                      <div className="p-6 sm:p-8 flex flex-col">
                        <p className="font-sans text-[9px] tracking-[0.4em] uppercase text-gold-400 mb-1">{style}</p>
                        <h2 className="font-serif text-2xl text-bark-600 mb-1">{box.name}</h2>
                        <p className="font-cormorant text-base italic text-bark-400 mb-4 leading-snug">{box.tagline}</p>

                        <div className="divide-y divide-cream-200 border-y border-cream-200 mb-5">
                          {items.map((item, idx) => {
                            const src = productImage(item)
                            const color = item.selectedColor
                            const size = item.selectedSize
                            return (
                              <div key={`${item.id}-${idx}`} className="flex items-center gap-3 py-2.5">
                                <div className="relative w-12 h-14 shrink-0 rounded-md overflow-hidden bg-cream-100 border border-cream-200">
                                  {src
                                    ? <img src={src} alt={item.name} className="w-full h-full object-cover" />
                                    : <span className="absolute inset-0 flex items-center justify-center text-lg">{item.imageEmoji}</span>}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-sans text-xs font-medium text-bark-600 truncate">{item.name}</p>
                                  {item.description && <p className="font-sans text-[10px] text-bark-400 leading-snug line-clamp-1">{item.description}</p>}
                                  {(color || size) && (
                                    <p className="font-sans text-[10px] text-bark-400 capitalize">{[size, color].filter(Boolean).join(' · ')}</p>
                                  )}
                                </div>
                                <span className="font-sans text-[11px] text-bark-500 shrink-0">{fmt(item.price)}</span>
                              </div>
                            )
                          })}
                        </div>

                        <div className="flex items-center justify-between mt-auto pt-1">
                          <div>
                            <span className="font-serif text-xl text-bark-600">{fmt(total)}</span>
                            <span className="font-sans text-[10px] text-bark-400 ml-2">all-in</span>
                          </div>
                          <span className="font-sans text-[9px] tracking-[0.2em] uppercase text-bark-400 group-hover:text-bark-600 transition-colors">
                            Shop This Style →
                          </span>
                        </div>
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
