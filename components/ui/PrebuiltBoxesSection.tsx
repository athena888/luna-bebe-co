'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { ResolvedBox } from '@/lib/prebuilt-boxes-db'
import { BOX_BASE_PRICE } from '@/lib/products'
import { Package } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import type { Product } from '@/types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
function fmt(cents: number) { return `$${(cents / 100).toFixed(0)}` }
function productImg(p: Product): string | null {
  return p.image ?? (SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/product-images/${p.id}.jpg` : null)
}

// Reveal on scroll
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect() } }, { threshold: 0.12 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return { ref, shown }
}

function BoxCard({ box, index }: { box: ResolvedBox; index: number }) {
  const { ref, shown } = useReveal<HTMLDivElement>()
  const items = box.items
  const total = box.customPrice ?? (BOX_BASE_PRICE + items.reduce((s, p) => s + (p?.price ?? 0), 0))

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${index * 120}ms` }}
      className={`flex flex-col md:flex-row bg-cream-50 border border-cream-300 overflow-hidden transition-all duration-700 ease-out ${shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
    >
      {/* Image — large, fills the card height (image-first) */}
      <Link href={`/boxes/${box.slug}`} className="relative md:w-1/2 lg:w-[52%] shrink-0 aspect-[4/3] md:aspect-auto md:min-h-[460px] bg-cream-200 block group">
        {box.image
          ? <Image src={box.image} alt={box.name} fill className="object-cover group-hover:scale-[1.03] transition-transform duration-700" unoptimized />
          : <div className="absolute inset-0 flex items-center justify-center text-bark-300"><Package size={36} /></div>}
        <span className="absolute top-4 left-4 bg-white/90 font-sans text-[9px] tracking-[0.3em] uppercase text-bark-500 px-2.5 py-1">{box.style}</span>
      </Link>

      {/* Details — right */}
      <div className="md:w-1/2 lg:w-[48%] p-7 sm:p-9 flex flex-col">
        <h3 className="font-serif text-3xl text-bark-600 mb-1.5">{box.name}</h3>
        <p className="font-cormorant text-lg italic text-bark-400 mb-2 leading-snug">{box.tagline}</p>
        <p className="font-sans text-[9px] tracking-[0.2em] uppercase text-bark-300 mb-5">{box.aesthetic}</p>

        {/* What's inside — always shown, two columns to use the width */}
        <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-bark-500 mb-3 pt-4 border-t border-cream-200">What&rsquo;s inside · {items.length} items</p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 mb-6">
          {items.map(item => {
            const src = productImg(item)
            return (
              <li key={item.id} className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 shrink-0 bg-cream-100 border border-cream-200 overflow-hidden flex items-center justify-center">
                  {src ? <img src={src} alt={item.name} className="w-full h-full object-cover" /> : <span className="text-sm">{item.imageEmoji}</span>}
                </div>
                <span className="font-sans text-[11px] text-bark-600 leading-snug truncate">{item.name}</span>
              </li>
            )
          })}
        </ul>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 mt-auto border-t border-cream-200">
          <span className="font-serif text-2xl text-bark-600">{fmt(total)}</span>
          <Link
            href={`/boxes/${box.slug}`}
            className="bg-bark-600 text-cream-50 font-sans text-[10px] tracking-[0.2em] uppercase px-6 py-3 hover:bg-bark-700 transition-colors"
          >
            View Box →
          </Link>
        </div>
      </div>
    </div>
  )
}

export function PrebuiltBoxesSection() {
  const [boxes, setBoxes] = useState<ResolvedBox[]>([])

  useEffect(() => {
    fetch('/api/boxes?featured=true').then(r => r.json()).then(d => setBoxes(d.boxes ?? [])).catch(() => {})
  }, [])

  if (boxes.length === 0) return null

  return (
    <section className="border-t border-cream-300 py-16 sm:py-20">
      <div className="max-w-5xl mx-auto px-6 sm:px-9 mb-10 flex items-end justify-between">
        <div>
          <p className="font-sans text-[9px] tracking-[0.5em] uppercase text-gold-400 mb-2">Ready-Made</p>
          <h2 className="font-serif text-[2.25rem] sm:text-[3rem] text-bark-600">Curated Gift Sets</h2>
          <p className="font-sans text-xs text-bark-400 mt-2 tracking-wide">Thoughtfully assembled boxes, ready to give.</p>
        </div>
        <Link
          href="/boxes"
          className="hidden sm:inline-block font-sans text-[9px] tracking-[0.2em] uppercase text-bark-400 hover:text-bark-700 transition-colors border-b border-bark-400 pb-0.5"
        >
          View All →
        </Link>
      </div>

      <div className="max-w-5xl mx-auto px-6 sm:px-9 space-y-8">
        {boxes.map((box, i) => (
          <BoxCard key={box.slug} box={box} index={i} />
        ))}
      </div>
    </section>
  )
}
