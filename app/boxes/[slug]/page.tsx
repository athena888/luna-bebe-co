import { getBoxBySlug, boxItemTotal } from '@/lib/prebuilt-boxes'
import { BOX_BASE_PRICE } from '@/lib/products'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, ShoppingBag } from 'lucide-react'
import { notFound } from 'next/navigation'

export const dynamicParams = true

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const box = getBoxBySlug(slug)
  return {
    title: `${box?.name} — Petite Lavande`,
    description: box?.description || 'Curated gift set from Petite Lavande',
  }
}

export default async function BoxPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const box = getBoxBySlug(slug)

  if (!box) notFound()

  const items = Object.values(box.selection).filter(Boolean)
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
            {box.image && (
              <div className="relative aspect-square bg-cream-200 rounded-xl overflow-hidden">
                <Image
                  src={box.image}
                  alt={box.name}
                  fill
                  className="object-cover"
                  unoptimized
                  priority
                />
              </div>
            )}

            <div className="flex flex-col justify-center">
              <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-gold-400 mb-3">{box.style}</p>
              <h1 className="font-serif text-5xl text-bark-600 mb-3">{box.name}</h1>
              <p className="font-cormorant text-2xl italic text-bark-400 mb-6">{box.tagline}</p>
              <p className="font-sans text-sm text-bark-300 mb-8">{box.aesthetic}</p>
              <p className="font-sans text-base text-bark-600 leading-relaxed mb-10">{box.description}</p>

              <div className="mb-10">
                <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-2">Price</p>
                <p className="font-serif text-4xl text-bark-600">${(total / 100).toFixed(2)}</p>
              </div>

              <button className="flex items-center justify-center gap-2 bg-bark-600 text-white font-sans text-sm tracking-[0.2em] uppercase px-8 py-4 hover:bg-bark-700 transition-colors rounded-lg w-full sm:w-auto">
                <ShoppingBag size={16} />
                Add to Cart
              </button>
            </div>
          </div>

          <div className="bg-white border border-cream-300 rounded-xl p-8">
            <h2 className="font-serif text-3xl text-bark-600 mb-8">What's Included</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {items.map((item) => (
                <div key={item.id} className="pb-8 border-b border-cream-300 last:border-b-0">
                  <div className="flex items-start gap-4 mb-3">
                    <div className="w-16 h-16 bg-cream-100 rounded-lg shrink-0 flex items-center justify-center text-3xl">
                      {item.imageEmoji}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-serif text-lg text-bark-600 mb-1">{item.name}</h3>
                      <p className="font-sans text-[10px] tracking-[0.15em] uppercase text-gold-400">{item.category}</p>
                    </div>
                  </div>
                  <p className="font-sans text-sm text-bark-600 leading-relaxed mb-2">{item.description}</p>
                  {item.ingredients && (
                    <p className="font-sans text-xs text-bark-400">
                      <span className="font-medium">Materials:</span> {item.ingredients}
                    </p>
                  )}
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
