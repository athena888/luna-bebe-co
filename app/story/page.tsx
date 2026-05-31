import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Our Story',
  description: 'The story behind Petite Lavande — why we believe every new baby deserves a gift as extraordinary as they are.',
}

export default function StoryPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream-50">

        {/* Hero */}
        <div className="border-b border-cream-300 bg-white">
          <div className="max-w-3xl mx-auto px-6 py-20 text-center">
            <p className="font-sans text-[10px] tracking-[0.4em] uppercase text-gold-400 mb-4">Our Story</p>
            <h1
              className="text-5xl sm:text-6xl text-bark-600 mb-6 leading-tight"
              style={{ fontFamily: 'var(--font-cormorant)', fontWeight: 400 }}
            >
              Born from a belief that <em>beginnings</em> deserve to be beautiful
            </h1>
            <div className="w-12 h-px bg-gold-400 mx-auto" />
          </div>
        </div>

        {/* Founder letter */}
        <div className="max-w-2xl mx-auto px-6 py-20">
          <div className="space-y-6">
            <p className="font-sans text-[9px] tracking-[0.3em] uppercase text-gold-400">A Letter from the Founder</p>
            <p
              className="text-xl text-bark-600 leading-loose"
              style={{ fontFamily: 'var(--font-cormorant)' }}
            >
              When my daughter was born, I found myself surrounded by well-meaning gifts — synthetic fabrics in shrieking plastic packaging, items that felt like they were designed for a big-box store, not for a baby I'd carry in my heart forever.
            </p>
            <p className="font-sans text-sm text-bark-500 leading-relaxed">
              I wanted something different. Something that felt like it was made with intention — organic, artisan, beautiful. Something the mother would open and feel, for a moment, that she was being celebrated too. I couldn't find it. So I built it.
            </p>
            <p className="font-sans text-sm text-bark-500 leading-relaxed">
              Petite Lavande started at my kitchen table, sourcing directly from makers who share our values: no shortcuts, no synthetics, no compromises on what touches a newborn's skin. Every item in every box is something I would give my own child.
            </p>
            <p className="font-sans text-sm text-bark-500 leading-relaxed">
              We seal every box with our signature wax stamp, wrap every letter by hand, and ship every order with the care it deserves. Because a birth is not just a delivery — it's a beginning. And beginnings deserve to be luminous.
            </p>
            <p
              className="text-2xl text-bark-500"
              style={{ fontFamily: 'var(--font-cormorant)', fontStyle: 'italic' }}
            >
              — Émilie, Founder
            </p>
          </div>
        </div>

        {/* Brand values */}
        <div className="border-t border-cream-300 bg-white">
          <div className="max-w-4xl mx-auto px-6 py-20">
            <p className="font-sans text-[9px] tracking-[0.35em] uppercase text-bark-400 text-center mb-12">What We Stand For</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
              {[
                {
                  emoji: '🌿',
                  title: 'Purely Organic',
                  body: 'Every textile is GOTS-certified or equivalent. Every skincare ingredient is clean, tested, and safe from day one. No exceptions.',
                },
                {
                  emoji: '🤍',
                  title: 'Artisan-Made',
                  body: 'We source from small makers and family studios. The hands that made your gift cared deeply about it — and that\'s not something you can mass-produce.',
                },
                {
                  emoji: '✉️',
                  title: 'Every Detail',
                  body: 'Wax-sealed boxes, handwritten letters, tissue and ribbon — because the unboxing is part of the gift. We believe in the beauty of ceremony.',
                },
              ].map(({ emoji, title, body }) => (
                <div key={title} className="text-center">
                  <div className="text-3xl mb-4">{emoji}</div>
                  <h3 className="font-sans text-xs tracking-[0.2em] uppercase text-bark-600 mb-3">{title}</h3>
                  <p className="font-sans text-sm text-bark-400 leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* As seen on / social proof */}
        <div className="border-t border-cream-300">
          <div className="max-w-3xl mx-auto px-6 py-16 text-center">
            <p className="font-sans text-[9px] tracking-[0.35em] uppercase text-bark-400 mb-10">As Told By Our Families</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {[
                {
                  quote: 'I have never seen a gift box like this. The new mother literally cried when she opened it. Every single item was exquisite.',
                  name: 'Sarah M.',
                  context: 'Baby shower gift',
                },
                {
                  quote: 'We ordered the Neutral Newborn box and it became the most-talked-about gift at the baby shower. Worth every penny.',
                  name: 'James & Clara',
                  context: 'First-time parents',
                },
                {
                  quote: 'The attention to detail is unreal. The wax seal, the tissue paper, the handwritten card — it felt like unwrapping something from a Parisian boutique.',
                  name: 'Margot T.',
                  context: 'Gifted to a colleague',
                },
                {
                  quote: 'My sister still uses the bamboo swaddle two years later. That\'s how I know the quality is real.',
                  name: 'Lily R.',
                  context: 'Returning customer',
                },
              ].map(({ quote, name, context }) => (
                <div key={name} className="border border-cream-300 bg-white p-6 text-left">
                  <p
                    className="text-lg text-bark-500 leading-relaxed mb-4"
                    style={{ fontFamily: 'var(--font-cormorant)', fontStyle: 'italic' }}
                  >
                    "{quote}"
                  </p>
                  <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-bark-600">{name}</p>
                  <p className="font-sans text-[10px] text-bark-400">{context}</p>
                </div>
              ))}
            </div>
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
              @petitelavande
            </h2>
            <p className="font-sans text-sm text-bark-400 mb-6 leading-relaxed">
              Behind-the-scenes of our packing process, sneak peeks of new products, and the most beautiful baby unboxings you've ever seen.
            </p>
            <a
              href="https://instagram.com/petitelavande"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block border border-bark-400 text-bark-600 font-sans text-[11px] tracking-[0.2em] uppercase px-8 py-3.5 hover:bg-bark-600 hover:text-cream-50 transition-colors"
            >
              Follow on Instagram
            </a>
          </div>
        </div>

        {/* Final CTA */}
        <div className="border-t border-cream-300 bg-bark-600">
          <div className="max-w-xl mx-auto px-6 py-16 text-center">
            <p
              className="text-3xl text-cream-100 mb-4"
              style={{ fontFamily: 'var(--font-cormorant)' }}
            >
              Ready to give a gift that means something?
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/shop"
                className="inline-block bg-gold-400 text-bark-700 font-sans text-[11px] tracking-[0.2em] uppercase px-8 py-3.5 hover:bg-gold-500 transition-colors"
              >
                Shop Gift Boxes
              </Link>
              <Link
                href="/build"
                className="inline-block border border-cream-300/40 text-cream-300 font-sans text-[11px] tracking-[0.2em] uppercase px-8 py-3.5 hover:border-cream-300 hover:text-cream-100 transition-colors"
              >
                Build Your Own
              </Link>
            </div>
          </div>
        </div>

      </main>
      <Footer />
    </>
  )
}
