import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import Link from 'next/link'
import { getSiteImages } from '@/lib/site-images'
import { getStoryContent } from '@/lib/story-content'
import { getActiveSocialPosts } from '@/lib/social-posts'
import { SlotBackground } from '@/components/ui/SlotBackground'
import { ScrollFlyIn } from '@/components/ui/ScrollFlyIn'


// One-time donation mention on the story page. Leave empty ('') to hide the
// whole "A note on giving" section.
const GIVING_ORG_NAME = ''

// Full Spanish story content, reviewer-register. DB edits to the English
// story (Portal → Story) require updating this map for /es/historia.
const ES_STORY = {
  hero: { eyebrow: 'Nuestra historia', heading: 'Nacida de la certeza de que los comienzos merecen ser hermosos' },
  french: {
    eyebrow: 'Alma de apotecario francés',
    tagline: 'Un regalo que se siente de un lugar lejano y, a la vez, cultivado cerca de casa.',
    paragraphs: ['La estética viene de los viejos apotecarios franceses — papel kraft, tubos de vidrio, sellos prensados a mano, cordel, hierbas secas. Una época en la que los remedios venían con cuidado, y el cuidado venía con belleza.'],
  },
  traced: {
    eyebrow: 'Con origen conocido',
    heading: 'No curamos. Rastreamos.',
    body: 'Cada ingrediente, cada material — con su origen conocido. Campos de lavanda de la Provenza. Granjas del Pacífico Noroeste. Pequeños talleres americanos y fuentes europeas éticas. Todo etiquetado. Todo rastreable. Todo elegido como una hija elegiría para su propia madre.',
  },
  values: [
    { title: 'Puramente orgánico', body: 'Nuestra ropita es de algodón orgánico certificado GOTS, de talleres certificados GOTS, y elegimos materiales orgánicos y naturales en toda la canastilla siempre que podemos.' },
    { title: 'Hecho artesanal', body: 'Traemos nuestros botánicos de Europa y la lavanda de una granja familiar en Sequim, en el Pacífico Noroeste. Las manos que hicieron tu regalo lo cuidaron de verdad — y eso no se puede producir en masa.' },
    { title: 'Cada detalle', body: 'Canastas de fibra natural, tarjetas personalizadas, papel de seda y listón — porque abrir el regalo es parte del regalo. Creemos en la belleza de la ceremonia.' },
  ],
  founder: {
    eyebrow: 'Una carta de la fundadora',
    signature: '— Emily, fundadora',
    paragraphs: ['Empecé Petite Lavande porque veía una y otra vez a mamás recientes recibir cosas que parecían pensadas para alguien más. Regalos hermosos, de verdad — pero regalos para la casa, para el cuarto del bebé, para el bebé. La mujer que acababa de hacer lo más valiente de su vida sonreía, daba las gracias y volvía a guardarse en silencio. Un nacimiento es la semana más grande de dos vidas, no de una — y yo quería hacer el regalo que recuerda a las dos. Por eso todo aquí se eligió como una hija elegiría para su propia madre. Despacio, y con un poco de recelo protector. Lavanda de la Provenza, algodón orgánico, pequeños estudios donde las manos de alguien tocaron lo que estás por regalar.'],
  },
  whySimple: {
    eyebrow: 'Por qué tan simple',
    tagline: 'La sencillez no es un atajo. Es la decisión más difícil.',
    body: 'No agregamos lo que no pertenece. No rellenamos la canastilla por rellenar. Cada pieza está aquí porque una mamá reciente de verdad la va a usar, sostener, beber o ponérsela a su bebé.',
  },
}

