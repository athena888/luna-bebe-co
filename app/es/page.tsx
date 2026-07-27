import Link from 'next/link'
import type { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { getLiveCollections } from '@/lib/collections'
import { getTranslations } from '@/lib/i18n'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: { absolute: 'Petite Lavande — Canastillas de Regalo Orgánicas para Bebé y Mamá' },
  description: 'Canastillas de regalo orgánicas armadas a mano — para la mamá tanto como para el bebé. Algodón orgánico, cuidado botánico y una tarjeta escrita para ellos.',
  alternates: {
    canonical: '/es',
    languages: { en: '/', 'es-US': '/es', 'x-default': '/' },
  },
}

const PERKS = [
  { label: 'Envío gratis', sub: 'A partir de $100' },
  { label: 'Tarjeta personalizada', sub: 'Terminada a mano para cada canastilla' },
  { label: 'Algodón orgánico', sub: 'De talleres certificados GOTS' },
  { label: 'Lista para regalar', sub: 'Empacada con cuidado' },
]

export default async function EsHomePage() {
  const collections = await getLiveCollections().catch(() => [])
  const t = await getTranslations('collection', collections.map(c => c.slug))

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-[#faf7f2] border-b border-cream-300">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <p className="font-sans text-[11px] tracking-[0.3em] uppercase font-bold text-[#7A8E7C] mb-4">Fait avec amour, pour vous</p>
          <h1 className="font-playfair text-3xl sm:text-5xl text-espresso leading-tight mb-5">
            Canastillas de regalo orgánicas,<br />armadas a mano
          </h1>
          <p className="font-sans text-[15px] leading-relaxed text-espresso-light max-w-xl mx-auto mb-8">
            Para la mamá tanto como para el bebé — algodón orgánico, cuidado botánico y una tarjeta que lleva tus palabras.
          </p>
          <Link href="#colecciones" className="inline-block bg-[#7A8E7C] text-white font-sans text-[12px] tracking-[0.2em] uppercase py-4 px-10 hover:bg-[#6b7d6d] transition-colors">
            Ver las colecciones
          </Link>
        </div>
      </section>

      {/* Perks */}
      <section className="border-b border-cream-300">
        <div className="max-w-5xl mx-auto px-6 py-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {PERKS.map(p => (
            <div key={p.label}>
              <p className="font-sans text-[11px] tracking-[0.15em] uppercase text-espresso font-semibold">{p.label}</p>
              <p className="font-sans text-[11px] text-bark-400">{p.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Collections */}
      <section id="colecciones" className="max-w-6xl mx-auto px-6 py-14">
        <h2 className="font-playfair text-2xl text-espresso mb-8 text-center">Nuestras colecciones</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map(c => {
            const es = t.get(c.slug) ?? {}
            return (
              <Link key={c.slug} href={`/es/colecciones/${c.slug}`} className="group border border-cream-300 p-7 hover:border-gold-400 transition-colors">
                <p className="font-playfair text-lg text-espresso mb-2 group-hover:text-gold-500 transition-colors">{es.title ?? c.title}</p>
                <p className="font-sans text-[13px] leading-relaxed text-espresso-light">{(es.intro_copy ?? c.intro_copy ?? '').slice(0, 140)}…</p>
              </Link>
            )
          })}
        </div>
      </section>
      </main>
      <Footer />
    </>
  )
}
