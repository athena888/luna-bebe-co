import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { SlotBackground } from '@/components/ui/SlotBackground'
import { listPressImages } from '@/lib/lookbook/images'
import { getTiers } from '@/lib/lookbook/copy'
import { getConfig } from '@/lib/pipeline/config'
import { Download } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Press Kit — Petite Lavande',
  description: 'Press assets, line sheet, and brand information for Petite Lavande — organic newborn & postpartum gift boxes, finished by hand in Seattle.',
  alternates: { canonical: '/press' },
}

// Public press kit — the stable URL press pitches link to ({{press_kit_url}}).
// Renders from images Emily tags "press" in the portal image library (private
// bucket, fresh signed URLs per request) + the catalog_tiers line sheet. With
// zero tagged images it renders a minimal holding version — and the drafter
// independently refuses to queue pitches until a kit exists.

interface PressConfig { brand_one_liner?: string }

export default async function PressPage() {
  const [images, tiers, press] = await Promise.all([
    listPressImages(3600).catch(() => []),
    getTiers().catch(() => []),
    getConfig<PressConfig>('press').catch(() => null),
  ])
  const oneLiner = press?.brand_one_liner
    || 'Organic newborn & postpartum gift boxes, finished by hand in Seattle — every material traced to source.'

  return (
    <>
      <Header />
      <main className="bg-cream-50">
        {/* Hero — background uploadable via Portal → Site Images → Press */}
        <SlotBackground slotKey="press.hero_bg" scrim="bg-cream-50/70">
          <section className="max-w-4xl mx-auto px-6 pt-16 pb-12 text-center">
            <p className="font-sans text-[11px] tracking-[0.3em] uppercase text-gold-400 mb-3">Press Kit</p>
            <h1 className="font-serif text-4xl text-espresso mb-4">Petite Lavande</h1>
            <p className="font-cormorant text-xl italic text-espresso-light max-w-2xl mx-auto">{oneLiner}</p>
            <p className="font-sans text-sm text-bark-500 mt-6">
              Press inquiries &amp; samples: <a className="underline" href="mailto:hello@petitelavande.com">hello@petitelavande.com</a>
            </p>
          </section>
        </SlotBackground>

        {images.length > 0 ? (
          <>
            <SlotBackground slotKey="press.images_bg" scrim="bg-cream-50/85">
            <section className="max-w-5xl mx-auto px-6 py-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-serif text-2xl text-espresso">Images</h2>
                <a href="/api/press/images.zip"
                  className="inline-flex items-center gap-2 bg-espresso text-cream-50 hover:opacity-90 font-sans text-xs tracking-[0.1em] uppercase px-5 py-3 rounded-xl transition-opacity">
                  <Download size={14} /> Download all ({images.length})
                </a>
              </div>
              <p className="font-sans text-xs text-bark-400 mb-6">Full-resolution, cleared for editorial use with credit “Petite Lavande”.</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {images.map(img => (
                  <a key={img.id} href={img.url} target="_blank" rel="noopener noreferrer" className="group block bg-white rounded-xl overflow-hidden border border-cream-300">
                    {img.url && (
                      // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
                      <img src={img.url} alt={img.tags.join(', ') || 'Petite Lavande product photo'} className="w-full aspect-square object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                    )}
                  </a>
                ))}
              </div>
            </section>
            </SlotBackground>

            {tiers.length > 0 && (
              <SlotBackground slotKey="press.linesheet_bg" scrim="bg-cream-50/85">
              <section className="max-w-3xl mx-auto px-6 py-12">
                <h2 className="font-serif text-2xl text-espresso mb-5">Line Sheet</h2>
                <div className="bg-white rounded-2xl border border-cream-300 divide-y divide-cream-200">
                  {tiers.map(t => (
                    <div key={t.id} className="flex items-baseline gap-4 px-6 py-4">
                      <p className="font-serif text-lg text-espresso shrink-0">{t.name}</p>
                      <p className="font-sans text-xs text-bark-400 flex-1">{t.description}</p>
                      <p className="font-serif text-lg text-espresso shrink-0">${t.price}</p>
                    </div>
                  ))}
                </div>
                <p className="font-sans text-xs text-bark-400 mt-4">All boxes ship nationwide. Hand-finished in Seattle: printed card, dried lavender, satin ribbon.</p>
              </section>
              </SlotBackground>
            )}
          </>
        ) : (
          <section className="max-w-2xl mx-auto px-6 pt-2 pb-12 text-center">
            <p className="font-sans text-sm text-bark-500">
              Press photography is on its way. In the meantime, we're happy to send images and samples directly — just email us above.
            </p>
          </section>
        )}
      </main>
      <Footer />
    </>
  )
}
