import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { JsonLd } from '@/components/ui/JsonLd'
import { getLiveCollection, getLiveCollections } from '@/lib/collections'
import { SPANISH_ACTIVE } from '@/lib/i18n'

// Collection pages — real indexable routes (never client-side tabs). The
// empty-collection guard lives in lib/collections: below min_products a
// collection 404s and leaves the sitemap/nav automatically.

// Rendered on demand: the ISR + async-DB-generateStaticParams combination
// 500s on unknown slugs in production (DYNAMIC_SERVER_USAGE), and these
// pages are light. Crawlers see identical HTML either way.
export const dynamic = 'force-dynamic'

const BASE = (process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com').replace(/\/$/, '')

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const c = await getLiveCollection(slug).catch(() => null)
  if (!c) return {}
  return {
    title: c.meta_title || c.title,
    description: c.meta_description || undefined,
    alternates: {
      canonical: `/collections/${c.slug}`,
      ...(SPANISH_ACTIVE ? { languages: { en: `/collections/${c.slug}`, 'es-US': `/es/colecciones/${c.slug}`, 'x-default': `/collections/${c.slug}` } } : {}),
    },
  }
}

function productImg(p: { id: string; image?: string | null }): string | null {
  return p.image ?? null
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const c = await getLiveCollection(slug).catch(() => null)
  if (!c) notFound()

  const siblings = (await getLiveCollections()).filter(s => s.slug !== c.slug).slice(0, 3)

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
        <JsonLd data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: c.h1 || c.title,
          url: `${BASE}/collections/${c.slug}`,
          mainEntity: {
            '@type': 'ItemList',
            itemListElement: c.products.map((p, i) => ({
              '@type': 'ListItem', position: i + 1, name: p.name, url: `${BASE}/products/${p.id}`,
            })),
          },
        }} />

        <div className="max-w-6xl mx-auto px-6 pt-12 pb-16">
          <p className="font-sans text-[12px] tracking-[0.18em] uppercase font-bold text-[#7A8E7C] mb-3">Collection</p>
          <h1 className="font-playfair text-3xl sm:text-4xl text-espresso mb-4">{c.h1 || c.title}</h1>
          {c.intro_copy && (
            <p className="font-sans text-[15px] leading-relaxed text-espresso-light max-w-2xl mb-10">{c.intro_copy}</p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {c.products.map(p => (
              <Link key={p.id} href={`/products/${p.id}`} className="group">
                <div className="aspect-square overflow-hidden border border-cream-300 bg-cream-50 mb-2.5">
                  {productImg(p) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={productImg(p)!} alt={p.name} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">{p.imageEmoji}</div>
                  )}
                </div>
                <p className="font-sans text-[13px] text-espresso leading-snug">{p.name}</p>
                <p className="font-sans text-[13px] text-espresso-light">${(p.price / 100).toFixed(0)}</p>
              </Link>
            ))}
          </div>

          {siblings.length > 0 && (
            <div className="mt-14 pt-8 border-t border-cream-300">
              <p className="font-sans text-[11px] tracking-[0.14em] uppercase text-bark-400 mb-3">More to explore</p>
              <div className="flex gap-6 flex-wrap">
                {siblings.map(s => (
                  <Link key={s.slug} href={`/collections/${s.slug}`} className="font-sans text-sm text-espresso underline underline-offset-4 hover:text-gold-500 transition-colors">
                    {s.title}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
