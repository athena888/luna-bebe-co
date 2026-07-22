import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { JsonLd } from '@/components/ui/JsonLd'
import { SlotBackground } from '@/components/ui/SlotBackground'
import { LANDING_PAGES } from '@/lib/landing-pages'
import { getLandingContent } from '@/lib/landing-content'
import { getCatalog } from '@/lib/products-db'
import { CATEGORY_LABELS } from '@/lib/products'
import { supabaseAdmin } from '@/lib/supabase'
import { ProductGridCard } from '@/components/ui/ProductGridCard'
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
  const lp = await getLandingContent(slug)
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
  const lp = await getLandingContent(slug)
  if (!lp) notFound()

  // Group products by category so each section has a clear heading
  type ProductsByCategory = { category: string; label: string; products: Product[] }[]
  let byCategory: ProductsByCategory = []

  try {
    const catalog = await getCatalog({ activeOnly: true })
    const grouped = new Map<string, Product[]>()
    if (lp.productIds.length) {
      // Admin picked explicit products — feature exactly those, grouped by category.
      const picked = lp.productIds
        .map(id => catalog.find(p => p.id === id))
        .filter((p): p is (typeof catalog)[number] => Boolean(p))
      for (const p of picked) {
        const arr = grouped.get(p.category) ?? []
        arr.push(p)
        grouped.set(p.category, arr)
      }
    } else {
      for (const cat of lp.categories) {
        const hits = catalog.filter(p => p.category === cat)
        if (hits.length) grouped.set(cat, hits)
      }
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

  // One batched query for a secondary (hover/alt) image per product on this page.
  // Pick the first gallery image that isn't the primary shown on the card.
  const secondaryById = new Map<string, string>()
  try {
    const ids = byCategory.flatMap(g => g.products.map(p => p.id))
    if (ids.length) {
      const { data: rows } = await supabaseAdmin
        .from('product_gallery')
        .select('product_id, image_url, is_primary, sort_order')
        .in('product_id', ids)
        .order('is_primary', { ascending: false })
        .order('sort_order', { ascending: true })
      const primaryOf = new Map(byCategory.flatMap(g => g.products).map(p => [p.id, productImage(p)]))
      for (const r of rows ?? []) {
        const url = (r as { image_url?: string }).image_url
        const pid = (r as { product_id: string }).product_id
        if (url && !secondaryById.has(pid) && url !== primaryOf.get(pid)) secondaryById.set(pid, url)
      }
    }
  } catch { /* no secondary images — cards render primary only */ }

  const url = `${BASE}/gifts/${lp.slug}`
  const others = LANDING_PAGES.filter(p => p.slug !== lp.slug)
  // Page background is one shared image across every gift guide (set in the Gift
  // Guides editor). The per-guide `gifts.<slug>.hero` image is the hub card only.
  const heroSlotKey = 'gifts.shared_bg'

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
      {(lp.faqs?.length ?? 0) > 0 && (
        <JsonLd data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: lp.faqs!.map(f => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
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
              <p className="font-sans text-[11px] tracking-[0.3em] uppercase text-gold-400 mb-4">{lp.eyebrow}</p>
              <h1 className="font-serif text-[2.5rem] sm:text-[3.5rem] text-espresso leading-[1.05] mb-6">{lp.h1}</h1>
              {lp.intro.map((para, i) => (
                <p key={i} className="font-cormorant text-lg sm:text-xl text-espresso-light leading-loose mb-4">{para}</p>
              ))}
              <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-8">
                {lp.highlights.map(h => (
                  <li key={h} className="font-sans text-[11px] tracking-[0.15em] uppercase text-bark-500 flex items-center gap-2">
                    <span className="w-3 h-px bg-gold-400" />{h}
                  </li>
                ))}
              </ul>
              <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/build" className="bg-[#7A8E7C] text-white font-sans text-[11px] tracking-[0.25em] uppercase px-10 py-4 hover:bg-[#6d8070] transition-colors">Build Your Box</Link>
                <Link href="/boxes" className="border border-bark-600 text-bark-600 font-sans text-[11px] tracking-[0.25em] uppercase px-10 py-4 hover:bg-bark-600 hover:text-cream-50 transition-colors">Shop Ready-Made</Link>
              </div>
            </div>
          </section>
        </SlotBackground>

        {/* Pieces to Include — grouped by category, cream-white background */}
        {byCategory.length > 0 && (
          <section className="bg-[#FBF7F0] px-6 sm:px-10 py-16 sm:py-20">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <p className="font-sans text-[11px] tracking-[0.3em] uppercase text-gold-400 mb-2">What Goes Inside</p>
                <h2 className="font-serif text-2xl sm:text-3xl text-espresso">Pieces to Include</h2>
              </div>

              {byCategory.map(({ category, label, products }) => (
                <div key={category} className="mb-12 last:mb-0">
                  {/* Category heading */}
                  <div className="flex items-center gap-6 mb-6">
                    <span className="font-sans text-[11px] tracking-[0.3em] uppercase text-bark-400 shrink-0">{label}</span>
                    <span className="flex-1 h-px bg-cream-300" />
                  </div>

                  {/* Product cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                    {products.map(p => (
                      <ProductGridCard
                        key={p.id}
                        product={p}
                        primarySrc={productImage(p) || null}
                        secondarySrc={secondaryById.get(p.id) ?? null}
                      />
                    ))}
                  </div>
                </div>
              ))}

            </div>
          </section>
        )}

        {/* Why it works for this moment */}
        {lp.moment && (
          <section className="border-t border-cream-300 px-6 sm:px-8 py-16 sm:py-20">
            <div className="max-w-3xl mx-auto">
              <p className="font-sans text-[11px] tracking-[0.3em] uppercase text-gold-400 mb-2 text-center">For This Moment</p>
              <h2 className="font-serif text-2xl sm:text-3xl text-espresso text-center mb-8">{lp.moment.heading}</h2>
              {lp.moment.paragraphs.map((para, i) => (
                <p key={i} className="font-cormorant text-lg text-espresso-light leading-loose mb-5 last:mb-0">{para}</p>
              ))}
            </div>
          </section>
        )}

        {/* FAQ */}
        {(lp.faqs?.length ?? 0) > 0 && (
          <section className="border-t border-cream-300 bg-[#FBF7F0] px-6 sm:px-8 py-16 sm:py-20">
            <div className="max-w-3xl mx-auto">
              <p className="font-sans text-[11px] tracking-[0.3em] uppercase text-gold-400 mb-2 text-center">Good to Know</p>
              <h2 className="font-serif text-2xl sm:text-3xl text-espresso text-center mb-10">Questions, Answered</h2>
              <div className="space-y-4">
                {lp.faqs!.map(f => (
                  <details key={f.q} className="group bg-cream-50 border border-cream-300 px-6 py-4">
                    <summary className="font-serif text-base sm:text-lg text-bark-700 cursor-pointer list-none flex items-start justify-between gap-4">
                      {f.q}
                      <span className="font-sans text-bark-400 group-open:rotate-45 transition-transform shrink-0 mt-0.5">+</span>
                    </summary>
                    <p className="font-sans text-sm text-bark-500 leading-relaxed mt-3">{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* From the journal */}
        {(lp.journalLinks?.length ?? 0) > 0 && (
          <section className="border-t border-cream-300 px-6 sm:px-8 py-10">
            <div className="max-w-3xl mx-auto text-center">
              <p className="font-sans text-[11px] tracking-[0.3em] uppercase text-gold-400 mb-5">From the Journal</p>
              <div className="flex flex-wrap justify-center gap-3">
                {lp.journalLinks!.map(j => (
                  <Link key={j.href} href={j.href} className="font-sans text-[12px] text-bark-600 hover:text-bark-800 underline underline-offset-4 decoration-gold-300">
                    {j.label}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Internal links to other guides */}
        <section className="border-t border-cream-300 bg-[#FBF7F0] px-6 sm:px-8 py-10">
          <div className="max-w-5xl mx-auto">
          <p className="font-sans text-[11px] tracking-[0.3em] uppercase text-gold-400 mb-5 text-center">Explore more</p>
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
