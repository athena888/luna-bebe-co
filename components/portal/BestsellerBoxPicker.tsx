'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader } from 'lucide-react'

// Homepage Best Sellers picker — VARIANT-level (Emily: "variant picker, not
// section picker"), living in the Homepage tab so curation happens where the
// homepage is managed. Picks are stored as "slug:variantKey" in
// site_content.home.bestseller_boxes; with none picked, all live boxes show.

interface Variant { product_slug: string; key: string; label: string; price: number; images: string[]; active: boolean }
interface P { slug: string; name: string; active: boolean; visible: boolean }

export function BestsellerBoxPicker() {
  const [products, setProducts] = useState<P[]>([])
  const [variants, setVariants] = useState<Variant[]>([])
  const [picks, setPicks] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    fetch('/api/portal/catalog').then(r => r.json()).then(d => {
      setProducts((d.products ?? []).filter((p: P) => p.active && p.visible))
      setVariants(d.variants ?? [])
      setPicks(Array.isArray(d.bestsellers) ? d.bestsellers : [])
    }).finally(() => setLoading(false))
  }, [])
  useEffect(load, [load])

  async function toggle(pick: string) {
    const r = await fetch('/api/portal/catalog', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle-bestseller', slug: pick }),
    })
    const d = await r.json()
    if (Array.isArray(d.bestsellers)) setPicks(d.bestsellers)
  }

  if (loading) return <div className="p-8 font-sans text-sm text-bark-400 flex items-center gap-2"><Loader size={14} className="animate-spin" /> Loading boxes…</div>

  return (
    <div className="p-4 sm:p-8 pt-2">
      <h2 className="font-serif text-xl text-bark-600 mb-1">Homepage Best Sellers</h2>
      <p className="font-sans text-xs text-bark-400 mb-4">
        Star the exact versions to feature on the homepage — each starred pick shows with its own photo and price and links straight to that version.
        With nothing starred, all live boxes show. {picks.length > 0 && <span className="text-sage-700">{picks.length} starred.</span>}
      </p>
      <div className="space-y-4">
        {products.map(p => (
          <div key={p.slug} className="bg-white border border-cream-300 rounded-xl p-4">
            <p className="font-sans text-sm font-medium text-bark-600 mb-2.5">{p.name}</p>
            <div className="flex flex-wrap gap-2.5">
              {variants.filter(v => v.product_slug === p.slug && v.active).map(v => {
                const pick = `${p.slug}:${v.key}`
                const on = picks.includes(pick) || picks.includes(p.slug)
                return (
                  <button key={v.key} onClick={() => toggle(pick)}
                    className={`flex items-center gap-2 border rounded-lg p-1.5 pr-3 transition-colors ${on ? 'border-[#7A8E7C] bg-sage-50' : 'border-cream-300 hover:border-bark-400'}`}>
                    {v.images[0]
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={v.images[0]} alt="" className="w-10 h-[52px] object-cover rounded" />
                      : <span className="w-10 h-[52px] rounded border border-dashed border-cream-300" />}
                    <span className="text-left">
                      <span className="block font-sans text-xs text-bark-600">{on ? '★ ' : '☆ '}{v.label}</span>
                      <span className="block font-sans text-[11px] text-bark-400">${(v.price / 100).toFixed(0)}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
