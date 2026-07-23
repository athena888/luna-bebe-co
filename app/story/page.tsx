import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getSiteImages } from '@/lib/site-images'
import { getStoryContent } from '@/lib/story-content'
import { getActiveSocialPosts } from '@/lib/social-posts'
import { SlotBackground } from '@/components/ui/SlotBackground'
import { ScrollFlyIn } from '@/components/ui/ScrollFlyIn'

export const metadata: Metadata = {
  title: 'Our Story',
  description: 'The story behind Petite Lavande — why we believe every new baby deserves a gift as extraordinary as they are.',
  alternates: { canonical: '/story' },
}

export const revalidate = 60

// One-time donation mention on the story page. Leave empty ('') to hide the
// whole "A note on giving" section.
const GIVING_ORG_NAME = 'WestSide Baby'

export default async function StoryPage() {
  const [imgs, content, igPosts] = await Promise.all([
    getSiteImages(['story.founder', 'story.values', 'story.value.2']),
    getStoryContent(),
    getActiveSocialPosts(6),
  ])
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
          <div className="max-w-4xl mx-auto px-6 pt-10 sm:pt-12 pb-12 sm:pb-14 sm:flex sm:items-start sm:gap-10">
            {founder && (
              <div className="mb-6 sm:mb-0 sm:order-2 sm:w-64 shrink-0">
                <div className="aspect-[3/4] overflow-hidden border border-cream-300">
                  <img src={founder.public_url} alt={founder.alt_text} className="w-full h-full object-cover" />
                </div>
              </div>
            )}
            <div className="space-y-4 sm:order-1 sm:flex-1 min-w-0">
              <p className="font-sans text-[12px] tracking-[0.3em] uppercase font-bold text-[#7A8E7C]">{content.founder.eyebrow}</p>
              {content.founder.paragraphs.map((para, i) => (
                i === 0
                  ? <p key={i} className="font-playfair text-[17px] text-espresso leading-snug">{para}</p>
                  : <p key={i} className="font-playfair text-[14px] text-espresso-light leading-snug">{para}</p>
              ))}
              <p className="font-playfair italic text-xl text-espresso">
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
              <p className="font-sans text-[11px] tracking-[0.3em] uppercase text-bark-400 mb-3">A note on giving</p>
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
            <img src="/decor/lavender-divider.png" alt="" aria-hidden="true" className="w-full max-w-xl h-auto rotate-180" />
          </div>
          <div className="max-w-5xl mx-auto px-6 py-14 sm:py-16 text-center">
            <p className="font-sans text-[12px] tracking-[0.35em] uppercase font-bold text-[#7A8E7C] mb-12">What We Stand For</p>
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
            <img src="/decor/lavender-divider.png" alt="" aria-hidden="true" className="w-full max-w-xl h-auto" />
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
                <p className="font-sans text-[11px] tracking-[0.3em] uppercase text-white/70 mb-6">{content.hero.eyebrow}</p>
                <h2
                  className="text-3xl sm:text-4xl text-white leading-tight mb-10"
                  style={{ fontFamily: 'var(--font-playfair)', fontWeight: 400 }}
                >
                  {content.hero.heading}
                </h2>
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
                  className="font-sans text-[11px] tracking-[0.3em] uppercase text-bark-400 hover:text-bark-600 transition-colors">
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
