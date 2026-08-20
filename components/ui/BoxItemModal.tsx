'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'
import { CertBadges } from '@/components/ui/CertBadges'
import { CATEGORY_LABELS, CATEGORY_LABELS_ES, FREE_SHIPPING_THRESHOLD } from '@/lib/products'
import type { ProductCert, CertDef } from '@/lib/certifications'
import type { Product } from '@/types'

type ResolvedCert = ProductCert & Partial<CertDef>

// "What's inside" → product-details modal, the same viewer the Build page
// opens for its catalog: photo gallery (thumb rail + arrows + fullscreen
// zoom + swipe), certifications, materials and description. Read-only — a
// box's contents are fixed, so there is no add/variant UI here.

interface GalleryImage { image_url: string; is_primary: boolean; sort_order: number }

function formatPrice(cents: number) { return `$${(cents / 100).toFixed(2)}` }

// Same GOTS-scoping rule as the Build page and product pages: blanket GOTS
// wording is stripped so the only GOTS claim shown is the badge-backed one.
function cleanGots(s?: string | null): string {
  return (s ?? '')
    .replace(/GOTS[-‑\s]*certified\s*/gi, '')
    .replace(/\bGOTS\b[-\s]*/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

type Item = Pick<Product, 'id' | 'name' | 'price' | 'category'> & {
  image?: string | null
  imageEmoji?: string
  organic?: boolean
}

export function BoxItemModalTrigger({ item, isEs = false, children, className = '' }: {
  item: Item
  isEs?: boolean
  children: React.ReactNode
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [gallery, setGallery] = useState<GalleryImage[]>([])
  const [detail, setDetail] = useState<Product | null>(null)
  const [certs, setCerts] = useState<ResolvedCert[]>([])
  const [esDescription, setEsDescription] = useState<string | null>(null)
  const [idx, setIdx] = useState(0)
  const [zoom, setZoom] = useState(false)
  const fetched = useRef(false)

  function openModal() {
    setOpen(true)
    setIdx(0)
    if (fetched.current) return
    fetched.current = true
    setLoading(true)
    fetch(`/api/products/${item.id}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!d) return
        if (d.product) setDetail(d.product as Product)
        if (Array.isArray(d.product?.certifications)) setCerts(d.product.certifications)
        if (typeof d.esDescription === 'string') setEsDescription(d.esDescription)
        const sorted: GalleryImage[] = [...(d.gallery ?? [])].sort((a: GalleryImage, b: GalleryImage) => {
          if (a.is_primary && !b.is_primary) return -1
          if (!a.is_primary && b.is_primary) return 1
          return a.sort_order - b.sort_order
        })
        setGallery(sorted)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  // Esc closes (zoom first, then the modal); body scroll locks while open.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { if (zoom) setZoom(false); else setOpen(false) }
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, zoom])

  const p = detail ?? (item as Product)
  const photos = gallery.length > 0 ? gallery.map(g => g.image_url) : (item.image ? [item.image] : [])
  const safeIdx = Math.min(idx, Math.max(0, photos.length - 1))
  const mainSrc = photos[safeIdx] ?? null
  const description = (isEs && esDescription) ? esDescription : p.description

  // Swipe on the main photo / zoom view.
  const drag = useRef<{ x: number; y: number } | null>(null)
  const swipe = {
    onPointerDown: (e: React.PointerEvent) => { drag.current = { x: e.clientX, y: e.clientY } },
    onPointerUp: (e: React.PointerEvent) => {
      const start = drag.current
      drag.current = null
      if (!start || photos.length < 2) return
      const dx = e.clientX - start.x
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.clientY - start.y)) {
        setIdx((safeIdx + (dx < 0 ? 1 : -1) + photos.length) % photos.length)
      }
    },
  }

  return (
    <>
      <button type="button" onClick={openModal} className={className} aria-haspopup="dialog" aria-label={`${item.name} — ${isEs ? 'ver detalles' : 'view details'}`}>
        {children}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] bg-bark-800/60 backdrop-blur-sm flex items-center justify-center p-4 lg:p-10"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white w-full max-w-5xl max-h-[92vh] flex flex-col lg:flex-row lg:overflow-hidden overflow-y-auto relative rounded"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center text-bark-400 hover:text-bark-600 transition-colors bg-white/80"
              aria-label={isEs ? 'Cerrar' : 'Close'}
            >
              <X size={16} />
            </button>

            {/* Image panel — thumb rail + one large photo with arrows */}
            <div className="lg:w-[55%] shrink-0 bg-white p-4 lg:p-5">
              {loading && photos.length === 0 ? (
                <div className="aspect-[3/4] flex items-center justify-center bg-cream-100">
                  <div className="w-6 h-6 border-2 border-cream-300 border-t-bark-600 rounded-full animate-spin" />
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3 h-full">
                  {photos.length > 1 && (
                    <div className="order-2 sm:order-1 w-full sm:w-20 shrink-0 flex flex-row sm:flex-col gap-2 overflow-x-auto sm:overflow-x-visible sm:overflow-y-auto scrollbar-hide">
                      {photos.map((src, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setIdx(i)}
                          className={`relative w-14 sm:w-full shrink-0 overflow-hidden bg-cream-100 border transition-colors ${i === safeIdx ? 'border-bark-600' : 'border-transparent hover:border-cream-300'}`}
                          style={{ aspectRatio: '3/4' }}
                          aria-label={`Photo ${i + 1}`}
                        >
                          <Image src={src} alt={`${p.name} — photo ${i + 1}`} fill className="object-cover" sizes="80px" />
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="order-1 sm:order-2 relative flex-1 bg-cream-50 overflow-hidden touch-pan-y select-none" style={{ aspectRatio: '3/4' }} {...swipe}>
                    {mainSrc ? (
                      <button type="button" onClick={() => setZoom(true)} className="absolute inset-0 cursor-zoom-in group">
                        <Image src={mainSrc} alt={p.name} fill className="object-cover" sizes="(max-width:1023px) 90vw, 520px" draggable={false} />
                        <span className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-cream-50/85 text-bark-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <ZoomIn size={13} />
                        </span>
                      </button>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-7xl"><span className="select-none">{item.imageEmoji}</span></div>
                    )}
                    {photos.length > 1 && (
                      <>
                        <button type="button" onClick={() => setIdx((safeIdx - 1 + photos.length) % photos.length)} className="absolute left-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-white/90 drop-shadow-md hover:text-white transition-colors" aria-label="Previous photo">
                          <ChevronLeft size={26} strokeWidth={1.5} />
                        </button>
                        <button type="button" onClick={() => setIdx((safeIdx + 1) % photos.length)} className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-white/90 drop-shadow-md hover:text-white transition-colors" aria-label="Next photo">
                          <ChevronRight size={26} strokeWidth={1.5} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Product info */}
            <div className="flex-1 lg:min-h-0 lg:overflow-y-auto p-6 lg:p-8 flex flex-col">
              <p className="font-sans text-[11px] tracking-[0.18em] uppercase text-gold-400 mb-2">{(isEs ? CATEGORY_LABELS_ES : CATEGORY_LABELS)[p.category]}</p>
              <h2 className="font-sans text-2xl lg:text-3xl text-espresso leading-tight mb-2">{p.name}</h2>
              <p className="font-sans text-base text-bark-400 mb-4">{formatPrice(p.price)}</p>

              <div className="border-t border-cream-300 py-4">
                {(certs.length > 0 || p.organic) ? (
                  <CertBadges certs={certs} organic={p.organic} />
                ) : (
                  <div className="flex items-start justify-between">
                    {[{ label: isEs ? 'Envío gratis' : 'Free Shipping', sub: `$${Math.round(FREE_SHIPPING_THRESHOLD / 100)}+` }, { label: isEs ? 'Hecho a mano' : 'Handcrafted', sub: isEs ? 'con cariño' : 'with care' }, { label: isEs ? 'Listo para regalar' : 'Gift Ready', sub: isEs ? 'bien empacado' : 'carefully packed' }].map(({ label, sub }) => (
                      <div key={label} className="flex-1 text-center">
                        <p className="font-sans text-[11px] tracking-[0.14em] uppercase text-bark-600">{label}</p>
                        <p className="font-sans text-[11px] tracking-[0.14em] uppercase text-bark-400">{sub}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {p.ingredients && (
                <div className="border-t border-cream-300 py-3.5 mb-0.5 flex items-start gap-2">
                  <span className="font-sans text-[11px] tracking-[0.14em] uppercase text-bark-400 mt-0.5 shrink-0">{isEs ? 'Materiales' : 'Materials'}</span>
                  <span className="font-sans text-xs text-bark-400">{cleanGots(p.ingredients)}</span>
                </div>
              )}

              {description && (
                <div className="border-t border-cream-300 pt-4">
                  <p className="font-sans text-sm text-bark-500 leading-relaxed whitespace-pre-line">{cleanGots(description)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Fullscreen zoom over the modal */}
          {zoom && mainSrc && (
            <div className="fixed inset-0 z-[80] bg-bark-800/95 flex flex-col" onClick={e => { e.stopPropagation(); setZoom(false) }}>
              <div className="flex justify-end px-4 py-3 shrink-0">
                <button type="button" onClick={() => setZoom(false)} aria-label={isEs ? 'Cerrar' : 'Close'} className="text-cream-100 hover:text-white transition-colors p-2 -m-2">
                  <X size={22} />
                </button>
              </div>
              <div className="relative flex-1 min-h-0 touch-pan-y select-none" onClick={e => e.stopPropagation()} {...swipe}>
                <Image src={mainSrc} alt={p.name} fill className="object-contain" sizes="100vw" draggable={false} priority />
                {photos.length > 1 && (
                  <>
                    <button type="button" onClick={() => setIdx((safeIdx - 1 + photos.length) % photos.length)} className="absolute left-2 top-1/2 -translate-y-1/2 text-cream-100/90 hover:text-white bg-bark-800/40 hover:bg-bark-800/70 p-2 transition-colors" aria-label="Previous photo">
                      <ChevronLeft size={26} />
                    </button>
                    <button type="button" onClick={() => setIdx((safeIdx + 1) % photos.length)} className="absolute right-2 top-1/2 -translate-y-1/2 text-cream-100/90 hover:text-white bg-bark-800/40 hover:bg-bark-800/70 p-2 transition-colors" aria-label="Next photo">
                      <ChevronRight size={26} />
                    </button>
                  </>
                )}
              </div>
              {photos.length > 1 && (
                <div className="text-center py-3 shrink-0">
                  <span className="font-sans text-[12px] text-cream-200/80">{safeIdx + 1} / {photos.length}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  )
}
