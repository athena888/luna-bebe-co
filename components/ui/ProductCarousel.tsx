'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, X, ShoppingBag, Leaf, ZoomIn } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Product } from '@/types'
import type { ProductCert, CertDef } from '@/lib/certifications'
import { CATEGORY_LABELS } from '@/lib/products'
import { CertBadges, isGots } from '@/components/ui/CertBadges'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

// Strip blanket GOTS wording so the scoped cotton claim is the only GOTS mention.
function clean(s?: string | null): string {
  return (s ?? '').replace(/GOTS[-‑\s]*certified\s*/gi, '').replace(/\bGOTS\b[-\s]*/gi, '').replace(/\s{2,}/g, ' ').trim()
}
const CLONES = 3

type GalleryImage = {
  id: string
  image_url: string
  label: string | null
  is_primary: boolean
  sort_order: number
}

type VariantOpt = {
  color: string
  color_hex: string | null
  size: string
  quantity: number
}

type ResolvedCert = ProductCert & Partial<CertDef>

// Phase 0: carousel-specific override → phase 1: product photo → phase 2: emoji
function getImgSrc(p: Product, phase: number): string | null {
  if (p.image) return p.image
  if (!SUPABASE_URL) return null
  if (phase === 0) return `${SUPABASE_URL}/storage/v1/object/public/home-images/carousel-${p.id}.jpg`
  if (phase === 1) return `${SUPABASE_URL}/storage/v1/object/public/product-images/${p.id}.jpg`
  return null
}

function formatPrice(cents: number) { return `$${(cents / 100).toFixed(2)}` }

