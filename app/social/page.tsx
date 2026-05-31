import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { supabaseAdmin } from '@/lib/supabase'
import { Camera } from 'lucide-react'

function InstagramIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
    </svg>
  )
}

export const metadata: Metadata = {
  title: 'Stories & Social — Petite Lavande',
  description: 'Follow along with Petite Lavande — behind the scenes, unboxing moments, and the families we love.',
}

interface SocialPost {
  id: string
  type: 'image' | 'video' | 'instagram' | 'tiktok'
  media_url?: string
  embed_url?: string
  caption: string
  active: boolean
}

async function getPosts(): Promise<SocialPost[]> {
  try {
    const { data } = await supabaseAdmin
      .from('social_posts')
      .select('*')
      .eq('active', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })
    return data ?? []
  } catch {
    return []
  }
}

function PostCard({ post }: { post: SocialPost }) {
  const isEmbed = post.type === 'instagram' || post.type === 'tiktok'

  return (
    <div className="group relative bg-cream-100 overflow-hidden break-inside-avoid mb-4">
      {post.type === 'image' && post.media_url && (
        <div className="relative w-full">
          <Image
            src={post.media_url}
            alt={post.caption || 'Petite Lavande'}
            width={600}
            height={600}
            className="w-full h-auto object-cover"
            unoptimized
          />
        </div>
      )}

      {post.type === 'video' && post.media_url && (
        <video
          src={post.media_url}
          className="w-full h-auto"
          controls
          playsInline
          muted
        />
      )}

      {isEmbed && (
        <a
          href={post.embed_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center aspect-square bg-cream-200 hover:bg-cream-300 transition-colors"
        >
          {post.type === 'instagram' ? (
            <InstagramIcon size={36} className="text-bark-400 mb-2" />
          ) : (
            <span className="text-4xl mb-2">🎵</span>
          )}
          <p className="font-sans text-xs text-bark-500 tracking-wide">View on {post.type === 'instagram' ? 'Instagram' : 'TikTok'} →</p>
        </a>
      )}

      {post.caption && (
        <div className="px-4 py-3">
          <p className="font-serif text-sm text-bark-500 leading-relaxed italic">{post.caption}</p>
        </div>
      )}
    </div>
  )
}

export default async function SocialPage() {
  const posts = await getPosts()

  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="bg-cream-50 border-b border-cream-300 py-16 sm:py-24 text-center px-6">
          <p className="font-sans text-[9px] tracking-[0.5em] uppercase text-gold-400 mb-4">Behind the Ribbon</p>
          <h1 className="font-serif text-[2.5rem] sm:text-[4rem] text-bark-600 leading-tight mb-4">
            Our Story, Shared
          </h1>
          <p className="font-cormorant text-lg text-bark-400 max-w-xl mx-auto leading-loose">
            Follow along on Instagram and TikTok for unboxing moments, behind-the-scenes, and the families we love to celebrate.
          </p>
          <div className="flex gap-4 justify-center mt-8">
            <a
              href="https://www.instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 border border-bark-600 text-bark-600 font-sans text-[10px] tracking-[0.2em] uppercase px-6 py-3 hover:bg-bark-600 hover:text-cream-50 transition-colors"
            >
              <InstagramIcon size={14} />
              Instagram
            </a>
            <a
              href="https://www.tiktok.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 border border-bark-600 text-bark-600 font-sans text-[10px] tracking-[0.2em] uppercase px-6 py-3 hover:bg-bark-600 hover:text-cream-50 transition-colors"
            >
              <span className="text-sm">🎵</span>
              TikTok
            </a>
          </div>
        </section>

        {/* Grid */}
        <section className="max-w-6xl mx-auto px-6 py-16">
          {posts.length === 0 ? (
            <div className="text-center py-24">
              <Camera size={48} className="text-bark-200 mx-auto mb-4" />
              <p className="font-serif text-2xl text-bark-400">Coming soon.</p>
              <p className="font-sans text-sm text-bark-400/60 mt-2">We're just getting started — check back soon.</p>
              <Link
                href="/"
                className="inline-block mt-8 border border-bark-600 text-bark-600 font-sans text-[10px] tracking-[0.25em] uppercase px-8 py-3 hover:bg-bark-600 hover:text-cream-50 transition-colors"
              >
                Back to Home
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-12">
                <p className="font-sans text-[9px] tracking-[0.5em] uppercase text-gold-400 mb-2">Feed</p>
                <h2 className="font-serif text-[2rem] sm:text-[2.5rem] text-bark-600">Moments We Love</h2>
              </div>

              {/* Masonry-style 3-col grid */}
              <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
                {posts.map(post => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            </>
          )}
        </section>

        {/* CTA */}
        <section className="bg-cream-100 border-t border-cream-300 py-16 text-center px-6">
          <p className="font-sans text-[9px] tracking-[0.45em] uppercase text-gold-400 mb-4">Tag Us</p>
          <h2 className="font-serif text-2xl sm:text-3xl text-bark-600 mb-4">Share your unboxing moment</h2>
          <p className="font-cormorant text-lg text-bark-400 max-w-md mx-auto mb-8">
            Tag <span className="font-medium text-bark-600">@petitelavande</span> and we might feature your moment here.
          </p>
          <Link
            href="/build"
            className="inline-block bg-bark-600 text-cream-50 font-sans text-[10px] tracking-[0.25em] uppercase px-10 py-4 hover:bg-bark-700 transition-colors"
          >
            Build Your Box
          </Link>
        </section>
      </main>
      <Footer />
    </>
  )
}
