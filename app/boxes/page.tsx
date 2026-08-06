import Link from 'next/link'
import Image from 'next/image'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { getBoxes } from '@/lib/prebuilt-boxes-db'
import { AestheticBoxes } from '@/components/ui/AestheticBoxes'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Ready-Made Gift Sets',
  description: 'Curated baby gift boxes — thoughtfully assembled, every detail chosen.',
  alternates: {
    canonical: '/boxes',
    ...(process.env.NEXT_PUBLIC_SPANISH_ACTIVE === 'true' || process.env.SPANISH_ACTIVE === 'true'
      ? { languages: { en: '/boxes', 'es-US': '/es/canastillas', 'x-default': '/boxes' } } : {}),
  },
}

export async function BoxesView({ locale = 'en' }: { locale?: 'en' | 'es' }) {
  const isEs = locale === 'es'
  const boxes = await getBoxes()
  // Group by AUDIENCE (For Baby / Wellness / Baby & Wellness Bundle); season is
  // a per-box label. Only non-empty groups, in this order. ("Wellness", not
  // "Mama" — Emily wants box naming that doesn't presume who it's for.)
  const AUDIENCE_GROUPS = [
    { key: 'baby', label: isEs ? 'Para el bebé' : 'For Baby' },
    { key: 'mama', label: isEs ? 'Bienestar' : 'Wellness' },
    { key: 'bundle', label: isEs ? 'Bebé y bienestar' : 'Baby & Wellness Bundle' },
  ] as const
  const byStyle = AUDIENCE_GROUPS
    .map(g => ({ style: g.label, boxes: boxes.filter(b => b.audience === g.key) }))
    .filter(g => g.boxes.length > 0)

  // Catalog restructure (§46): parent products with variants get real cards
  // linking to /boxes/[slug]. Empty until §46 runs + seeds — the legacy
  // prebuilt grid keeps the page alive either way.
  const { getBoxProducts, priceRange } = await import('@/lib/catalog-db')
  const catalogProducts = await getBoxProducts()

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">

        {catalogProducts.length > 0 && (
          <section className="max-w-6xl mx-auto px-6 pt-5 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {catalogProducts.map(p => {
                const { low, high } = priceRange(p)
                const cover = p.variants[0]?.images[0]
                return (
                  <Link key={p.slug} href={`${isEs ? '/boxes' : '/boxes'}/${p.slug}`} className="group block border border-cream-300 hover:border-bark-400 transition-colors">
                    <div className="relative h-[80vh] bg-cream-100">
                      {cover
                        ? <Image src={cover} alt={p.name} fill className="object-cover" unoptimized />
                        : <div className="absolute inset-0 flex items-center justify-center font-sans text-[10px] tracking-[0.2em] uppercase text-bark-300">Photography coming soon</div>}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-white/95 via-white/70 to-transparent pt-14 pb-5 px-5">
                        <h2 className="font-serif text-2xl text-espresso group-hover:text-bark-600">{p.name}</h2>
                        <p className="font-sans text-sm text-bark-600 mt-1">
                          {low === high ? `$${low / 100}` : `$${low / 100} – $${high / 100}`}
                          {p.variants.length > 1 && <span className="text-bark-400"> · {p.variants.length} {(p.variantLabel || 'option').toLowerCase()}s</span>}
                        </p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        <AestheticBoxes byStyle={byStyle} />

      </main>
      <Footer />
    </>
  )
}

export default function BoxesPage() {
  return <BoxesView locale="en" />
}
