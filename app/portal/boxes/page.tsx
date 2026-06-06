'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Loader, Settings, Package, Eye, EyeOff } from 'lucide-react'
import type { ResolvedBox } from '@/lib/prebuilt-boxes-db'

function fmt(cents?: number) { return cents != null ? `$${(cents / 100).toFixed(0)}` : '—' }

export default function BoxesPortalPage() {
  const [boxes, setBoxes] = useState<ResolvedBox[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

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

  async function toggleActive(slug: string, next: boolean) {
    setBusy(slug)
    // optimistic
    setBoxes(prev => prev.map(b => b.slug === slug ? { ...b, active: next } : b))
    try {
      await fetch(`/api/portal/boxes/${slug}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: next }),
      })
    } finally { setBusy(null) }
  }

  // Group by season (style) so each edition reads as its own section
  const groups = Array.from(new Set(boxes.map(b => b.style)))
    .map(style => ({ style, items: boxes.filter(b => b.style === style) }))

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-bark-600">Prebuilt Boxes</h1>
        <p className="font-sans text-sm text-bark-400 mt-1">Edit a box&apos;s details, swap products, and toggle whether each box shows on the site.</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 font-sans text-sm text-bark-400 py-12">
          <Loader size={16} className="animate-spin" /> Loading boxes…
        </div>
      ) : (
        <div className="space-y-10">
          {groups.map(({ style, items }) => (
            <div key={style}>
              <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark-400 mb-4 pb-2 border-b border-cream-300">{style} Edition</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {items.map(box => {
                  const itemCount = Object.values(box.selection).filter(Boolean).length
                  return (
                    <div key={box.slug} className={`bg-white border rounded-xl overflow-hidden transition-colors ${box.active ? 'border-cream-300' : 'border-cream-300 opacity-70'}`}>
                      <Link href={`/portal/boxes/${box.slug}`} className="block group">
                        <div className="relative aspect-[4/3] bg-cream-200">
                          {box.image
                            ? <Image src={box.image} alt={box.name} fill className="object-cover" unoptimized />
                            : <div className="absolute inset-0 flex items-center justify-center text-bark-300"><Package size={28} /></div>}
                          {!box.active && <span className="absolute top-2 left-2 bg-bark-600/85 text-white text-[9px] tracking-[0.1em] uppercase px-2 py-0.5 rounded">Hidden</span>}
                        </div>
                        <div className="p-4 pb-2">
                          <div className="flex items-center justify-between mb-1">
                            <h2 className="font-serif text-lg text-bark-600">{box.name}</h2>
                            <Settings size={14} className="text-bark-400 group-hover:text-bark-600 transition-colors" />
                          </div>
                          <p className="font-sans text-[10px] tracking-[0.15em] uppercase text-bark-400 capitalize">{box.style} · {box.variant}</p>
                          <p className="font-sans text-xs text-bark-400 mt-2">{itemCount}/7 items · {fmt(box.customPrice)}</p>
                        </div>
                      </Link>
                      <div className="px-4 pb-4">
                        <button
                          onClick={() => toggleActive(box.slug, !box.active)}
                          disabled={busy === box.slug}
                          className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg font-sans text-[10px] tracking-[0.15em] uppercase transition-colors disabled:opacity-50 ${
                            box.active ? 'border border-cream-300 text-bark-500 hover:border-bark-400' : 'bg-bark-600 text-white hover:bg-bark-700'
                          }`}
                        >
                          {busy === box.slug ? <Loader size={12} className="animate-spin" /> : box.active ? <EyeOff size={12} /> : <Eye size={12} />}
                          {box.active ? 'Shown — hide' : 'Hidden — show'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
