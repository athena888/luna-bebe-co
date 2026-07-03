import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getSiteImages } from '@/lib/site-images'
import { getStoryContent } from '@/lib/story-content'
import { getActiveSocialPosts } from '@/lib/social-posts'
import { LogoMark } from '@/components/ui/LogoMark'
import { SlotImage } from '@/components/ui/SlotImage'
import { SlotBackground } from '@/components/ui/SlotBackground'
import { ScrollFlyIn } from '@/components/ui/ScrollFlyIn'

export const metadata: Metadata = {
  title: 'Our Story',
  description: 'The story behind Petite Lavande — why we believe every new baby deserves a gift as extraordinary as they are.',
}

export const revalidate = 60

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

        {/* Hero + Founder letter — one section, separated by a divider only.
            Background uploadable via Portal → Story → Hero. */}
        <SlotBackground slotKey="story.hero_bg" scrim="bg-[#FBF7F0]/92" className="border-b border-cream-300">
          {/* Hero heading */}
          <div className="max-w-3xl mx-auto px-6 pt-10 sm:pt-20 pb-8 text-center">
            <LogoMark className="h-20 sm:h-32 w-auto mx-auto mb-4 sm:mb-6" style={{ color: '#574540' }} alt="Petite Lavande" />
            <p className="font-sans text-[10px] tracking-[0.4em] uppercase text-gold-400 mb-4">{content.hero.eyebrow}</p>
            <h1
              className="text-3xl sm:text-4xl lg:text-5xl text-espresso leading-tight"
              style={{ fontFamily: 'var(--font-playfair)', fontWeight: 400 }}
            >
              {content.hero.heading}
            </h1>
          </div>

          {/* Divider */}
          <div className="w-12 h-px bg-gold-400 mx-auto" />

          {/* Founder letter */}
          <div className="max-w-2xl mx-auto px-6 pt-12 pb-20">
            {founder && (
              <div className="float-none sm:float-right sm:ml-8 mb-6 w-full sm:w-56 shrink-0">
                <div className="aspect-[3/4] overflow-hidden border border-cream-300">
                  <img src={founder.public_url} alt={founder.alt_text} className="w-full h-full object-cover" />
                </div>
              </div>
            )}
            <div className="space-y-6">
              <p className="font-sans text-[9px] tracking-[0.3em] uppercase text-gold-400">{content.founder.eyebrow}</p>
              {content.founder.paragraphs.map((para, i) => (
                i === 0
                  ? <p key={i} className="text-xl text-espresso leading-loose" style={{ fontFamily: 'var(--font-cormorant)' }}>{para}</p>
                  : <p key={i} className="font-sans text-sm text-espresso-light leading-relaxed">{para}</p>
              ))}
              <p className="text-2xl text-espresso" style={{ fontFamily: 'var(--font-cormorant)', fontStyle: 'italic' }}>
                {content.founder.signature}
              </p>
            </div>
          </div>
        </SlotBackground>

        {/* Brand values — editorial split: lavender photo left, muted-green
            panel right with the three values listed (High-Summer-Edit style). */}
        <section className="border-t border-cream-300">
          <div className="grid grid-cols-1 md:grid-cols-2 items-stretch">
            <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[70vh] bg-cream-100">
              {valuesPhoto
                ? <img src={valuesPhoto.public_url} alt={valuesPhoto.alt_text} className="absolute inset-0 w-full h-full object-cover" />
                : <div className="absolute inset-0 bg-cream-200" />}
            </div>
            <div className="bg-[#7A8E7C] flex flex-col items-center justify-center text-center px-8 sm:px-14 lg:px-20 py-16 md:py-12">
              <p className="font-sans text-[10px] tracking-[0.35em] uppercase text-white/60 mb-10">What We Stand For</p>
              <div className="space-y-9 max-w-md">
                {content.values.map(({ title, body }, i) => (
                  <div key={i}>
                    <h3 className="font-sans text-xs tracking-[0.25em] uppercase text-white mb-2.5">{title}</h3>
                    <p className="font-playfair text-[15px] text-white/90 leading-relaxed">{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* French apothecary soul — text column (left 35%) and photo column
            (right 65%) side by side, no overlap. Photo managed in Portal → Story. */}
        <section className="border-t border-cream-300">
          <div className="grid grid-cols-1 md:grid-cols-[35%_65%] items-stretch">
            {/* Left: text on cream — flies in/out on scroll */}
            <ScrollFlyIn from="left" className="bg-[#FBF7F0] px-6 sm:px-10 lg:px-14 py-16 sm:py-20 flex flex-col justify-center">
              <p className="font-sans text-[9px] tracking-[0.3em] uppercase text-gold-400 mb-4">{content.french.eyebrow}</p>
              {content.french.paragraphs.map((para, i) => (
                i === 0
                  ? <p key={i} className="font-sans text-sm text-espresso-light leading-relaxed mb-4">{para}</p>
                  : <p key={i} className="font-sans text-sm text-bark-400 leading-relaxed mb-4">{para}</p>
              ))}
              <p className="text-2xl text-espresso" style={{ fontFamily: 'var(--font-cormorant)', fontStyle: 'italic' }}>{content.french.tagline}</p>
            </ScrollFlyIn>
            {/* Right: the photo as its own block — sits beside the text, no overlap */}
            <div className="relative min-h-[22rem] md:min-h-[32rem] bg-cream-100">
              <SlotImage slotKey="story.french_bg" className="absolute inset-0 w-full h-full" imgClassName="w-full h-full object-cover" />
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
                  className="font-sans text-[9px] tracking-[0.35em] uppercase text-bark-400 hover:text-bark-600 transition-colors">
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
