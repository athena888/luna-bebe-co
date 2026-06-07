'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { ResolvedBox } from '@/lib/prebuilt-boxes-db'
import { BOX_BASE_PRICE } from '@/lib/products'
import { ChevronDown } from 'lucide-react'
import { useState, useEffect } from 'react'

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(0)}`
}

function BoxCard({ box }: { box: ResolvedBox }) {
  const [expanded, setExpanded] = useState(false)
  const items = box.items
  const total = box.customPrice ?? (BOX_BASE_PRICE + items.reduce((s, p) => s + (p?.price ?? 0), 0))

  return (
    <div className="bg-cream-50 border border-cream-300 rounded-xl overflow-hidden hover:border-gold-300 transition-colors">
      {/* Image */}
      {box.image && (
        <div className="relative w-full aspect-square bg-cream-200 overflow-hidden">
          <Image
            src={box.image}
            alt={box.name}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        <p className="font-sans text-[9px] tracking-[0.4em] uppercase text-gold-400 mb-2">{box.style}</p>
        <h3 className="font-serif text-2xl text-bark-600 mb-1">{box.name}</h3>
        <p className="font-cormorant text-base italic text-bark-400 mb-3 leading-snug">{box.tagline}</p>
        <p className="font-sans text-[9px] tracking-[0.15em] text-bark-300 mb-4">{box.aesthetic}</p>

        {/* Items list with expand */}
        <div className="mb-6">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between py-2 hover:bg-cream-100 rounded transition-colors"
          >
            <span className="font-sans text-[9px] tracking-[0.2em] uppercase text-bark-600">Items included</span>
            <ChevronDown
              size={14}
              className={`text-bark-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </button>

          {expanded && (
            <ul className="space-y-2 mt-2 pt-2 border-t border-cream-200">
              {items.map(item => (
                <li key={item.id} className="flex items-start gap-2.5">
                  <span className="w-3 h-px bg-gold-300 shrink-0 mt-1.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-sans text-[10px] text-bark-500 tracking-wide font-medium">{item.name}</p>
                    <p className="font-sans text-[9px] text-bark-400">{item.ingredients}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-cream-200">
          <span className="font-serif text-xl text-bark-600">{fmt(total)}</span>
          <Link
            href={`/boxes/${box.slug}`}
            className="font-sans text-[9px] tracking-[0.2em] uppercase text-bark-400 hover:text-bark-600 transition-colors"
          >
            View Details →
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
    <section className="border-t border-cream-300 py-16">
      <div className="pl-6 sm:pl-9 pr-6 mb-10 flex items-end justify-between">
        <div>
          <p className="font-sans text-[9px] tracking-[0.5em] uppercase text-gold-400 mb-2">Summer Collection</p>
          <h2 className="font-serif text-[2.25rem] sm:text-[3rem] text-bark-600">Curated Gift Sets</h2>
          <p className="font-sans text-xs text-bark-400 mt-2 tracking-wide">Three thoughtfully assembled boxes, ready to give.</p>
        </div>
        <Link
          href="/boxes"
          className="hidden sm:inline-block font-sans text-[9px] tracking-[0.2em] uppercase text-bark-400 hover:text-bark-700 transition-colors border-b border-bark-400 pb-0.5"
        >
          View All →
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-6 sm:px-9">
        {boxes.map((box) => (
          <BoxCard key={box.slug} box={box} />
        ))}
      </div>
    </section>
  )
}
