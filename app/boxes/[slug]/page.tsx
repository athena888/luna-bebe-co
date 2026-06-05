import { boxItemTotal } from '@/lib/prebuilt-boxes'
import { getBox } from '@/lib/prebuilt-boxes-db'
import { BOX_BASE_PRICE } from '@/lib/products'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { notFound } from 'next/navigation'
import { BoxGallery } from './BoxGallery'
import { BuyButton } from './BuyButton'

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

  const items = Object.values(box.selection).filter(Boolean) as Array<NonNullable<typeof box.selection.swaddle> & { selectedColor?: string; selectedSize?: string }>
  const total = box.customPrice ?? (BOX_BASE_PRICE + boxItemTotal(box.selection))

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream-100">
        <div className="border-b border-cream-300 bg-cream-50 sticky top-[68px] z-10">
          <div className="max-w-6xl mx-auto px-6 sm:px-9 py-4">
            <Link href="/" className="flex items-center gap-2 text-bark-400 hover:text-bark-600 transition-colors">
              <ArrowLeft size={16} />
              <span className="font-sans text-sm">Back</span>
            </Link>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 sm:px-9 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
            <BoxGallery images={box.images} name={box.name} />

            <div className="flex flex-col justify-center">
              <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-gold-400 mb-3">{box.style}</p>
              <h1 className="font-serif text-5xl text-bark-600 mb-3">{box.name}</h1>
              <p className="font-cormorant text-2xl italic text-bark-400 mb-6">{box.tagline}</p>
              <p className="font-sans text-sm text-bark-300 mb-8">{box.aesthetic}</p>
              <p className="font-sans text-base text-bark-600 leading-relaxed mb-10">{box.description}</p>

              <div className="mb-8">
                <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-2">Price</p>
                <p className="font-serif text-4xl text-bark-600">${(total / 100).toFixed(2)}</p>
                <p className="font-sans text-[11px] text-bark-400 mt-1">Includes box, packaging &amp; wax seal · letter added at checkout</p>
              </div>

              <div className="w-full sm:max-w-xs">
                <BuyButton selection={box.selection} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-cream-300 rounded-xl p-6 sm:p-8">
            <h2 className="font-serif text-3xl text-bark-600 mb-8">What&apos;s Included</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {items.map((item, idx) => {
                const src = productImage(item)
                const color = item.selectedColor
                const size = item.selectedSize
                return (
                  <Link
                    key={`${item.id}-${idx}`}
                    href={`/products/${item.id}`}
                    className="group flex items-start gap-4 pb-6 border-b border-cream-200 last:border-b-0 md:[&:nth-last-child(2)]:border-b-0"
                  >
                    <div className="relative w-20 h-24 shrink-0 rounded-lg overflow-hidden bg-cream-100 border border-cream-200">
                      {src
                        ? <img src={src} alt={item.name} className="w-full h-full object-cover" />
                        : <span className="absolute inset-0 flex items-center justify-center text-3xl">{item.imageEmoji}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="font-serif text-lg text-bark-600 leading-tight group-hover:text-bark-700">{item.name}</h3>
                        <span className="font-sans text-sm text-bark-500 shrink-0">${(item.price / 100).toFixed(0)}</span>
                      </div>
                      <p className="font-sans text-[10px] tracking-[0.15em] uppercase text-gold-400 mb-1">{item.category}</p>
                      {(color || size) && (
                        <p className="font-sans text-[11px] text-bark-400 capitalize mb-1.5">{[size, color].filter(Boolean).join(' · ')}</p>
                      )}
                      <p className="font-sans text-sm text-bark-600 leading-relaxed line-clamp-2">{item.description}</p>
                      <span className="font-sans text-[10px] tracking-[0.15em] uppercase text-bark-400 group-hover:text-bark-600 transition-colors mt-1.5 inline-block">View product →</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