export default async function StoryView({ locale = 'en' }: { locale?: 'en' | 'es' }) {
  const isEs = locale === 'es'
  const [imgs, rawContent, igPosts] = await Promise.all([
    getSiteImages(['story.founder', 'story.values', 'story.value.2']),
    getStoryContent(),
    getActiveSocialPosts(6),
  ])
  const content = isEs ? { ...rawContent, ...ES_STORY, values: ES_STORY.values } : rawContent
  const founder = imgs['story.founder']
  // Values photo — dedicated slot, falling back to the old lavender value icon
  const valuesPhoto = imgs['story.values'] ?? imgs['story.value.2']

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">

        {/* Founder letter — opens the page (the logo + headline moved down to
            the full-bleed section between the values and the closing). */}
        <SlotBackground slotKey="story.hero_bg" scrim="bg-[#FBF7F0]/92" className="border-b border-cream-300">
          {/* Letter layout (Emily 2026-08-20): portrait ON TOP, centered, with
              the letter in one readable column beneath — the old side-by-side
              float fell apart once the letter grew to ten paragraphs (a short
              photo against a towering text column). Same stack on phones,
              slightly smaller portrait. */}
          <div className="max-w-2xl mx-auto px-6 pt-10 sm:pt-14 pb-12 sm:pb-16">
            {founder && (
              <div className="w-40 sm:w-52 mx-auto mb-6 sm:mb-8">
                <div className="aspect-[3/4] overflow-hidden rounded-sm border border-cream-300 shadow-sm">
                  <img src={founder.public_url} alt={founder.alt_text} className="w-full h-full object-cover" />
                </div>
              </div>
            )}
            <p className="font-sans text-[12px] tracking-[0.18em] uppercase font-bold text-[#7A8E7C] text-center mb-6 sm:mb-8">
              {content.founder.eyebrow}
            </p>
            <div className="space-y-4">
              {content.founder.paragraphs.map((para, i) => (
                i === 0
                  ? <p key={i} className="font-playfair text-[17px] sm:text-[18px] text-espresso leading-relaxed">{para}</p>
                  : <p key={i} className="font-playfair text-[15px] sm:text-[16px] text-espresso-light leading-relaxed">{para}</p>
              ))}
              <p className="font-playfair italic text-xl text-espresso pt-2">
                {content.founder.signature}
              </p>
            </div>
          </div>
        </SlotBackground>

        {/* A note on giving — one-time donation mention, text only. Renders
            nothing while GIVING_ORG_NAME is empty. */}
        {GIVING_ORG_NAME && (
          <section className="border-b border-cream-300 bg-[#FBF7F0]">
            <div className="max-w-2xl mx-auto px-6 py-10 text-center">
              <p className="font-sans text-[11px] tracking-[0.18em] uppercase text-bark-400 mb-3">A note on giving</p>
              <p className="font-playfair text-[15px] text-espresso-light leading-relaxed">
                Every piece we make is meant to be used and loved. This season, we donated our sample
                collection to {GIVING_ORG_NAME}, supporting local families welcoming new babies. It felt
                like the right home for them.
              </p>
            </div>
          </section>
        )}

        {/* What We Stand For — three points on white, framed by mirrored
            lavender dividers (top one flipped), each point rising in. */}
        <section className="bg-white overflow-hidden">
          <div className="pt-12 px-6 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/decor/lavender-divider.webp" alt="" aria-hidden="true" loading="lazy" decoding="async" className="w-full max-w-xl h-auto rotate-180" />
          </div>
          <div className="max-w-5xl mx-auto px-6 py-14 sm:py-16 text-center">
            <p className="font-sans text-[12px] tracking-[0.35em] uppercase font-bold text-[#7A8E7C] mb-12">{isEs ? 'Lo que defendemos' : 'What We Stand For'}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
              {content.values.map(({ title, body }, i) => (
                <ScrollFlyIn key={i} from="up" delay={i * 160}>
                  <h3 className="font-serif text-lg tracking-[0.12em] uppercase text-espresso mb-2.5">{title}</h3>
                  <p className="font-playfair text-[15px] text-espresso-light leading-relaxed max-w-xs mx-auto">{body}</p>
                </ScrollFlyIn>
              ))}
            </div>
          </div>
          <div className="pb-12 px-6 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/decor/lavender-divider.webp" alt="" aria-hidden="true" loading="lazy" decoding="async" className="w-full max-w-xl h-auto" />
          </div>
        </section>

        {/* French apothecary soul — editorial split below the three points:
            lavender photo left, sage panel right with the "Born from a belief…"
            headline and the French copy. */}
        <section className="border-t border-cream-300">
          <div className="grid grid-cols-1 md:grid-cols-2 items-stretch">
            <div className="relative aspect-[4/5] md:aspect-auto md:min-h-[70vh] bg-cream-100">
              {valuesPhoto
                ? <img src={valuesPhoto.public_url} alt={valuesPhoto.alt_text} className="absolute inset-0 w-full h-full object-cover" />
                : <div className="absolute inset-0 bg-cream-200" />}
            </div>
            <div className="bg-[#76927E] flex flex-col items-center justify-center text-center px-8 sm:px-14 lg:px-20 py-16 md:py-12">
              <ScrollFlyIn from="down">
                <p className="font-sans text-[11px] tracking-[0.18em] uppercase text-white/70 mb-6">{content.hero.eyebrow}</p>
                {/* h1 (was h2): the page's only top-level heading — Bing flagged
                    /story and /es/historia for missing h1. Styling unchanged. */}
                <h1
                  className="text-3xl sm:text-4xl text-white leading-tight mb-10"
                  style={{ fontFamily: 'var(--font-playfair)', fontWeight: 400 }}
                >
                  {content.hero.heading}
                </h1>
              </ScrollFlyIn>
              <ScrollFlyIn from="down">
                <div className="max-w-md mx-auto">
                  {content.french.paragraphs.map((para, i) => (
                    <p key={i} className="font-sans text-sm text-white/90 leading-relaxed mb-4">{para}</p>
                  ))}
                </div>
                <p className="text-2xl text-white mt-2" style={{ fontFamily: 'var(--font-cormorant)', fontStyle: 'italic' }}>{content.french.tagline}</p>
              </ScrollFlyIn>
            </div>
          </div>
        </section>

        {/* Connect / Social */}
        <div className="border-t border-cream-300 bg-[#FEF8F4]">
          {/* Instagram photo grid */}
          {igPosts.length > 0 && (
            <div className="border-t border-cream-300">
              <div className="py-4 text-center">
                <a href="https://www.instagram.com/petitelavandeco" target="_blank" rel="noopener noreferrer"
                  className="font-sans text-[11px] tracking-[0.18em] uppercase text-bark-400 hover:text-bark-600 transition-colors">
                  Follow @petitelavandeco on Instagram
                </a>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6">
                {igPosts.map((post, i) => (
                  <a key={post.id}
                    href={post.embed_url || 'https://www.instagram.com/petitelavandeco'}
                    target="_blank" rel="noopener noreferrer"
                    className="relative aspect-square overflow-hidden group bg-cream-200 block"
                  >
                    {post.media_url && (
                      <img src={post.media_url} alt={post.caption || `Petite Lavande post ${i + 1}`}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-500"
                      />
                    )}
                    <div className="absolute inset-0 bg-bark-800/0 group-hover:bg-bark-800/25 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="white" stroke="none"/></svg>
                    </div>
                  </a>
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
