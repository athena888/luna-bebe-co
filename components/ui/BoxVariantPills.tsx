'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { GALLERY_VARIANT_EVENT } from '@/components/ui/BoxGallery'

// Variant pills for the box page. The FILLED pill follows whichever variant's
// photo is currently showing in the gallery (BoxGallery announces it via
// pl:box-gallery-variant) — swipe into the Strawberry photos and the
// Strawberry pill lights up. Clicking a pill still navigates to that variant
// (server-rendered price/contents), after which the gallery starts on its
// photos, so the two stay consistent.
export interface VariantPill {
  key: string
  label: string
  /** Display text, e.g. "Strawberry · $74.95" (price preformatted server-side). */
  text: string
  image: string | null
  href: string
}

export function BoxVariantPills({ variants, selectedKey, boxName }: {
  variants: VariantPill[]
  selectedKey: string
  boxName: string
}) {
  const [highlightKey, setHighlightKey] = useState(selectedKey)

  useEffect(() => {
    const onGallery = (e: Event) => {
      const key = (e as CustomEvent<{ key?: string }>).detail?.key
      if (key && variants.some(v => v.key === key)) setHighlightKey(key)
    }
    window.addEventListener(GALLERY_VARIANT_EVENT, onGallery)
    return () => window.removeEventListener(GALLERY_VARIANT_EVENT, onGallery)
  }, [variants])

  return (
    <div className="flex flex-wrap gap-2">
      {variants.map(v => (
        <Link
          key={v.key}
          href={v.href}
          aria-current={v.key === selectedKey ? 'true' : undefined}
          className={`flex items-center gap-2 font-sans text-[11px] tracking-[0.11em] uppercase border transition-colors ${
            v.image ? 'p-1.5 pr-3' : 'px-4 py-2'
          } ${v.key === highlightKey ? 'border-espresso bg-espresso text-cream-50' : 'border-cream-300 text-bark-500 hover:border-espresso-light'}`}
        >
          {v.image && (
            <span className="relative w-9 h-9 shrink-0 overflow-hidden">
              <Image src={v.image} alt={`${boxName} — ${v.label} option`} fill className="object-cover" />
            </span>
          )}
          {v.text}
        </Link>
      ))}
    </div>
  )
}
