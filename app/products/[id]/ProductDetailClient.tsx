'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useIsEs } from '@/lib/use-is-es'
import { localePath } from '@/lib/locale-routes'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronDown, X, ChevronLeft, ChevronRight, Leaf } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { CATEGORY_LABELS, CATEGORY_LABELS_ES, FREE_SHIPPING_THRESHOLD } from '@/lib/products'
import { trackViewItem, oncePerKey } from '@/lib/analytics-events'
import { RelatedProducts, type RelatedItem } from '@/components/ui/RelatedProducts'
import { ReviewSection } from '@/components/ui/ReviewSection'
import { CertBadges } from '@/components/ui/CertBadges'
import { DeliveryEstimate } from '@/components/ui/DeliveryEstimate'
import type { Product } from '@/types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

interface GalleryImage {
  id: string
  product_id: string
  image_url: string
  label: string | null
  is_primary: boolean
  sort_order: number
}

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

// Strip blanket GOTS wording from owner/AI copy so the only GOTS claim shown is
// the scoped, substantiated line below. "100% GOTS Organic Cotton" → "100%
// Organic Cotton"; "GOTS-certified cotton" → "cotton".
function clean(s?: string | null): string {
  return (s ?? '')
    .replace(/GOTS[-‑\s]*certified\s*/gi, '')
    .replace(/\bGOTS\b[-\s]*/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}
// The GOTS-cotton claim shows only when the GOTS certification is attached to
// the product (controlled in the admin Certifications section).
function hasGotsCert(p: { certifications?: Array<{ key?: string; name?: string }> } | null): boolean {
  return (p?.certifications ?? []).some(c => /gots|global organic textile/i.test(`${c.key ?? ''} ${c.name ?? ''}`))
}
// Organic if explicitly flagged, else inferred from tag/ingredients/name.
function isOrganicProduct(p: Product | null): boolean {
  if (!p) return false
  if (p.organic) return true
  const hay = `${p.tag ?? ''} ${p.ingredients ?? ''} ${p.name ?? ''}`.toLowerCase()
  return hay.includes('organic') || hay.includes('gots')
}

function Spinner() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-cream-300 border-t-bark-600 rounded-full animate-spin" />
    </div>
  )
}

