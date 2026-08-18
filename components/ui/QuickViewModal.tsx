'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import type { Product } from '@/types'
import { CATEGORY_LABELS } from '@/lib/products'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

// Strip blanket GOTS wording (scoped cotton claim is the only allowed GOTS mention).
function clean(s?: string | null): string {
  return (s ?? '').replace(/GOTS[-‑\s]*certified\s*/gi, '').replace(/\bGOTS\b[-\s]*/gi, '').replace(/\s{2,}/g, ' ').trim()
}
function formatPrice(cents: number) { return `$${(cents / 100).toFixed(2)}` }

type GalleryImage = { id: string; image_url: string; is_primary: boolean; sort_order: number }

// Lightweight quick-view: lazily loads the product's gallery + copy, shows a
// summary, and links to the full PDP. No cart wiring (add-to-box lives on the PDP).
// a11y: role=dialog / aria-modal, focus trap, ESC / backdrop / route-change close,
// body scroll lock, focus returned to the trigger on close.
export function QuickViewModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const pathname = usePathname()
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const titleId = `qv-title-${product.id}`

  const [gallery, setGallery] = useState<GalleryImage[]>([])
  const [desc, setDesc] = useState(product.description)
  const [loading, setLoading] = useState(true)

  const fallbackSrc = product.image
    ?? (SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/product-images/${product.id}.jpg` : null)

  // Lazy detail fetch on open.
  useEffect(() => {
    let active = true
    setLoading(true)
    fetch(`/api/products/${product.id}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!active || !data) return
        const sorted: GalleryImage[] = [...(data.gallery ?? [])].sort((a: GalleryImage, b: GalleryImage) => {
          if (a.is_primary && !b.is_primary) return -1
          if (!a.is_primary && b.is_primary) return 1
          return a.sort_order - b.sort_order
        })
        setGallery(sorted)
        if (data.product?.description) setDesc(data.product.description)
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [product.id])

  // Close on route change.
  const openedOn = useRef(pathname)
  useEffect(() => { if (pathname !== openedOn.current) onClose() }, [pathname, onClose])

  // Body scroll lock + focus management + focus trap + ESC.
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'
    closeBtnRef.current?.focus()

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab') return
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      )
      if (!focusables || focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      trigger?.focus?.()  // return focus to the triggering card
    }
  }, [onClose])

  const photos = gallery.length > 0 ? gallery.map(g => g.image_url) : fallbackSrc ? [fallbackSrc] : []

  return (
    <div
      className="fixed inset-0 z-[60] bg-bark-800/60 backdrop-blur-sm flex items-center justify-center p-4 lg:p-10"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-white w-full max-w-3xl max-h-[92vh] flex flex-col lg:flex-row lg:overflow-hidden overflow-y-auto relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          ref={closeBtnRef}
          onClick={onClose}
          aria-label="Close quick view"
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center text-bark-400 hover:text-bark-600 transition-colors bg-white/80"
        >
          <X size={16} />
        </button>

        {/* Gallery */}
        <div className="lg:w-[52%] shrink-0 bg-cream-50 p-4 lg:p-5 lg:overflow-y-auto">
          {loading ? (
            <div className="aspect-[4/5] flex items-center justify-center bg-cream-100">
              <div className="w-6 h-6 border-2 border-cream-300 border-t-bark-600 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {(photos.length > 0 ? photos : [null]).map((src, idx) => (
                <div key={idx} className="relative w-full overflow-hidden bg-cream-200" style={{ aspectRatio: '4/5' }}>
                  {src
                    ? <Image src={src} alt={product.name} fill className="object-cover" sizes="(max-width:1023px) 50vw, 26vw" />
                    : <div className="absolute inset-0 flex items-center justify-center text-6xl"><span className="select-none">{product.imageEmoji}</span></div>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 lg:min-h-0 lg:overflow-y-auto p-6 lg:p-8 flex flex-col">
          <p className="font-sans text-[11px] tracking-[0.18em] uppercase text-gold-400 mb-2">
            {CATEGORY_LABELS[product.category]}
          </p>
          <h2 id={titleId} className="font-serif text-2xl lg:text-3xl text-espresso leading-tight mb-2">{product.name}</h2>
          <p className="font-sans text-base text-bark-400 mb-4">{formatPrice(product.price)}</p>
          {product.tag && (
            <span className="inline-block bg-terra-100 text-terra-500 font-sans text-[11px] tracking-[0.14em] uppercase px-3 py-1 mb-4 self-start">
              {product.tag}
            </span>
          )}

          {clean(desc) && (
            <div className="border-t border-cream-300 py-4">
              <p className="text-base text-bark-600 leading-relaxed" style={{ fontFamily: 'var(--font-cormorant)' }}>
                {clean(desc)}
              </p>
            </div>
          )}

          {clean(product.ingredients) && (
            <div className="border-t border-cream-300 py-3.5 flex items-start gap-2">
              <span className="font-sans text-[11px] tracking-[0.14em] uppercase text-bark-400 mt-0.5 shrink-0">Materials</span>
              <span className="font-sans text-xs text-bark-400">{clean(product.ingredients)}</span>
            </div>
          )}

          <div className="mt-auto pt-5">
            <Link
              href={`/products/${product.id}`}
              className="block w-full text-center bg-bark-600 text-cream-50 font-sans text-[11px] tracking-[0.14em] uppercase py-3.5 hover:bg-bark-700 transition-colors"
            >
              View Full Details
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
