import Image from 'next/image'
import { supabaseAdmin } from '@/lib/supabase'

// The Instagram/TikTok feed, surfaced inside the Story page. Renders nothing
// when there are no active posts, so the page stays clean before any are added.

function InstagramIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
    </svg>
  )
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
        <Image src={post.media_url} alt={post.caption || 'Petite Lavande'} width={600} height={600} className="w-full h-auto object-cover" unoptimized />
      )}
      {post.type === 'video' && post.media_url && (
        <video src={post.media_url} className="w-full h-auto" controls playsInline muted />
      )}
      {isEmbed && (
        <a href={post.embed_url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center aspect-square bg-cream-200 hover:bg-cream-300 transition-colors">
          {post.type === 'instagram' ? <InstagramIcon size={36} className="text-bark-400 mb-2" /> : <span className="text-4xl mb-2">🎵</span>}
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

export async function SocialFeed() {
  const posts = await getPosts()
  if (posts.length === 0) return null

  return (
    <section className="border-t border-cream-300 bg-cream-50 py-16 sm:py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="font-sans text-[9px] tracking-[0.5em] uppercase text-gold-400 mb-2">Follow Along</p>
          <h2 className="font-serif text-[2rem] sm:text-[2.5rem] text-espresso mb-6">Moments We Love</h2>
          <div className="flex gap-4 justify-center">
            <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 border border-bark-600 text-bark-600 font-sans text-[10px] tracking-[0.2em] uppercase px-6 py-3 hover:bg-bark-600 hover:text-cream-50 transition-colors">
              <InstagramIcon size={14} /> Instagram
            </a>
            <a href="https://www.tiktok.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 border border-bark-600 text-bark-600 font-sans text-[10px] tracking-[0.2em] uppercase px-6 py-3 hover:bg-bark-600 hover:text-cream-50 transition-colors">
              <span className="text-sm">🎵</span> TikTok
            </a>
          </div>
        </div>
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
          {posts.map(post => <PostCard key={post.id} post={post} />)}
        </div>
      </div>
    </section>
  )
}
