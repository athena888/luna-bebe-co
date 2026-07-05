import type { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { getJournalPosts } from '@/lib/journal-db'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com'

// Posts come from the DB (merged with built-in starters); refresh periodically.
export const revalidate = 300

export const metadata: Metadata = {
  title: { absolute: 'The Journal — Gift Guides & New-Parent Notes | Petite Lavande' },
  description: 'Gift guides, postpartum notes and new-parent ideas from Petite Lavande — thoughtful reading on organic baby gifts and caring for mom.',
  alternates: { canonical: `${BASE}/journal` },
  openGraph: { title: 'The Journal | Petite Lavande', description: 'Gift guides and new-parent notes from Petite Lavande.', url: `${BASE}/journal`, type: 'website' },
}

export default async function JournalIndex() {
  const posts = await getJournalPosts()
  return (
    <>
      <Header />
      <main className="bg-cream-50 min-h-screen">
        <section className="border-b border-cream-300 px-6 sm:px-8 py-12 sm:py-14 text-center">
          <p className="font-sans text-[11px] tracking-[0.3em] uppercase text-gold-400 mb-3">The Journal</p>
          <h1 className="font-serif text-[2.5rem] sm:text-[3.5rem] text-espresso leading-tight">Gift guides &amp; new-parent notes</h1>
          <p className="font-cormorant text-lg sm:text-xl text-bark-400 mt-3 max-w-2xl mx-auto leading-relaxed">
            Thoughtful reading on organic baby gifts, postpartum care, and the small details that make a present feel personal.
          </p>
        </section>

        <section className="max-w-4xl mx-auto px-6 sm:px-8 py-10 grid gap-7">
          {posts.map(post => (
            <Link key={post.slug} href={`/journal/${post.slug}`} className="group border-b border-cream-300 pb-7 last:border-0">
              <p className="font-sans text-[11px] tracking-[0.25em] uppercase text-gold-400 mb-1.5">
                {new Date(post.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} · {post.readMins} min read
              </p>
              <h2 className="font-serif text-2xl sm:text-3xl text-espresso leading-snug mb-1.5 group-hover:text-bark-800 transition-colors">{post.title}</h2>
              <p className="font-cormorant text-lg text-bark-400 leading-relaxed mb-2.5">{post.excerpt}</p>
              <span className="font-sans text-[11px] tracking-[0.2em] uppercase text-bark-500 border-b border-bark-400 pb-0.5">Read more →</span>
            </Link>
          ))}
        </section>
      </main>
      <Footer />
    </>
  )
}
