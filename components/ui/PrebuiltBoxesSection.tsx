'use client'

import Link from 'next/link'
import { useIsEs } from '@/lib/use-is-es'
import Image from 'next/image'
import { Package } from 'lucide-react'
import { useState, useEffect } from 'react'
import { formatDollars } from '@/lib/products'

// ── Section ──────────────────────────────────────────────────────────────────
export function PrebuiltBoxesSection() {
  const [boxes, setBoxes] = useState<Array<{ slug: string; name: string; image: string | null; low: number; high: number; href?: string }>>([])

  useEffect(() => {
    fetch('/api/catalog-nav?bestsellers=1').then(r => r.json()).then(d => setBoxes(d.products ?? [])).catch(() => {})
  }, [])

  const isEs = useIsEs()
  if (boxes.length === 0) return null

  return (
    <section className="pt-10 pb-12 sm:pt-12">
      <div className="px-6 mb-8 text-center">
        <p className="font-sans text-[13px] tracking-[0.18em] uppercase font-medium text-gold-500 mb-2">{isEs ? 'Listas para regalar' : 'Ready-Made'}</p>
        <h2 className="font-playfair text-[2rem] sm:text-[2.6rem] uppercase tracking-[0.01em] font-medium text-espresso leading-none">{isEs ? 'Las más queridas' : 'Best Sellers'}</h2>
      </div>

      {/* Cover photos — contained grid with side margins on desktop, vertical
          stack on mobile. Click to open the set. */}
      <div className="max-w-6xl mx-auto px-6 flex flex-col gap-9 sm:grid sm:grid-cols-3 sm:gap-x-5 sm:gap-y-10">
        {boxes.map(box => (
          <Link key={box.slug} href={box.href ?? `/boxes/${box.slug}`} className="group w-full text-center">
            <div className="relative aspect-[3/4] bg-white overflow-hidden">
              {box.image
                ? <Image src={box.image} alt={box.name} fill className="object-cover group-hover:scale-[1.03] transition-transform duration-700" sizes="(max-width:640px) 78vw, 380px" />
                : <div className="absolute inset-0 flex items-center justify-center text-bark-300"><Package size={32} /></div>}
            </div>
            {/* Caption below the image — espresso, turns gold on hover */}
            <div className="pt-4 text-espresso transition-colors duration-300 group-hover:text-gold-500">
              <h3 className="font-serif text-xl font-semibold leading-tight">{box.name}</h3>
              <p className="font-serif text-lg font-semibold mt-1">{box.low === box.high ? formatDollars(box.low) : `${formatDollars(box.low)} – ${formatDollars(box.high)}`}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
