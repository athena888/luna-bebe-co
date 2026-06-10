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
import { SocialFeed } from '@/components/ui/SocialFeed'
import { Leaf, Heart, Mail } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Our Story',
  description: 'The story behind Petite Lavande — why we believe every new baby deserves a gift as extraordinary as they are.',
}

export const revalidate = 60

const VALUE_ICONS = [Leaf, Heart, Mail]

export default async function StoryPage() {
  const [imgs, content, igPosts] = await Promise.all([
    getSiteImages(['story.founder', 'story.value.1', 'story.value.2', 'story.value.3']),
    getStoryContent(),
    getActiveSocialPosts(6),
  ])
  const founder = imgs['story.founder']
  const valueImgs = [imgs['story.value.1'], imgs['story.value.2'], imgs['story.value.3']]

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#FBF7F0]">

        {/* Hero image (optional, managed in Portal → Story; mobile crop supported) */}
        <SlotImage slotKey="story.hero" className="relative block w-full aspect-[16/9] sm:aspect-[21/9] overflow-hidden" imgClassName="w-full h-full object-cover" />

        {/* Hero — background uploadable via Portal → Site Images → Story → Hero background */}
        <SlotBackground slotKey="story.hero_bg" scrim="bg-[#FBF7F0]/92" className="border-b border-cream-300">
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
        </SlotBackground>

        {/* Founder letter */}
        <SlotBackground slotKey="story.founder_bg" scrim="bg-[#FBF7F0]/90" className="border-b border-cream-300">
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
        </SlotBackground>

        {/* Brand values */}
        <SlotBackground slotKey="story.values_bg" scrim="bg-[#FBF7F0]/90" className="border-t border-cream-300">
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
        </SlotBackground>

        {/* Only the best for her */}
        <div className="border-t border-cream-300 bg-[#FBF7F0]">
          <div className="max-w-2xl mx-auto px-6 py-20">
            <p className="font-sans text-[9px] tracking-[0.3em] uppercase text-gold-400 mb-4">Only the best for her</p>
            <p className="font-sans text-sm text-bark-500 leading-relaxed mb-5">
              The aesthetic comes from old French apothecaries — kraft paper, glass tubes, wax seals, twine, dried herbs. A time when remedies came with care, and care came with beauty.
            </p>
            <p
              className="text-2xl text-bark-500"
              style={{ fontFamily: 'var(--font-cormorant)', fontStyle: 'italic' }}
            >
              Everything tagged. Everything traceable. Everything chosen the way a daughter would choose for her own mother.
            </p>
          </div>
        </div>

        {/* Connect / Social */}
        <div className="border-t border-cream-300 bg-[#FBF7F0]">
          {/* Social icon strip */}
          <div className="py-8 px-6">
            <div className="max-w-4xl mx-auto text-center">
              <p className="font-sans text-[9px] tracking-[0.45em] uppercase text-gold-400 mb-2">Connect</p>
              <h2 className="font-serif text-2xl sm:text-3xl text-bark-600 mb-6">Find Us</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-cream-300">
                {([
                  { label: 'Email', sub: 'hello@petitelavande.com', href: 'mailto:hello@petitelavande.com',
                    icon: <Mail size={18} strokeWidth={1.5} className="text-bark-400 mx-auto mb-2.5" /> },
                  { label: 'Instagram', sub: '@petitelavandeco', href: 'https://www.instagram.com/petitelavandeco',
                    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] text-bark-400 mx-auto mb-2.5"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg> },
                  { label: 'Facebook', sub: 'Petite Lavande', href: 'https://www.facebook.com/profile.php?id=61590439437590',
                    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] text-bark-400 mx-auto mb-2.5"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg> },
                  { label: 'TikTok', sub: '@petitelavandeco', href: 'https://www.tiktok.com/@petitelavandeco',
                    icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px] text-bark-400 mx-auto mb-2.5"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/></svg> },
                ] as const).map(({ label, sub, href, icon }) => (
                  <a key={label} href={href}
                    target={href.startsWith('mailto') ? undefined : '_blank'}
                    rel={href.startsWith('mailto') ? undefined : 'noopener noreferrer'}
                    className="bg-[#FBF7F0] py-6 px-4 flex flex-col items-center hover:bg-cream-200 transition-colors group"
                  >
                    {icon}
                    <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-bark-600 mb-0.5 group-hover:text-bark-800 transition-colors">{label}</p>
                    <p className="font-sans text-[10px] text-bark-400 break-all">{sub}</p>
                  </a>
                ))}
              </div>
            </div>
          </div>

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