export default function ProductDetailClient({ related, locale = 'en', initialProduct = null }: { related?: RelatedItem[]; locale?: 'en' | 'es'; initialProduct?: Product | null }) {
  const esPath = useIsEs()
  const isEs = locale === 'es' || esPath
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [product, setProduct] = useState<Product | null>(initialProduct)
  const [gallery, setGallery] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(!initialProduct)
  const [imgFailed, setImgFailed] = useState<Record<number, boolean>>({})
  const [inBox, setInBox] = useState(false)
  const [stock, setStock] = useState<number | null>(null)
  const [esDescription, setEsDescription] = useState<string | null>(null)
  const [wlEmail, setWlEmail] = useState('')
  const [wlState, setWlState] = useState<'idle' | 'saving' | 'done'>('idle')
  const [descOpen, setDescOpen] = useState(false)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const viewItemSent = useRef<string | null>(null)

  const allImages = gallery.length > 0
    ? gallery.map((g, i) => ({ src: g.image_url, alt: g.label ?? product?.name ?? '' }))
    : []

  useEffect(() => {
    if (lightboxIdx === null) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightboxIdx(null)
      if (e.key === 'ArrowRight') setLightboxIdx(i => i !== null ? Math.min(i + 1, allImages.length - 1) : null)
      if (e.key === 'ArrowLeft') setLightboxIdx(i => i !== null ? Math.max(i - 1, 0) : null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxIdx, allImages.length])

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(({ product: p, gallery: g, stock: st, esDescription: esd }: { product: Product; gallery: GalleryImage[]; stock: number | null; esDescription?: string | null }) => {
        setProduct(p)
        setStock(st ?? null)
        setEsDescription(esd ?? null)
        // Once per product per mount: Strict Mode / a refetch reruns this
        // callback, and view_item must not count a rerender as a second view.
        if (oncePerKey(viewItemSent, p.id)) trackViewItem({ id: p.id, name: p.name, price: p.price, category: p.category })
        const sorted = [...g].sort((a, b) => {
          if (a.is_primary && !b.is_primary) return -1
          if (!a.is_primary && b.is_primary) return 1
          return a.sort_order - b.sort_order
        })
        setGallery(sorted)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('pl_box_selection')
      if (!raw) return
      const items: Product[] = JSON.parse(raw)
      setInBox(items.some(p => p.id === id))
    } catch { /* ignore */ }
  }, [id])

  const fallbackSrc = SUPABASE_URL
    ? `${SUPABASE_URL}/storage/v1/object/public/product-images/${id}.jpg`
    : null

  function imgSrc(idx: number) {
    return gallery[idx]?.image_url ?? (idx === 0 ? fallbackSrc : null)
  }

  const handleImgError = useCallback((idx: number) => {
    setImgFailed(prev => ({ ...prev, [idx]: true }))
  }, [])

  async function joinWaitlist(e: React.FormEvent) {
    e.preventDefault()
    if (!wlEmail || wlState === 'saving') return
    setWlState('saving')
    try {
      await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: wlEmail, productId: id }),
      })
    } finally {
      setWlState('done')
    }
  }

  function handleAddToBox() {
    if (!product) return
    sessionStorage.setItem('pl_pending_add', product.id)
    router.push(isEs ? '/es/build' : '/build')
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream-50">
        {loading ? (
          <Spinner />
        ) : !product ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <p className="font-sans text-sm text-bark-400">{isEs ? 'Producto no encontrado.' : 'Product not found.'}</p>
            <Link href={localePath('/build', isEs)} className="font-sans text-xs tracking-[0.14em] uppercase text-bark-600 underline underline-offset-2">
              {isEs ? 'Volver a Arma tu canastilla' : 'Back to Build'}
            </Link>
          </div>
        ) : (
          <div className="w-full pl-6 sm:pl-9 pr-4 sm:pr-6 py-8 lg:py-12">
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-start">

              {/* LEFT — two photos side by side + more thumbnails below */}
              <div className="w-full lg:w-[65%] shrink-0">

                {/* All photos — uniform 2-column grid, same size */}
                <div className="grid grid-cols-2 gap-4">
                  {(gallery.length > 0 ? gallery : [null, null]).map((img, idx) => {
                    const src = img ? img.image_url : (idx === 0 ? imgSrc(0) : null)
                    const failed = imgFailed[idx]
                    const show = src && !failed
                    return (
                      <button
                        key={img?.id ?? idx}
                        onClick={() => { if (show) setLightboxIdx(idx) }}
                        className="relative w-full overflow-hidden cursor-pointer"
                        style={{ aspectRatio: '3/4' }}
                      >
                        {show ? (
                          <Image
                            src={src!}
                            alt={img?.label ?? product.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 1024px) 50vw, 26vw"
                                                       onError={() => handleImgError(idx)}
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-6xl bg-cream-200">
                            {idx === 0 && <span className="select-none">{product.imageEmoji}</span>}
                          </div>
                        )}
                        {/* Organic indicator on the main photo (leaf + word), like the carousel. */}
                        {idx === 0 && show && isOrganicProduct(product) && (
                          <div className="absolute bottom-2.5 right-2.5 z-10 flex flex-col items-center gap-0.5 pointer-events-none">
                            <span className="font-sans text-[11px] tracking-[0.18em] uppercase text-white drop-shadow">Organic</span>
                            <span className="w-7 h-7 rounded-full pl-round-full bg-sage-500/90 flex items-center justify-center shadow-md"><Leaf size={13} className="text-white" /></span>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* RIGHT — product info */}
              <div className="w-full lg:flex-1 pt-1 px-3">

                {/* Breadcrumb */}
                <nav className="font-sans text-[11px] tracking-[0.11em] uppercase text-bark-400 mb-4 flex items-center gap-1.5 flex-wrap">
                  <Link href={localePath('/build', isEs)} className="hover:text-bark-600 transition-colors">{isEs ? 'Arma tu canastilla' : 'Build Your Box'}</Link>
                  <span>/</span>
                  <span>{(isEs ? CATEGORY_LABELS_ES : CATEGORY_LABELS)[product.category]}</span>
                </nav>

                {/* Category label */}
                <p className="font-sans text-[11px] tracking-[0.18em] uppercase text-gold-400 mb-1.5">
                  {(isEs ? CATEGORY_LABELS_ES : CATEGORY_LABELS)[product.category]}
                </p>

                {/* Product name */}
                <h1 className="font-sans text-3xl text-espresso leading-tight mb-2">
                  {product.name}
                </h1>

                {/* Price */}
                <p className="font-sans text-base text-bark-400 mb-4">
                  {formatPrice(product.price)}
                </p>
                {/* Tag badge */}
                {product.tag && (
                  <div className="mb-4">
                    <span className="bg-terra-100 text-terra-500 font-sans text-[11px] tracking-[0.14em] uppercase px-3 py-1">
                      {product.tag}
                    </span>
                  </div>
                )}

                {/* Preorder state (portal toggle) */}
                {(product as Product & { preorder?: boolean; preorder_note?: string | null }).preorder && (
                  <div className="mb-3">
                    <span className="inline-block bg-sage-100 text-sage-500 font-sans text-[10px] tracking-[0.11em] uppercase font-bold px-2.5 py-1">
                      Preorder{(product as Product & { preorder_note?: string | null }).preorder_note ? ` · ${(product as Product & { preorder_note?: string | null }).preorder_note}` : ''}
                    </span>
                    <p className="font-sans text-[13px] text-bark-500 leading-relaxed mt-2">
                      Reserve yours from the first batch — charged now, shipped the moment the batch lands.
                    </p>
                  </div>
                )}

                {/* Sold out → waitlist capture (Build 12) */}
                {stock !== null && stock <= 0 && !(product as Product & { preorder?: boolean }).preorder ? (
                  <div className="mb-4">
                    <span className="inline-block bg-cream-200 text-bark-400 font-sans text-[10px] tracking-[0.11em] uppercase font-bold px-2.5 py-1 mb-3">
                      {isEs ? 'Agotado' : 'Sold out'}
                    </span>
                    {wlState === 'done' ? (
                      <p className="font-sans text-[13px] text-espresso leading-relaxed border border-cream-300 bg-cream-50 p-4">
                        {isEs ? 'Ya estás en la lista — te escribimos en cuanto regrese. 💛' : <>You&rsquo;re on the list — we&rsquo;ll email you the moment it returns. 💛</>}
                      </p>
                    ) : (
                      <form onSubmit={joinWaitlist} className="border border-cream-300 bg-cream-50 p-4">
                        <p className="font-playfair text-[15px] text-espresso mb-0.5">{isEs ? 'Entérate primero cuando regrese' : 'Be first when it returns'}</p>
                        <p className="font-sans text-[11.5px] text-bark-400 mb-2.5">{isEs ? 'Avisamos por correo en orden de registro, antes de publicarlo.' : 'Waitlist members are emailed in order, before it goes public.'}</p>
                        <div className="flex gap-2">
                          <input
                            type="email"
                            required
                            value={wlEmail}
                            onChange={e => setWlEmail(e.target.value)}
                            placeholder="Email address"
                            className="flex-1 min-w-0 px-3 py-2.5 font-sans text-[13px] text-espresso placeholder:text-bark-400/50 bg-white border border-cream-300 focus:outline-none focus:border-bark-400"
                          />
                          <button type="submit" disabled={wlState === 'saving'}
                            className="px-4 bg-[#7A8E7C] text-white font-sans text-[10px] tracking-[0.11em] uppercase font-semibold hover:bg-[#6d8070] transition-colors disabled:opacity-50">
                            {wlState === 'saving' ? '…' : (isEs ? 'Avísame' : 'Notify Me')}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                ) : inBox ? (
                  <div className="space-y-2 mb-4">
                    <div className="w-full border border-gold-400 text-gold-400 font-sans text-[11px] tracking-[0.14em] uppercase py-3.5 text-center">
                      {isEs ? 'En tu canastilla' : 'Added to Box'}
                    </div>
                    <button
                      onClick={() => router.push('/build')}
                      className="w-full bg-[#7A8E7C] text-white font-sans text-[11px] tracking-[0.14em] uppercase py-3.5 hover:bg-[#6d8070] transition-colors"
                    >
                      {isEs ? 'Ir a tu canastilla' : 'Go to Your Box'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleAddToBox}
                    className="w-full bg-[#7A8E7C] text-white font-sans text-[11px] tracking-[0.14em] uppercase py-3.5 hover:bg-[#6d8070] transition-colors mb-4"
                  >
                    {(product as Product & { preorder?: boolean }).preorder ? (isEs ? 'Reservar ahora' : 'Preorder Now') : (isEs ? 'Agregar a tu canastilla' : 'Add to Box')}
                  </button>
                )}

                <DeliveryEstimate className="mb-4 -mt-1" />

                {/* Trust badges */}
                <div className="flex items-start justify-between border-t border-b border-cream-300 py-4 mb-4">
                  {[
                    { label: isEs ? 'Envío gratis' : 'Free Shipping', sub: `$${Math.round(FREE_SHIPPING_THRESHOLD / 100)}+` },
                    { label: isEs ? 'Hecho a mano' : 'Handcrafted', sub: isEs ? 'con cariño' : 'with care' },
                    { label: isEs ? 'Listo para regalar' : 'Gift Ready', sub: isEs ? 'empacado con cuidado' : 'carefully packed' },
                  ].map(({ label, sub }) => (
                    <div key={label} className="flex-1 text-center">
                      <p className="font-sans text-[11px] tracking-[0.14em] uppercase text-bark-600">{label}</p>
                      <p className="font-sans text-[11px] tracking-[0.14em] uppercase text-bark-400">{sub}</p>
                    </div>
                  ))}
                </div>

                {/* Description — collapsible. Two fixes from the 2026-08-18
                    audit: the whole block is skipped when there's no copy (it
                    used to render a heading with nothing behind it), and the
                    text is always IN the DOM, hidden with CSS rather than
                    unmounted. Unmounting meant the description existed only
                    after a click — so crawlers, and any audit reading the
                    HTML, saw a product page with no product copy at all. */}
                {(() => {
                  const body = clean(isEs && esDescription ? esDescription : product.description)
                  if (!body) return null
                  return (
                    <div className="border-t border-cream-300">
                      <button
                        onClick={() => setDescOpen(o => !o)}
                        aria-expanded={descOpen}
                        className="w-full flex items-center justify-between py-3.5 group"
                      >
                        <span className="font-serif text-sm text-bark-600">Description</span>
                        <ChevronDown
                          size={14}
                          className={`text-bark-400 transition-transform duration-200 ${descOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                      <p
                        className={`pb-4 text-base text-bark-600 leading-relaxed ${descOpen ? '' : 'hidden'}`}
                        style={{ fontFamily: 'var(--font-cormorant)' }}
                      >
                        {body}
                      </p>
                    </div>
                  )
                })()}

                {/* Certifications — compact, single line, below the description */}
                {(() => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const pc = ((product as any).certifications ?? []) as any[]
                  if (pc.length === 0 && !isOrganicProduct(product)) return null
                  return (
                    <div className="border-t border-cream-300 py-4">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      <CertBadges certs={pc as any} organic={product.organic} />
                    </div>
                  )
                })()}

                {/* Ingredients — collapsible */}
                {product.ingredients && (
                  <div className="border-t border-cream-300">
                    <div className="py-3.5 flex items-start gap-2">
                      <span className="font-sans text-[11px] tracking-[0.14em] uppercase text-bark-400 mt-0.5 shrink-0">Materials</span>
                      <span className="font-sans text-xs text-bark-400">{clean(product.ingredients)}</span>
                    </div>
                  </div>
                )}

                {/* Scoped GOTS claim — shown when the GOTS cert is attached */}
                {hasGotsCert(product as unknown as { certifications?: Array<{ key?: string; name?: string }> }) && (
                  <div className="border-t border-cream-300">
                    <div className="py-3.5 flex items-start gap-2">
                      <span className="font-sans text-[11px] tracking-[0.14em] uppercase text-bark-400 mt-0.5 shrink-0">Cotton</span>
                      <span className="font-sans text-xs text-bark-400">Organic cotton from a GOTS-certified manufacturer.</span>
                    </div>
                  </div>
                )}

                <div className="border-t border-cream-300 pt-4 mt-1">
                  <Link
                    href={localePath('/build', isEs)}
                    className="font-sans text-[11px] tracking-[0.11em] uppercase text-bark-400 hover:text-bark-600 transition-colors"
                  >
                    {isEs ? '← Volver a Arma tu canastilla' : '← Back to Build'}
                  </Link>
                </div>

                <ReviewSection productId={id} />

              </div>
            </div>
          </div>
        )}
      </main>
      <RelatedProducts items={related} isEs={esPath} />
      <Footer />

      {/* Lightbox */}
      {lightboxIdx !== null && allImages[lightboxIdx] && (
        <div
          className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxIdx(null)}
        >
          {/* Close */}
          <button
            onClick={() => setLightboxIdx(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          >
            <X size={28} />
          </button>

          {/* Prev */}
          {lightboxIdx > 0 && (
            <button
              onClick={e => { e.stopPropagation(); setLightboxIdx(i => i !== null ? i - 1 : null) }}
              className="absolute left-4 text-white/70 hover:text-white transition-colors"
            >
              <ChevronLeft size={36} />
            </button>
          )}

          {/* Image */}
          <div
            className="relative w-full h-full max-w-3xl max-h-[90vh] mx-16"
            onClick={e => e.stopPropagation()}
          >
            <Image
              src={allImages[lightboxIdx].src}
              alt={allImages[lightboxIdx].alt}
              fill
              className="object-contain"
              sizes="100vw"
                         />
          </div>

          {/* Next */}
          {lightboxIdx < allImages.length - 1 && (
            <button
              onClick={e => { e.stopPropagation(); setLightboxIdx(i => i !== null ? i + 1 : null) }}
              className="absolute right-4 text-white/70 hover:text-white transition-colors"
            >
              <ChevronRight size={36} />
            </button>
          )}

          {/* Counter */}
          {allImages.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 font-sans text-[11px] tracking-[0.14em] text-white/50">
              {lightboxIdx + 1} / {allImages.length}
            </div>
          )}
        </div>
      )}
    </>
  )
}
