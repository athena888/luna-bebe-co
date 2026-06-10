import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getSiteImages } from '@/lib/site-images'
import { getStoryContent } from '@/lib/story-content'
import { LogoMark } from '@/components/ui/LogoMark'
import { SlotImage } from '@/components/ui/SlotImage'
import { SocialFeed } from '@/components/ui/SocialFeed'
import { Leaf, Heart, Mail } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Our Story',
  description: 'The story behind Petite Lavande — why we believe every new baby deserves a gift as extraordinary as they are.',
}

export const revalidate = 60

const VALUE_ICONS = [Leaf, Heart, Mail]

export default async function StoryPage() {
  const [imgs, content] = await Promise.all([
    getSiteImages(['story.founder', 'story.value.1', 'story.value.2', 'story.value.3']),
    getStoryContent(),
  ])
  const founder = imgs['story.founder']
  const valueImgs = [imgs['story.value.1'], imgs['story.value.2'], imgs['story.value.3']]

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream-50">

        {/* Hero image (optional, managed in Portal → Story; mobile crop supported) */}
        <SlotImage slotKey="story.hero" className="relative block w-full aspect-[16/9] sm:aspect-[21/9] overflow-hidden" imgClassName="w-full h-full object-cover" />

        {/* Hero */}
        <div className="border-b border-cream-300 bg-white">
          <div className="max-w-3xl mx-auto px-6 py-20 text-center">
            <LogoMark className="h-32 w-auto mx-auto mb-6" style={{ color: '#574540' }} alt="Petite Lavande" />
            <p className="font-sans text-[10px] tracking-[0.4em] uppercase text-gold-400 mb-4">{content.hero.eyebrow}</p>
            <h1
              className="text-5xl sm:text-6xl text-bark-600 mb-6 leading-tight"
              style={{ fontFamily: 'var(--font-cormorant)', fontWeight: 400 }}
            >
              {content.hero.heading}
            </h1>
            <div className="w-12 h-px bg-gold-400 mx-auto" />
          </div>
        </div>

        {/* Founder letter */}
        <div className="max-w-2xl mx-auto px-6 py-20">
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
                ? <p key={i} className="text-xl text-bark-600 leading-loose" style={{ fontFamily: 'var(--font-cormorant)' }}>{para}</p>
                : <p key={i} className="font-sans text-sm text-bark-500 leading-relaxed">{para}</p>
            ))}
            <p className="text-2xl text-bark-500" style={{ fontFamily: 'var(--font-cormorant)', fontStyle: 'italic' }}>
              {content.founder.signature}
            </p>
          </div>
        </div>

        {/* Brand values */}
        <div className="border-t border-cream-300 bg-white">
          <div className="max-w-4xl mx-auto px-6 py-20">
            <p className="font-sans text-[9px] tracking-[0.35em] uppercase text-bark-400 text-center mb-12">What We Stand For</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
              {content.values.map(({ title, body }, i) => {
                const vi = valueImgs[i]
                const Icon = VALUE_ICONS[i] ?? Leaf
                return (
                  <div key={i} className="text-center">
                    {vi ? (
                      <div className="w-20 h-20 mx-auto mb-4 rounded-full pl-round-full overflow-hidden border border-cream-300">
                        <img src={vi.public_url} alt={vi.alt_text} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <Icon size={26} strokeWidth={1.5} className="text-gold-400 mb-4 mx-auto" />
                    )}
                    <h3 className="font-sans text-xs tracking-[0.2em] uppercase text-bark-600 mb-3">{title}</h3>
                    <p className="font-sans text-sm text-bark-400 leading-relaxed">{body}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* We don't curate. We trace. */}
        <div className="border-t border-cream-300">
          <div className="max-w-2xl mx-auto px-6 py-20 text-center">
            <p className="font-sans text-[9px] tracking-[0.35em] uppercase text-gold-400 mb-5">{content.traced.eyebrow}</p>
            <p
              className="text-3xl sm:text-4xl text-bark-600 mb-6"
              style={{ fontFamily: 'var(--font-cormorant)' }}
            >
              {content.traced.heading}
            </p>
            <p className="font-sans text-sm text-bark-500 leading-relaxed">
              {content.traced.body}
            </p>
          </div>
        </div>

        {/* Why Simple */}
        <div className="border-t border-cream-300 bg-white">
          <div className="max-w-2xl mx-auto px-6 py-20">
            <p className="font-sans text-[9px] tracking-[0.3em] uppercase text-gold-400 mb-4">{content.whySimple.eyebrow}</p>
            <p className="font-sans text-base text-bark-600 leading-relaxed mb-6">
              {content.whySimple.body}
            </p>
            <p
              className="text-2xl text-bark-500"
              style={{ fontFamily: 'var(--font-cormorant)', fontStyle: 'italic' }}
            >
              {content.whySimple.tagline}
            </p>
          </div>
        </div>

        {/* French Apothecary Soul, PNW Heart */}
        <div className="border-t border-cream-300">
          <div className="max-w-2xl mx-auto px-6 py-20">
            <p className="font-sans text-[9px] tracking-[0.3em] uppercase text-gold-400 mb-4">{content.french.eyebrow}</p>
            {content.french.paragraphs.map((para, i) => (
              <p key={i} className="font-sans text-sm text-bark-500 leading-relaxed mb-5">{para}</p>
            ))}
            <p
              className="text-xl text-bark-500"
              style={{ fontFamily: 'var(--font-cormorant)', fontStyle: 'italic' }}
            >
              {content.french.tagline}
            </p>
          </div>
        </div>

        {/* Instagram CTA */}
        <div className="border-t border-cream-300 bg-terra-50">
          <div className="max-w-2xl mx-auto px-6 py-16 text-center">
            <div className="text-3xl mb-4">📸</div>
            <p className="font-sans text-[9px] tracking-[0.35em] uppercase text-gold-400 mb-3">Follow Along</p>
            <h2
              className="text-3xl text-bark-600 mb-4"
              style={{ fontFamily: 'var(--font-cormorant)' }}
            >
              @petitelavandeco
            </h2>
            <p className="font-sans text-sm text-bark-400 mb-6 leading-relaxed">
              Behind-the-scenes of our packing process, sneak peeks of new products, and the most beautiful baby unboxings you've ever seen.
            </p>
            <a
              href="https://instagram.com/petitelavandeco"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block border border-bark-400 text-bark-600 font-sans text-[11px] tracking-[0.2em] uppercase px-8 py-3.5 hover:bg-bark-600 hover:text-cream-50 transition-colors"
            >
              Follow on Instagram
            </a>
          </div>
        </div>

        {/* Social feed — merged in from the old /social page */}
        <SocialFeed />


      </main>
      <Footer />
    </>
  )
}
