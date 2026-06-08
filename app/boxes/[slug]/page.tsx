import { getBox } from '@/lib/prebuilt-boxes-db'
import { BOX_BASE_PRICE } from '@/lib/products'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import Link from 'next/link'
import { ArrowLeft, Leaf } from 'lucide-react'
import { notFound } from 'next/navigation'
import { BoxGallery } from './BoxGallery'
import { BuyButton } from './BuyButton'
import type { BoxItem } from '@/lib/prebuilt-boxes-db'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
function productImage(p: { id: string; image?: string | null }): string | null {
  return p.image ?? (SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/product-images/${p.id}.jpg` : null)
}

export const dynamic = 'force-dynamic'
export const dynamicParams = true

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const box = await getBox(slug)
  return {
    title: `${box?.name} — Petite Lavande`,
    description: box?.description || 'Curated gift set from Petite Lavande',
  }
}

export default async function BoxPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const box = await getBox(slug)

  if (!box) notFound()

  const items = box.items as Array<BoxItem & { selectedColor?: string; selectedSize?: string }>
  const contentsValue = items.reduce((s, p) => s + (p?.price ?? 0), 0)
  // Optional For Baby / For Mama grouping (admin-assigned; sections hide if empty)
  const baby = items.filter(i => i.audience === 'baby')
  const mama = items.filter(i => i.audience === 'mama')
  const other = items.filter(i => !i.audience)
  const grouped = baby.length > 0 || mama.length > 0
  const groups: Array<{ title: string; list: typeof items }> = grouped
    ? ([{ title: 'For Baby', list: baby }, { title: 'For Mama', list: mama }, { title: 'Also Included', list: other }] as const).filter(g => g.list.length) as Array<{ title: string; list: typeof items }>
    : [{ title: '', list: items }]
  const regular = BOX_BASE_PRICE + contentsValue          // value if bought separately
  const price = box.customPrice ?? regular                 // what we charge
  const saving = box.customPrice != null && regular > box.customPrice

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream-100">
        <div className="max-w-6xl mx-auto px-6 sm:px-9 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
            {/* Gallery with a minimal back arrow on the photo */}
            <div className="relative">
              <Link
                href="/boxes"
                aria-label="Back to all boxes"
                className="absolute top-3 left-3 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm text-bark-600 hover:bg-white transition-colors shadow-sm"
              >
                <ArrowLeft size={16} />
              </Link>
              <BoxGallery images={box.images} name={box.name} />
            </div>

            <div className="flex flex-col justify-center">
              <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-gold-400 mb-3">{box.style}</p>
              <h1 className="font-serif text-5xl text-bark-600 mb-3">{box.name}</h1>
              <p className="font-cormorant text-2xl italic text-bark-400 mb-6">{box.tagline}</p>
              <p className="font-sans text-sm text-bark-300 mb-8">{box.aesthetic}</p>
              <p className="font-sans text-base text-bark-600 leading-relaxed mb-10">{box.description}</p>

              <div className="mb-8">
                <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-2">Price</p>
                <div className="flex items-baseline gap-3 flex-wrap">
                  {saving && <span className="font-serif text-2xl text-bark-400 line-through">${(regular / 100).toFixed(2)}</span>}
                  <span className="font-serif text-4xl text-bark-600">${(price / 100).toFixed(2)}</span>
                </div>
                <p className="font-sans text-[11px] text-bark-400 mt-1">Includes box, packaging &amp; wax seal · letter added at checkout</p>
              </div>

              <div className="w-full sm:max-w-xs">
                <BuyButton items={box.items} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-cream-300 p-6 sm:p-8">
            <h2 className="font-serif text-3xl text-bark-600 mb-8">What&apos;s Included</h2>

            <div className="space-y-8">
              {groups.map(group => (
                <div key={group.title || 'all'}>
                  {group.title && (
                    <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-gold-400 mb-4 pb-2 border-b border-cream-200">{group.title}</p>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                    {group.list.map((item, idx) => {
                      const src = productImage(item)
                      const color = item.selectedColor
                      const size = item.selectedSize
                      return (
                        <Link
                          key={`${item.id}-${idx}`}
                          href={`/products/${item.id}`}
                          className="group flex items-center gap-4"
                        >
                          <div className="relative w-16 h-20 shrink-0 overflow-hidden bg-cream-100 border border-cream-200">
                            {src
                              ? <img src={src} alt={item.name} className="w-full h-full object-cover" />
                              : <span className="absolute inset-0 flex items-center justify-center text-2xl">{item.imageEmoji}</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-2">
                              <h3 className="font-serif text-base text-bark-600 leading-tight group-hover:text-bark-700 truncate">{item.name}</h3>
                              <span className="font-sans text-sm text-bark-500 shrink-0">${(item.price / 100).toFixed(0)}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap mt-0.5">
                              <span className="font-sans text-[10px] tracking-[0.15em] uppercase text-gold-400">{item.category}</span>
                              {item.organic && (
                                <span className="inline-flex items-center gap-1 text-sage-600"><Leaf size={10} /><span className="font-sans text-[9px] tracking-[0.1em] uppercase">Organic</span></span>
                              )}
                            </div>
                            {(color || size) && (
                              <p className="font-sans text-[11px] text-bark-400 capitalize mt-0.5">{[size, color].filter(Boolean).join(' · ')}</p>
                            )}
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
