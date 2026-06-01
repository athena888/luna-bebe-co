'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Loader, Settings, Package } from 'lucide-react'
import type { ResolvedBox } from '@/lib/prebuilt-boxes-db'

function fmt(cents?: number) { return cents != null ? `$${(cents / 100).toFixed(0)}` : '—' }

export default function BoxesPortalPage() {
  const [boxes, setBoxes] = useState<ResolvedBox[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/portal/boxes')
      const data = await res.json()
      setBoxes(data.boxes ?? [])
    } catch { setBoxes([]) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-bark-600">Prebuilt Boxes</h1>
        <p className="font-sans text-sm text-bark-400 mt-1">Edit a box&apos;s details and swap the products in each slot.</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 font-sans text-sm text-bark-400 py-12">
          <Loader size={16} className="animate-spin" /> Loading boxes…
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {boxes.map(box => {
            const itemCount = Object.values(box.selection).filter(Boolean).length
            return (
              <Link
                key={box.slug}
                href={`/portal/boxes/${box.slug}`}
                className="bg-white border border-cream-300 rounded-xl overflow-hidden hover:border-bark-300 transition-colors group"
              >
                <div className="relative aspect-[4/3] bg-cream-200">
                  {box.image
                    ? <Image src={box.image} alt={box.name} fill className="object-cover" unoptimized />
                    : <div className="absolute inset-0 flex items-center justify-center text-bark-300"><Package size={28} /></div>}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="font-serif text-lg text-bark-600">{box.name}</h2>
                    <Settings size={14} className="text-bark-400 group-hover:text-bark-600 transition-colors" />
                  </div>
                  <p className="font-sans text-[10px] tracking-[0.15em] uppercase text-bark-400 capitalize">{box.style} · {box.variant}</p>
                  <p className="font-sans text-xs text-bark-400 mt-2">{itemCount}/7 items · {fmt(box.customPrice)}</p>
                  {!box.active && <p className="font-sans text-[10px] text-red-400 mt-1">Hidden</p>}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
