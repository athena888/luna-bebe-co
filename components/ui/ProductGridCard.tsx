'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Eye, Leaf } from 'lucide-react'
import type { Product } from '@/types'
import { QuickViewModal } from './QuickViewModal'

// Organic if explicitly flagged, else inferred from tag/ingredients/name.
function isOrganic(p: Product): boolean {
  if (p.organic) return true
  const hay = `${p.tag ?? ''} ${p.ingredients ?? ''} ${p.name ?? ''}`.toLowerCase()
  return hay.includes('organic') || hay.includes('gots')
}

// Collection-grid product card with:
//  · Feature 1 — an optional secondary image: cross-fade on hover/focus (desktop),
//    tap-to-swap with a 2-dot indicator (touch). Graceful when absent.
//  · Feature 2 — a "Quick view" control opening a PDP-linked modal (no cart).
// Interaction layers are siblings (not nested), so no invalid button-in-anchor.
export function ProductGridCard({ product, primarySrc, secondarySrc }: {
  product: Product
  primarySrc: string | null
  secondarySrc?: string | null
}) {
  const [quick, setQuick] = useState(false)
  const [showSecondary, setShowSecondary] = useState(false)   // touch swap state
  const [canHover, setCanHover] = useState(true)
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    setCanHover(window.matchMedia('(hover: hover)').matches)
    setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  const pdp = `/products/${product.id}`
  const hasSecondary = Boolean(secondarySrc)
  const fade = reduceMotion ? '' : 'transition-opacity duration-300'
  // On touch WITH a secondary, tapping the image swaps instead of navigating.
  const imageTapSwaps = !canHover && hasSecondary

  const secondaryOpacity = canHover
    ? 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
    : (showSecondary ? 'opacity-100' : 'opacity-0')

  return (
    <div className="group">
      <div className="relative aspect-[4/5] bg-[#FBF7F0] overflow-hidden border border-cream-200 mb-3">
        {primarySrc ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={primarySrc}
              alt={product.name}
              className={`absolute inset-0 w-full h-full object-cover ${canHover ? 'group-hover:scale-[1.04]' : ''} transition-transform duration-500`}
            />
            {hasSecondary && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={secondarySrc!}
                alt=""
                aria-hidden="true"
                className={`absolute inset-0 w-full h-full object-cover ${fade} ${secondaryOpacity}`}
              />
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl select-none opacity-40">{product.imageEmoji}</span>
          </div>
        )}

        {/* Full-cover interaction layer (below the quick-view button). */}
        {imageTapSwaps ? (
          <button
            type="button"
            onClick={() => setShowSecondary(s => !s)}
            aria-label={`${product.name} — show alternate image`}
            className="absolute inset-0 z-10"
          />
        ) : (
          <Link href={pdp} aria-label={product.name} className="absolute inset-0 z-10" />
        )}

        {/* Organic indicator — leaf + small word, matching the homepage carousel. */}
        {isOrganic(product) && (
          <div className="absolute bottom-2 right-2 z-10 flex flex-col items-center gap-0.5 pointer-events-none">
            <span className="font-sans text-[8px] tracking-[0.18em] uppercase text-white drop-shadow">Organic</span>
            <span className="w-6 h-6 rounded-full pl-round-full bg-sage-500/90 flex items-center justify-center shadow-md"><Leaf size={12} className="text-white" /></span>
          </div>
        )}

        {/* Mobile 2-dot indicator. */}
        {imageTapSwaps && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex gap-1.5 pointer-events-none">
            {[0, 1].map(i => (
              <span key={i} className={`w-1.5 h-1.5 rounded-full pl-round-full ${(showSecondary ? 1 : 0) === i ? 'bg-white' : 'bg-white/50'}`} />
            ))}
          </div>
        )}

        {/* Quick view — reveals on hover (desktop), persistent (touch). */}
        <button
          type="button"
          onClick={() => setQuick(true)}
          aria-label={`Quick view ${product.name}`}
          className={`absolute top-2 right-2 z-20 flex items-center gap-1 bg-white/85 text-bark-600 hover:bg-white font-sans text-[11px] tracking-[0.15em] uppercase px-2 py-1 transition-opacity ${
            canHover ? 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100' : 'opacity-100'
          }`}
        >
          <Eye size={11} /> Quick view
        </button>
      </div>

      {/* Title + price → PDP. */}
      <Link href={pdp} className="block group/info">
        <h3 className="font-serif text-base text-bark-600 leading-snug mb-0.5 group-hover/info:text-bark-800 transition-colors">{product.name}</h3>
        <p className="font-sans text-xs text-bark-400">${(product.price / 100).toFixed(0)}</p>
      </Link>

      {quick && <QuickViewModal product={product} onClose={() => setQuick(false)} />}
    </div>
  )
}
