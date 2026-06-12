import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { JsonLd } from '@/components/ui/JsonLd'
import { SlotBackground } from '@/components/ui/SlotBackground'
import { LANDING_PAGES, getLandingPage } from '@/lib/landing-pages'
import { getCatalog } from '@/lib/products-db'
import { CATEGORY_LABELS } from '@/lib/products'
import type { Product } from '@/types'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

export const revalidate = 3600

function productImage(p: { id: string; image?: string | null }) {
  return p.image || (SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/product-images/${p.id}.jpg` : '')
}

export function generateStaticParams() {
  return LANDING_PAGES.map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const lp = getLandingPage(slug)
  if (!lp) return { title: 'Not Found' }
  const url = `${BASE}/gifts/${lp.slug}`
  return {
    title: { absolute: lp.title },
    description: lp.metaDescription,
    keywords: [lp.keyword],
    alternates: { canonical: url },
    openGraph: { title: lp.title, description: lp.metaDescription, url, type: 'website' },
    twitter: { card: 'summary_large_image' },
  }
}

export default async function GiftLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const lp = getLandingPage(slug)
  if (!lp) notFound()

  // Group products by category so each section has a clear heading
  type ProductsByCategory = { category: string; label: string; products: Product[] }[]
  let byCategory: ProductsByCategory = []

  try {
    const catalog = await getCatalog({ activeOnly: true })
    const grouped = new Map<string, Product[]>()
    for (const cat of lp.categories) {
      const hits = catalog.filter(p => p.category === cat)
      if (hits.length) grouped.set(cat, hits)
    }
    // Fall back to all products if nothing matched
    if (grouped.size === 0) {
      const fallback = catalog.slice(0, 8)
      const uniqueCats = [...new Set(fallback.map(p => p.category))]
      for (const cat of uniqueCats) grouped.set(cat, fallback.filter(p => p.category === cat))
    }
    byCategory = [...grouped.entries()].map(([cat, products]) => ({
      category: cat,
      label: CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] ?? cat,
      products: products.slice(0, 4),
    }))
  } catch { /* show page without grid */ }

  const url = `${BASE}/gifts/${lp.slug}`
  const others = LANDING_PAGES.filter(p => p.slug !== lp.slug)
  const heroSlotKey = `gifts.${lp.slug}.hero`

  return (
    <>
      <Header />
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
          { '@type': 'ListItem', position: 2, name: 'Gifts', item: `${BASE}/build` },
          { '@type': 'ListItem', position: 3, name: lp.h1, item: url },
        ],
      }} />
      {byCategory.length > 0 && (
        <JsonLd data={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: lp.h1,
          itemListElement: byCategory.flatMap(g => g.products).map((p, i) => ({
            '@type': 'ListItem', position: i + 1, name: p.name, url: `${BASE}/products/${p.id}`,
          })),
        }} />
      )}

      <main className="bg-cream-50">

        {/* Hero — with optional admin-uploaded background image */}
        <SlotBackground
          slotKey={heroSlotKey}
          scrim="bg-cream-50/80"
          className="border-b border-cream-300"
        >
          <section className="px-6 sm:px-8 py-16 sm:py-24 text-center">
            <div className="max-w-3xl mx-auto">
              <p className="font-sans text-[9px] tracking-[0.45em] uppercase text-gold-400 mb-4">{lp.eyebrow}</p>
              <h1 className="font-serif text-[2.5rem] sm:text-[3.5rem] text-espresso leading-[1.05] mb-6">{lp.h1}</h1>
              {lp.intro.map((para, i) => (
                <p key={i} className="font-cormorant text-lg sm:text-xl text-bark-400 leading-loose mb-4">{para}</p>
              ))}
              <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-8">
                {lp.highlights.map(h => (
                  <li key={h} className="font-sans text-[10px] tracking-[0.15em] uppercase text-bark-500 flex items-center gap-2">
                    <span className="w-3 h-px bg-gold-400" />{h}
                  </li>
                ))}
              </ul>
              <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/build" className="bg-bark-600 text-cream-50 font-sans text-[10px] tracking-[0.25em] uppercase px-10 py-4 hover:bg-bark-700 transition-colors">Build Your Box</Link>
                <Link href="/boxes" className="border border-bark-600 text-bark-600 font-sans text-[10px] tracking-[0.25em] uppercase px-10 py-4 hover:bg-bark-600 hover:text-cream-50 transition-colors">Shop Ready-Made</Link>
              </div>
            </div>
          </section>
        </SlotBackground>

        {/* Pieces to Include — grouped by category, cream-white background */}
        {byCategory.length > 0 && (
          <section className="bg-[#FBF7F0] px-6 sm:px-10 py-16 sm:py-20">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <p className="font-sans text-[9px] tracking-[0.45em] uppercase text-gold-400 mb-2">What Goes Inside</p>
                <h2 className="font-serif text-2xl sm:text-3xl text-espresso">Pieces to Include</h2>
              </div>

              {byCategory.map(({ category, label, products }) => (
                <div key={category} className="mb-12 last:mb-0">
                  {/* Category heading */}
                  <div className="flex items-center gap-6 mb-6">
                    <span className="font-sans text-[9px] tracking-[0.35em] uppercase text-bark-400 shrink-0">{label}</span>
                    <span className="flex-1 h-px bg-cream-300" />
                  </div>

                  {/* Product cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                    {products.map(p => (
                      <Link key={p.id} href={`/products/${p.id}`} className="group">
                        {/* Image */}
                        <div className="relative aspect-[4/5] bg-[#FBF7F0] overflow-hidden mb-3 border border-cream-200">
                          {productImage(p) ? (
                            <img
                              src={productImage(p)}
                              alt={p.name}
                              className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-4xl select-none opacity-40">{p.imageEmoji}</span>
                            </div>
                          )}
                        </div>
                        {/* Info */}
                        <h3 className="font-serif text-base text-bark-600 leading-snug mb-0.5 group-hover:text-bark-800 transition-colors">{p.name}</h3>
                        <p className="font-sans text-xs text-bark-400">${(p.price / 100).toFixed(0)}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}

            </div>
          </section>
        )}

        {/* Internal links to other guides */}
        <section className="border-t border-cream-300 bg-[#FBF7F0] px-6 sm:px-8 py-10">
          <div className="max-w-5xl mx-auto">
          <p className="font-sans text-[9px] tracking-[0.45em] uppercase text-gold-400 mb-5 text-center">Explore more</p>
          <div className="flex flex-wrap justify-center gap-3">
            {others.map(o => (
              <Link key={o.slug} href={`/gifts/${o.slug}`} className="font-sans text-[11px] tracking-[0.1em] text-bark-500 hover:text-bark-700 border border-cream-300 hover:border-bark-400 rounded-full px-4 py-2 transition-colors">
                {o.h1.replace(/^The /, '')}
              </Link>
            ))}
          </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  )
}