// Organic if explicitly flagged by the admin, else inferred from tag/ingredients/name
function isOrganic(p: Product): boolean {
  if (p.organic) return true
  const hay = `${p.tag ?? ''} ${p.ingredients ?? ''} ${p.name ?? ''}`.toLowerCase()
  return hay.includes('organic') || hay.includes('gots')
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function ProductModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const router = useRouter()
  const [gallery, setGallery] = useState<GalleryImage[]>([])
  const [variants, setVariants] = useState<VariantOpt[]>([])
  const [certs, setCerts] = useState<ResolvedCert[]>([])
  const [pickColor, setPickColor] = useState<string | null>(null)
  const [pickSize, setPickSize] = useState<string | null>(null)
  const [desc, setDesc] = useState(product.description)
  const [ingredients, setIngredients] = useState(product.ingredients)
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState<string | null>(null)

  const fallbackSrc = SUPABASE_URL
    ? `${SUPABASE_URL}/storage/v1/object/public/product-images/${product.id}.jpg`
    : product.image ?? null

  useEffect(() => {
    let active = true
    setLoading(true)
    fetch(`/api/products/${product.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!active || !data) return
        const sorted: GalleryImage[] = [...(data.gallery ?? [])].sort((a: GalleryImage, b: GalleryImage) => {
          if (a.is_primary && !b.is_primary) return -1
          if (!a.is_primary && b.is_primary) return 1
          return a.sort_order - b.sort_order
        })
        setGallery(sorted)
        if (Array.isArray(data.variants)) setVariants(data.variants)
        if (Array.isArray(data.product?.certifications)) setCerts(data.product.certifications)
        if (data.product?.description) setDesc(data.product.description)
        if (data.product?.ingredients !== undefined) setIngredients(data.product.ingredients ?? undefined)
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [product.id])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { if (lightbox) setLightbox(null); else onClose() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, lightbox])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const photos = gallery.length > 0 ? gallery.map(g => g.image_url) : fallbackSrc ? [fallbackSrc] : []

  const hasVariants = variants.length > 0
  const colors = useMemo(() => {
    const m = new Map<string, string | null>()
    variants.forEach(v => { if (!m.has(v.color)) m.set(v.color, v.color_hex) })
    return Array.from(m.entries()).map(([color, color_hex]) => ({ color, color_hex }))
  }, [variants])
  const sizesForColor = pickColor ? variants.filter(v => v.color === pickColor) : []

  function handleAddToBox() {
    sessionStorage.setItem('pl_pending_add', product.id)
    onClose()
    router.push('/build')
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-bark-800/60 backdrop-blur-sm flex items-center justify-center p-4 lg:p-10"
        onClick={onClose}
      >
        <div
          className="bg-white w-full max-w-4xl max-h-[92vh] flex flex-col lg:flex-row lg:overflow-hidden overflow-y-auto relative"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center text-bark-400 hover:text-bark-600 transition-colors bg-white/80"
          >
            <X size={16} />
          </button>

          {/* Image panel — 2-col grid, same as build page modal */}
          <div className="lg:w-[55%] shrink-0 bg-cream-50 p-4 lg:p-5 lg:overflow-y-auto">
            {loading ? (
              <div className="aspect-[3/4] flex items-center justify-center bg-cream-100">
                <div className="w-6 h-6 border-2 border-cream-300 border-t-bark-600 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {(photos.length > 0 ? photos : [null]).map((src, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => src && setLightbox(src)}
                    disabled={!src}
                    className="group relative w-full overflow-hidden bg-cream-200 cursor-zoom-in disabled:cursor-default"
                    style={{ aspectRatio: '3/4' }}
                  >
                    {src
                      ? <Image src={src} alt={product.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width:1023px) 50vw, 28vw" unoptimized />
                      : <div className="absolute inset-0 flex items-center justify-center text-7xl"><span className="select-none">{product.imageEmoji}</span></div>}
                    {src && (
                      <span className="absolute bottom-2 right-2 w-7 h-7 bg-cream-50/85 text-bark-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <ZoomIn size={13} />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info panel */}
          <div className="flex-1 lg:min-h-0 lg:overflow-y-auto p-6 lg:p-8 flex flex-col">
            <p className="font-sans text-[10px] tracking-[0.35em] uppercase text-gold-400 mb-2">
              {CATEGORY_LABELS[product.category]}
            </p>
            <h2 className="font-sans text-2xl lg:text-3xl text-espresso leading-tight mb-2">{product.name}</h2>
            <p className="font-sans text-base text-bark-400 mb-4">{formatPrice(product.price)}</p>
            {product.tag && (
              <span className="inline-block bg-terra-100 text-terra-500 font-sans text-[9px] tracking-[0.2em] uppercase px-3 py-1 mb-4 self-start">
                {product.tag}
              </span>
            )}

            {/* Description */}
            <div className="border-t border-cream-300 py-3.5">
              <p className="text-base text-bark-600 leading-relaxed" style={{ fontFamily: 'var(--font-cormorant)' }}>
                {clean(desc)}
              </p>
            </div>

            {/* Cert badges — below the description */}
            <div className="border-t border-cream-300 py-4">
              {(certs.length > 0 || product.organic) ? (
                <CertBadges certs={certs} organic={product.organic} />
              ) : (
                <div className="flex items-start justify-between">
                  {[{ label: 'Free Shipping', sub: '$150+' }, { label: 'Handcrafted', sub: 'with care' }, { label: 'Gift Ready', sub: 'wax seal' }].map(({ label, sub }) => (
                    <div key={label} className="flex-1 text-center">
                      <p className="font-sans text-[9px] tracking-[0.2em] uppercase text-bark-600">{label}</p>
                      <p className="font-sans text-[9px] tracking-[0.2em] uppercase text-bark-400">{sub}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {ingredients && (
              <div className="border-t border-cream-300 py-3.5 flex items-start gap-2">
                <span className="font-sans text-[9px] tracking-[0.2em] uppercase text-bark-400 mt-0.5 shrink-0">Materials</span>
                <span className="font-sans text-xs text-bark-400">{clean(ingredients)}</span>
              </div>
            )}

            {certs.some(isGots) && (
              <div className="border-t border-cream-300 py-3.5 flex items-start gap-2">
                <span className="font-sans text-[9px] tracking-[0.2em] uppercase text-bark-400 mt-0.5 shrink-0">Cotton</span>
                <span className="font-sans text-xs text-bark-400">Made with <span className="text-bark-600">GOTS-certified organic cotton</span> from a GOTS-certified manufacturer.</span>
              </div>
            )}

            {/* Variant picker */}
            {hasVariants && (
              <div className="border-t border-cream-300 pt-4 mb-4 space-y-3">
                <div>
                  <p className="font-sans text-[9px] tracking-[0.25em] uppercase text-bark-400 mb-2">
                    Color{pickColor ? <span className="text-bark-600 capitalize">: {pickColor}</span> : ''}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {colors.map(({ color, color_hex }) => {
                      const inStock = variants.some(v => v.color === color && v.quantity > 0)
                      const active = pickColor === color
                      return (
                        <button
                          key={color}
                          onClick={() => { setPickColor(color); setPickSize(null) }}
                          disabled={!inStock}
                          title={color}
                          className={`pl-swatch w-8 h-8 border-2 transition-all disabled:opacity-30 ${active ? 'border-bark-600 scale-110' : 'border-cream-300 hover:border-bark-400'}`}
                          style={{ backgroundColor: color_hex || '#e5e0d8' }}
                        />
                      )
                    })}
                  </div>
                </div>
                {pickColor && (
                  <div>
                    <p className="font-sans text-[9px] tracking-[0.25em] uppercase text-bark-400 mb-2">Size</p>
                    <div className="flex flex-wrap gap-2">
                      {sizesForColor.map(v => (
                        <button
                          key={v.size}
                          onClick={() => setPickSize(v.size)}
                          disabled={v.quantity <= 0}
                          className={`border px-3 py-2 font-sans text-xs transition-colors disabled:opacity-40 disabled:line-through ${
                            pickSize === v.size ? 'border-bark-600 bg-bark-600 text-cream-50' : 'border-cream-300 text-bark-600 hover:border-bark-400'
                          }`}
                        >
                          {v.size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-auto pt-4 space-y-2.5">
              <button
                onClick={handleAddToBox}
                className="w-full bg-bark-600 text-cream-50 font-sans text-[11px] tracking-[0.2em] uppercase py-3.5 hover:bg-bark-700 transition-colors flex items-center justify-center gap-2"
              >
                <ShoppingBag size={14} />
                Add to Box
              </button>
              <Link
                href={`/products/${product.id}`}
                className="block w-full text-center border border-cream-300 text-bark-500 font-sans text-[11px] tracking-[0.2em] uppercase py-3 hover:border-bark-400 hover:text-bark-700 transition-colors"
              >
                View Full Details
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[70] bg-bark-900/90 backdrop-blur-sm flex items-center justify-center p-4 sm:p-10 cursor-zoom-out"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" className="max-h-[92vh] max-w-[92vw] w-auto h-auto object-contain shadow-2xl" />
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center text-cream-50/80 hover:text-cream-50 bg-bark-900/40 rounded-full"
          >
            <X size={20} />
          </button>
        </div>
      )}
    </>
  )
}

// ─── Carousel ────────────────────────────────────────────────────────────────

export function ProductCarousel({ products }: { products: Product[] }) {
  const n = products.length
  const cloneN = n >= 2 ? CLONES : 0

  const allItems = useMemo(() => {
    if (cloneN === 0) return products
    return [...products.slice(-cloneN), ...products, ...products.slice(0, cloneN)]
  }, [products, cloneN])

  const [centeredIdx, setCenteredIdx] = useState(cloneN)
  const centeredIdxRef = useRef(cloneN)
  const [modal, setModal] = useState<Product | null>(null)
  // imgPhase: 0=try carousel override, 1=try product photo, 2=show emoji
  const [imgPhase, setImgPhase] = useState<Record<string, number>>({})

  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isJumping = useRef(false)

  function setIdx(i: number) {
    centeredIdxRef.current = i
    setCenteredIdx(i)
  }

  function scrollToNow(idx: number) {
    const container = containerRef.current
    const el = itemRefs.current[idx]
    if (!container || !el) return
    const target = el.offsetLeft - (container.clientWidth - el.offsetWidth) / 2
    container.scrollLeft = Math.max(0, target)
  }

  function scrollTo(idx: number) {
    const container = containerRef.current
    const el = itemRefs.current[idx]
    if (!container || !el) return
    const target = el.offsetLeft - (container.clientWidth - el.offsetWidth) / 2
    container.scrollTo({ left: Math.max(0, target), behavior: 'smooth' })
  }

  const updateCentered = useCallback(() => {
    if (isJumping.current) return
    const container = containerRef.current
    if (!container) return
    const mid = container.scrollLeft + container.clientWidth / 2
    let best = 0, bestDist = Infinity
    itemRefs.current.forEach((el, i) => {
      if (!el) return
      const dist = Math.abs(el.offsetLeft + el.offsetWidth / 2 - mid)
      if (dist < bestDist) { bestDist = dist; best = i }
    })
    setIdx(best)
  }, [])

  function handleScroll() {
    if (isJumping.current) return
    updateCentered()
    if (scrollTimer.current) clearTimeout(scrollTimer.current)
    scrollTimer.current = setTimeout(() => {
      const cur = centeredIdxRef.current
      const realEnd = cloneN + n - 1
      if (cloneN === 0) return
      if (cur < cloneN) {
        const target = cloneN + n - (cloneN - cur)
        isJumping.current = true
        scrollToNow(target)
        setIdx(target)
        requestAnimationFrame(() => { isJumping.current = false })
      } else if (cur > realEnd) {
        const target = cloneN + (cur - realEnd - 1)
        isJumping.current = true
        scrollToNow(target)
        setIdx(target)
        requestAnimationFrame(() => { isJumping.current = false })
      }
    }, 150)
  }

  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return
      if (i === centeredIdx) v.play().catch(() => {})
      else { v.pause(); v.currentTime = 0 }
    })
  }, [centeredIdx])

  useEffect(() => {
    setTimeout(() => { scrollToNow(cloneN); setIdx(cloneN) }, 80)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function goNext() { scrollTo(centeredIdxRef.current + 1) }
  function goPrev() { scrollTo(centeredIdxRef.current - 1) }

  const dotIdx = cloneN > 0 ? ((centeredIdx - cloneN) % n + n) % n : centeredIdx

  return (
    <>
      <div className="relative select-none">
        <button
          onClick={goPrev}
          className="absolute left-2 sm:left-4 top-[40%] -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/90 shadow-md flex items-center justify-center text-bark-600 hover:bg-white transition-all"
        >
          <ChevronLeft size={18} />
        </button>

        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex overflow-x-auto pb-2"
          style={{
            gap: '12px',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
            // Centers first/last items properly at all viewport widths
            paddingLeft: 'max(8px, calc(50vw - min(36vw, 155px)))',
            paddingRight: 'max(8px, calc(50vw - min(36vw, 155px)))',
          }}
        >
          {allItems.map((product, idx) => {
            const isCenter = idx === centeredIdx
            const phaseKey = `${product.id}_${idx}`
            const phase = imgPhase[phaseKey] ?? 0
            const src = getImgSrc(product, phase)

            return (
              <div
                key={idx}
                ref={el => { itemRefs.current[idx] = el }}
                style={{
                  scrollSnapAlign: 'center',
                  width: 'min(72vw, 310px)',
                  flexShrink: 0,
                  transition: 'transform 0.4s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.4s ease',
                  transform: isCenter ? 'scale(1)' : 'scale(0.86)',
                  opacity: isCenter ? 1 : 0.5,
                }}
                onClick={() => isCenter ? setModal(product) : scrollTo(idx)}
                className="cursor-pointer"
              >
                <div className="relative w-full overflow-hidden" style={{ aspectRatio: '3/4' }}>
                  {product.hoverVideo ? (
                    <video
                      ref={el => { videoRefs.current[idx] = el }}
                      src={product.hoverVideo}
                      muted loop playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : src ? (
                    <div className="w-full h-full relative overflow-hidden">
                      <Image
                        src={src}
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 80vw, 420px"
                        unoptimized
                        className={`object-cover transition-transform duration-[8000ms] ease-in-out ${isCenter ? 'scale-110' : 'scale-100'}`}
                                               onError={() => setImgPhase(p => ({ ...p, [phaseKey]: (p[phaseKey] ?? 0) + 1 }))}
                      />
                    </div>
                  ) : (
                    <div
                      className="w-full h-full bg-white flex items-center justify-center"
                      style={{ fontSize: 'clamp(3rem,12vw,5rem)' }}
                    >
                      {product.imageEmoji}
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent pointer-events-none" />

                  {product.tag && (
                    <div className="absolute top-3 left-3">
                      <span className="font-sans text-[9px] tracking-[0.15em] uppercase bg-gold-400/30 backdrop-blur-sm text-gold-100 px-2 py-0.5">
                        {product.tag}
                      </span>
                    </div>
                  )}

                  {isOrganic(product) && (
                    <div className="absolute bottom-3 right-3 flex flex-col items-center gap-0.5 pointer-events-none">
                      <span className="font-sans text-[8px] tracking-[0.18em] uppercase text-white drop-shadow">Organic</span>
                      <span className="w-7 h-7 rounded-full pl-round-full bg-sage-500/90 backdrop-blur-sm flex items-center justify-center shadow-md">
                        <Leaf size={14} className="text-white" />
                      </span>
                    </div>
                  )}

                  <div className="absolute bottom-0 inset-x-0 p-4 pointer-events-none">
                    <p className="font-sans text-sm font-medium text-white leading-snug drop-shadow">{product.name}</p>
                    <p className="font-sans text-xs text-white/65">{formatPrice(product.price)}</p>
                  </div>
                </div>

                <div className={`text-center mt-2 transition-opacity duration-300 ${isCenter ? 'opacity-100' : 'opacity-0'}`}>
                  <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400">
                    Tap to view details
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        <button
          onClick={goNext}
          className="absolute right-2 sm:right-4 top-[40%] -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/90 shadow-md flex items-center justify-center text-bark-600 hover:bg-white transition-all"
        >
          <ChevronRight size={18} />
        </button>

        {/* Small gray dots */}
        <div className="flex justify-center gap-1.5 mt-4">
          {products.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(cloneN + i)}
              className={`rounded-full transition-all duration-300 ${
                i === dotIdx
                  ? 'w-2 h-2 bg-bark-400'
                  : 'w-1.5 h-1.5 bg-bark-200 hover:bg-bark-300'
              }`}
            />
          ))}
        </div>
      </div>

      {modal && <ProductModal product={modal} onClose={() => setModal(null)} />}
    </>
  )
}
