'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()
  // Swiping the gallery into another variant used to move ONLY this
  // highlight. Everything below the gallery — price, the "what's inside"
  // list, the offer id and the buy panel — is server-rendered from the URL
  // variant, so the page showed one variant's photo and pill above another
  // variant's contents, and Add to box added the one in the URL. Following
  // the swipe with a replace() re-renders all of it from the one source of
  // truth. scroll:false keeps the reader where they are, and the gallery
  // keeps its own position (its start-scroll effect runs on mount only).
  const navigatedTo = useRef(selectedKey)

  // A pill click (or back/forward) changes the URL variant: the gallery then
  // jumps to it and announces it. Resync first so that announcement is seen
  // as "already here" — otherwise it would replace() the same URL again.
  useEffect(() => {
    navigatedTo.current = selectedKey
    setHighlightKey(selectedKey)
  }, [selectedKey])

  useEffect(() => {
    const onGallery = (e: Event) => {
      const key = (e as CustomEvent<{ key?: string }>).detail?.key
      const target = key ? variants.find(v => v.key === key) : undefined
      if (!target) return
      setHighlightKey(target.key)
      if (target.key === navigatedTo.current) return
      navigatedTo.current = target.key
      router.replace(target.href, { scroll: false })
    }
    window.addEventListener(GALLERY_VARIANT_EVENT, onGallery)
    return () => window.removeEventListener(GALLERY_VARIANT_EVENT, onGallery)
  }, [variants, router])

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
