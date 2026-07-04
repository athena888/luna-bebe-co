import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { JsonLd } from '@/components/ui/JsonLd'
import { type Block } from '@/lib/journal'
import { getJournalPostBySlug, getJournalPosts } from '@/lib/journal-db'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com'

// New posts can be published at any time, so render unknown slugs on demand.
export const dynamicParams = true
export const revalidate = 300

export async function generateStaticParams() {
  const posts = await getJournalPosts()
  return posts.map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = await getJournalPostBySlug(slug)
  if (!post) return { title: 'Not Found' }
  const url = `${BASE}/journal/${post.slug}`
  return {
    title: { absolute: `${post.title} | Petite Lavande` },
    description: post.metaDescription,
    alternates: { canonical: url },
    openGraph: { title: post.title, description: post.metaDescription, url, type: 'article' },
    twitter: { card: 'summary_large_image' },
  }
}

function renderBlock(b: Block, i: number) {
  if ('h2' in b) return <h2 key={i} className="font-serif text-2xl text-espresso mt-8 mb-2.5">{b.h2}</h2>
  if ('ul' in b) return (
    <ul key={i} className="my-3.5 space-y-1.5">
      {b.ul.map((li, j) => (
        <li key={j} className="font-cormorant text-lg text-bark-500 leading-relaxed flex gap-3">
          <span className="w-3 h-px bg-gold-400 mt-3.5 shrink-0" />{li}
        </li>
      ))}
    </ul>
  )
  return <p key={i} className="font-cormorant text-lg text-bark-500 leading-relaxed mb-3.5">{b.p}</p>
}

export default async function JournalPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getJournalPostBySlug(slug)
  if (!post) notFound()
  const url = `${BASE}/journal/${post.slug}`

  return (
    <>
      <Header />
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.metaDescription,
        datePublished: post.date,
        dateModified: post.date,
        author: { '@type': 'Organization', name: 'Petite Lavande' },
        publisher: { '@type': 'Organization', name: 'Petite Lavande', logo: { '@type': 'ImageObject', url: `${BASE}/apple-touch-icon.png` } },
        mainEntityOfPage: url,
      }} />
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
          { '@type': 'ListItem', position: 2, name: 'Journal', item: `${BASE}/journal` },
          { '@type': 'ListItem', position: 3, name: post.title, item: url },
        ],
      }} />

      <main className="bg-cream-50 min-h-screen">
        <article className="max-w-2xl mx-auto px-6 sm:px-8 py-10 sm:py-14">
          <Link href="/journal" className="font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 hover:text-bark-600 transition-colors">← The Journal</Link>
          <p className="font-sans text-[9px] tracking-[0.25em] uppercase text-gold-400 mt-6 mb-3">
            {new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · {post.readMins} min read
          </p>
          <h1 className="font-serif text-[2.25rem] sm:text-[3rem] text-espresso leading-[1.1] mb-6">{post.title}</h1>

          <div>{post.body.map(renderBlock)}</div>

          {/* Internal links */}
          <div className="mt-10 pt-6 border-t border-cream-300">
            <p className="font-sans text-[9px] tracking-[0.35em] uppercase text-gold-400 mb-4">Keep exploring</p>
            <div className="flex flex-col gap-2.5">
              {post.related.map(r => (
                <Link key={r.href} href={r.href} className="font-serif text-lg text-bark-600 hover:text-bark-800 transition-colors inline-flex items-center gap-2">
                  {r.label} <span className="text-gold-400">→</span>
                </Link>
              ))}
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </>
  )
}
