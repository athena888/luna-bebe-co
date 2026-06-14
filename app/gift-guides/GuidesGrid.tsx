'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export interface GuideCard {
  slug: string
  href: string
  h1: string
  eyebrow: string
  blurb: string
  tag: string
  image: string | null
}

// Tag-filtered grid of every gift guide. One nav entry ("Gifting Ideas") brings
// people here; they swap between guides in-page by tag.
export function GuidesGrid({ guides }: { guides: GuideCard[] }) {
  // Tags in first-appearance order, with "All" first.
  const tags = ['All', ...Array.from(new Set(guides.map(g => g.tag)))]
  const [active, setActive] = useState('All')
  const shown = active === 'All' ? guides : guides.filter(g => g.tag === active)

  return (
    <>
      {/* Tag filter */}
      <div className="flex flex-wrap justify-center gap-2 mb-12">
        {tags.map(t => (
          <button
            key={t}
            onClick={() => setActive(t)}
            className={`font-sans text-[10px] tracking-[0.2em] uppercase px-5 py-2.5 border transition-colors ${
              active === t
                ? 'bg-bark-600 text-cream-50 border-bark-600'
                : 'bg-transparent text-bark-500 border-cream-300 hover:border-bark-400'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {shown.map(g => (
          <Link key={g.slug} href={g.href} className="group block">
            <div className="relative aspect-[4/5] bg-cream-200 overflow-hidden mb-4 border border-cream-200">
              {g.image ? (
                <img
                  src={g.image}
                  alt={g.h1}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-cream-100 to-cream-200">
                  <span className="font-serif italic text-2xl text-bark-300">Petite Lavande</span>
                </div>
              )}
              <span className="absolute top-3 left-3 bg-cream-50/90 text-bark-600 font-sans text-[9px] tracking-[0.2em] uppercase px-3 py-1">{g.tag}</span>
            </div>
            <p className="font-sans text-[9px] tracking-[0.4em] uppercase text-gold-400 mb-1.5">{g.eyebrow}</p>
            <h2 className="font-serif text-xl text-espresso leading-snug mb-2 group-hover:text-bark-800 transition-colors">{g.h1.replace(/^The /, '')}</h2>
            <p className="font-cormorant text-base text-bark-400 leading-relaxed mb-3 line-clamp-3">{g.blurb}</p>
            <span className="inline-flex items-center gap-1.5 font-sans text-[10px] tracking-[0.2em] uppercase text-bark-500 group-hover:text-bark-700 transition-colors">
              Explore <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
            </span>
          </Link>
        ))}
      </div>
    </>
  )
}
