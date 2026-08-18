import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { getLiveCollection } from '@/lib/collections'
import { getTranslations } from '@/lib/i18n'

export const dynamic = 'force-dynamic'

// Spanish collection pages — same guard as English (under-threshold 404s).
// Product names stay EN/FR; descriptions come translated on product pages.

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const c = await getLiveCollection(slug).catch(() => null)
  if (!c) return {}
  const t = (await getTranslations('collection', [slug])).get(slug) ?? {}
  return {
    title: t.h1 ?? t.title ?? c.title,
    description: (t.intro_copy ?? '').slice(0, 155) || undefined,
    alternates: {
      canonical: `/es/colecciones/${slug}`,
      languages: { en: `/collections/${slug}`, 'es-US': `/es/colecciones/${slug}`, 'x-default': `/collections/${slug}` },
    },
  }
}

export default async function EsCollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const c = await getLiveCollection(slug).catch(() => null)
  if (!c) notFound()
  const t = (await getTranslations('collection', [slug])).get(slug) ?? {}

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
    <div className="max-w-6xl mx-auto px-6 pt-12 pb-16">
      <p className="font-sans text-[12px] tracking-[0.18em] uppercase font-bold text-[#7A8E7C] mb-3">Colección</p>
      <h1 className="font-playfair text-3xl sm:text-4xl text-espresso mb-4">{t.h1 ?? t.title ?? c.title}</h1>
      {t.intro_copy && (
        <p className="font-sans text-[15px] leading-relaxed text-espresso-light max-w-2xl mb-10">{t.intro_copy}</p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
        {c.products.map(p => (
          <Link key={p.id} href={`/es/productos/${p.id}`} className="group">
            <div className="aspect-square overflow-hidden border border-cream-300 bg-cream-50 mb-2.5">
              {p.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl">{p.imageEmoji}</div>
              )}
            </div>
            <p className="font-sans text-[13px] text-espresso leading-snug">{p.name}</p>
            <p className="font-sans text-[13px] text-espresso-light">${(p.price / 100).toFixed(0)}</p>
          </Link>
        ))}
      </div>
    </div>
      </main>
      <Footer />
    </>
  )
}
