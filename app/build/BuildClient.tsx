'use client'

import { useState, useEffect, useRef } from 'react'
import { useIsEs } from '@/lib/use-is-es'
import { trackAddToCart } from '@/lib/analytics-events'
import { CATEGORY_LABELS_ES } from '@/lib/products'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { CATEGORY_LABELS, CATEGORY_ORDER, BOX_BASE_PRICE, FREE_SHIPPING_THRESHOLD, freeShippingApplies } from '@/lib/products'
import type { Product, ProductCategory } from '@/types'
import { Check, X, Plus, Minus, Leaf, ZoomIn, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import Image from 'next/image'
import { memo, useCallback, useMemo, useState as useLocalState } from 'react'
import { CertBadges } from '@/components/ui/CertBadges'
import { SlotImage } from '@/components/ui/SlotImage'
import { SlotBackground } from '@/components/ui/SlotBackground'
import { ScrimOverlay } from '@/components/ui/ScrimOverlay'
import { ParallaxLayer } from '@/components/ui/ParallaxLayer'
import type { ProductCert, CertDef } from '@/lib/certifications'
import { CartFeeNote } from '@/components/ui/CartFeeNote'

type ResolvedCert = ProductCert & Partial<CertDef>

// We don't display the official GOTS logo (we're not GOTS-certified ourselves) —
// GOTS-tagged items show our own "Organic" leaf instead. The GOTS-certified-maker
// claim is made in text on the product detail/modal.
function isGots(c: ResolvedCert): boolean {
  return /gots|global organic textile/i.test(`${c.key ?? ''} ${c.name ?? ''}`)
}
function cleanGots(s?: string | null): string {
  return (s ?? '')
    .replace(/GOTS[-‑\s]*certified\s*/gi, '')
    .replace(/\bGOTS\b[-\s]*/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

const CATEGORY_SUBTITLES: Record<string, string> = {
  swaddle: 'Wrap them in softness from day one.',
  garment: "The first outfit they'll always remember.",
  bath: 'Pure ingredients, safe from the very first bath.',
  keepsake: 'A gift that stays long after babyhood ends.',
  mom: 'Because the mama deserves to be celebrated too.',
}
const CATEGORY_SUBTITLES_ES: Record<string, string> = {
  swaddle: 'Suavidad desde el primer día.',
  garment: 'El primer conjunto que siempre recordarán.',
  bath: 'Ingredientes puros, seguros desde el primer baño.',
  keepsake: 'Un regalo que se queda mucho después de la infancia.',
  mom: 'Porque la mamá también merece ser celebrada.',
}

function formatPrice(cents: number) { return `$${(cents / 100).toFixed(2)}` }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

interface GalleryImage {
  id: string; image_url: string; label: string | null; is_primary: boolean; sort_order: number
}

// Products from the catalog API carry a has_variants flag
type BuildProduct = Product & { has_variants?: boolean }

interface VariantOpt { color: string; color_hex: string | null; style?: string; size: string; quantity: number }

// A selected line in the box — a product plus its chosen variant (if any)
type SelectedItem = Product & { selectedColor?: string; selectedSize?: string; selectedStyle?: string; colorHex?: string; lineKey: string; qty: number }

function variantKey(id: string, color?: string, size?: string, style?: string) {
  return color && size ? `${id}:${color}:${size}:${style || ''}` : id
}

// ── Product Card ─────────────────────────────────────────────────────────────
const ProductCard = memo(function ProductCard({ product, selected, onToggle, onOpen, soldOut, hoverImage, hoverVideo, certs, stock }: {
  product: Product; selected: boolean; onToggle: () => void; onOpen: () => void; soldOut: boolean
  hoverImage?: string; hoverVideo?: string; certs?: ResolvedCert[]; stock?: number
}) {
  const lowStock = typeof stock === 'number' && stock > 0 && stock <= 3
  const [imgFailed, setImgFailed] = useState(false)
  const [hoverImgFailed, setHoverImgFailed] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const storageSrc = product.image ?? (SUPABASE_URL
    ? `${SUPABASE_URL}/storage/v1/object/public/product-images/${product.id}.jpg`
    : null)
  const showImage = storageSrc && !imgFailed
  const showHoverImage = !!hoverImage && !hoverImgFailed
  const hasHoverMedia = showHoverImage || !!hoverVideo

  return (
    <div className="w-full group">
      <button
        onClick={soldOut ? undefined : onOpen}
        disabled={soldOut}
        onMouseEnter={() => { if (hoverVideo && videoRef.current) videoRef.current.play().catch(() => {}) }}
        onMouseLeave={() => { if (hoverVideo && videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0 } }}
        className={`relative w-full overflow-hidden block ${soldOut ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        style={{ aspectRatio: '3/4' }}
      >
        {showImage ? (
          <Image quality={88} src={storageSrc} alt={product.name} fill
            className={`object-cover transition-all duration-500 ${soldOut ? 'grayscale brightness-[0.35]' : ''}`}
            sizes="(max-width: 640px) 60vw, 320px" onError={() => setImgFailed(true)} />
        ) : (
          <div className={`absolute inset-0 flex items-center justify-center text-5xl
            ${soldOut ? 'bg-cream-200 grayscale brightness-50' : selected ? 'bg-terra-100' : 'bg-cream-200 group-hover:bg-cream-300'}`}>
            <span className="select-none">{product.imageEmoji}</span>
          </div>
        )}
        {!soldOut && showHoverImage && (
          <Image quality={88} src={hoverImage!} alt={product.name} fill
            className="object-cover absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            sizes="(max-width: 640px) 33vw, 25vw" onError={() => setHoverImgFailed(true)} />
        )}
        {!soldOut && hoverVideo && (
          <video ref={videoRef} src={hoverVideo} muted loop playsInline preload="none"
            className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        )}
        {soldOut && <div className="absolute inset-0 bg-bark-800/40" />}
        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="bg-white/90 font-sans text-[11px] tracking-[0.16em] uppercase text-bark-600 px-3 py-1.5">Sold Out</span>
          </div>
        )}
        {!soldOut && !hasHoverMedia && (
          <div className="absolute inset-0 bg-bark-600/75 flex items-end p-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <p className="font-sans text-[11px] text-cream-100 leading-relaxed line-clamp-3">{product.description}</p>
          </div>
        )}

        {/* Organic indicator only — the other certificates live on the product
            detail page. Label sits on top of the leaf. */}
        {(!!product.organic || (certs ?? []).some(isGots)) && (
          <div className="absolute bottom-2 left-2 z-10 flex flex-col items-center gap-0.5 pointer-events-none" title="Made with organic cotton">
            <span className="font-sans text-[8px] tracking-[0.18em] uppercase text-white drop-shadow">Organic</span>
            <span className="w-5 h-5 rounded-full pl-round-full bg-sage-500/90 flex items-center justify-center shadow-sm"><Leaf size={12} className="text-white" /></span>
          </div>
        )}
      </button>

      <div className={`pt-3.5 pb-1 text-left ${soldOut ? 'opacity-40' : ''}`}>
        <h3 className="font-serif text-[14px] font-medium text-espresso leading-snug mb-1 transition-colors group-hover:text-gold-500">{product.name}</h3>
        {!soldOut && lowStock && (
          <p className="font-sans text-[11px] tracking-[0.08em] text-red-600 mb-1">{stock} left</p>
        )}
        <div className="flex items-center justify-between gap-1">
          <span className={`font-serif text-[13px] font-medium text-espresso-light ${soldOut ? 'line-through' : ''}`}>{formatPrice(product.price)}</span>
          {!soldOut && (
            <button onClick={onToggle}
              className={`w-5 h-5 flex items-center justify-center shrink-0 transition-colors ${
                selected ? 'bg-espresso text-cream-50' : 'border border-espresso text-espresso hover:bg-espresso hover:text-cream-50'
              }`}
              title={selected ? 'Remove' : 'Add to box'}>
              {selected ? <Check size={10} /> : <Plus size={10} />}
            </button>
          )}
        </div>
      </div>
    </div>
  )
})

// ── Build Page ────────────────────────────────────────────────────────────────
export default function BuildClient({ initialCatalog }: { initialCatalog?: Record<string, BuildProduct[]> }) {
  const isEs = useIsEs()
  const router = useRouter()
  const [selected, setSelected] = useState<Map<string, SelectedItem>>(new Map())
  const [inventory, setInventory] = useState<Record<string, number>>({})
  const [hoverMedia, setHoverMedia] = useState<Record<string, { image?: string; video?: string }>>({})
  const [productCerts, setProductCerts] = useState<Record<string, ResolvedCert[]>>({})

  // Live catalog from the database, grouped by category. Starts EMPTY on
  // purpose: the old fallback to the static demo catalog (lib/products
  // PRODUCTS) put ~30 fake, selectable products into the server HTML and the
  // first client render until the fetch resolved — removed 2026-08-14.
  // Seeded by the server component so the first paint already has products
  // (was an empty object + spinner until the client fetch landed). The client
  // fetch below still runs — it refreshes stock/ES copy and handles the
  // "add to box" handoff — it just no longer gates the first render.
  const [catalog, setCatalog] = useState<Record<string, BuildProduct[]>>(initialCatalog ?? {})
  const [catalogLoading, setCatalogLoading] = useState(!initialCatalog)
  const activeCategories = useMemo(
    () => CATEGORY_ORDER.filter(cat => (catalog[cat]?.length ?? 0) > 0),
    [catalog]
  )

  const [bagOpen, setBagOpen] = useState(false)
  const [activeIdxMap, setActiveIdxMap] = useState<Record<string, number>>({})
  const scrollRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  function handleCategoryScroll(cat: string) {
    const el = scrollRefs.current.get(cat)
    if (!el || !el.children[0]) return
    const productCount = catalog[cat]?.length ?? 0
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4
    const itemWidth = (el.children[0] as HTMLElement).offsetWidth + 20
    const idx = atEnd ? productCount - 1 : Math.min(Math.round(el.scrollLeft / itemWidth), productCount - 1)
    setActiveIdxMap(prev => prev[cat] === idx ? prev : { ...prev, [cat]: idx })
  }

  function scrollCategoryTo(cat: string, idx: number) {
    const el = scrollRefs.current.get(cat)
    if (!el || !el.children[0]) return
    const itemWidth = (el.children[0] as HTMLElement).offsetWidth + 20
    el.scrollTo({ left: idx * itemWidth, behavior: 'smooth' })
  }

  // Modal
  const [modalProduct, setModalProduct] = useState<BuildProduct | null>(null)
  const [modalGallery, setModalGallery] = useState<GalleryImage[]>([])
  const [modalImgIdx, setModalImgIdx] = useState(0)   // selected photo in the modal gallery
  const [descOpen, setDescOpen] = useState(false)     // description folded by default
  const [modalVariants, setModalVariants] = useState<VariantOpt[]>([])
  const [modalCerts, setModalCerts] = useState<ProductCert[]>([])
  const [pickColor, setPickColor] = useState<string | null>(null)
  const [pickSize, setPickSize] = useState<string | null>(null)
  const [pickStyle, setPickStyle] = useState<string | null>(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [heroImg, setHeroImg] = useState<string | null>(null)
  const [heroImgMobile, setHeroImgMobile] = useState<string | null>(null)
  useEffect(() => {
    fetch('/api/site-images?keys=build.header_bg,build.header_bg.mobile')
      .then(r => r.json())
      .then(d => {
        setHeroImg(d.images?.['build.header_bg']?.public_url ?? null)
        setHeroImgMobile(d.images?.['build.header_bg.mobile']?.public_url ?? null)
      })
      .catch(() => {})
  }, [])
  const galleryCache = useRef<Record<string, GalleryImage[]>>({})

  useEffect(() => {
    fetch('/api/inventory').then(r => r.json()).then(d => setInventory(d.inventory ?? {}))
    fetch('/api/products/hover').then(r => r.json()).then(d => setHoverMedia(d.hover ?? {}))
    fetch(isEs ? '/api/products/all?lang=es' : '/api/products/all')
      .then(r => r.json())
      .then(d => {
        const byCat = (d.byCategory ?? {}) as Record<string, BuildProduct[]>
        setCatalog(byCat)
        // Product-page "Add to box" handoff — resolved against the LIVE
        // catalog (used to hit the static demo list).
        const pendingId = sessionStorage.getItem('pl_pending_add')
        if (pendingId) {
          const found = Object.values(byCat).flat().find(p => p.id === pendingId)
          if (found) {
            setSelected(prev => { const next = new Map(prev); next.set(found.id, { ...found, lineKey: found.id, qty: 1 }); return next })
            // The product page's "Add to box" click lands here — that click is
            // the add (the flag is cleared below, so a rerun can't re-fire).
            trackAddToCart([{ id: found.id, name: found.name, price: found.price, category: found.category, qty: 1 }])
          }
          sessionStorage.removeItem('pl_pending_add')
        }
      })
      .catch(() => {})
      .finally(() => setCatalogLoading(false))
    // Coming from the Gift Guide's "Build This Box" — load the recommended
    // items straight into the bag and open it.
    const rec = sessionStorage.getItem('pl_recommended')
    if (rec) {
      try {
        const items = JSON.parse(rec) as Product[]
        if (Array.isArray(items) && items.length) {
          setSelected(prev => {
            const next = new Map(prev)
            items.forEach(p => { if (p?.id) next.set(p.id, { ...p, lineKey: p.id, qty: (p as SelectedItem).qty ?? 1 } as SelectedItem) })
            return next
          })
          setBagOpen(true)
        }
      } catch { /* ignore */ }
      sessionStorage.removeItem('pl_recommended')
    }
    // Resumable link (Phase 4): cart-recovery emails carry ?resume=<orderId>;
    // restore that pending order's items into the bag once, then clean the URL.
    const resume = new URLSearchParams(window.location.search).get('resume')
    if (resume) {
      fetch(`/api/build-resume?order=${encodeURIComponent(resume)}`)
        .then(r => r.json())
        .then(d => {
          const items = (d.items ?? []) as SelectedItem[]
          if (!items.length) return
          setSelected(prev => {
            const next = new Map(prev)
            items.forEach(p => {
              if (!p?.id) return
              const key = p.lineKey ?? variantKey(p.id, p.selectedColor, p.selectedSize, p.selectedStyle)
              next.set(key, { ...p, lineKey: key })
            })
            return next
          })
          window.history.replaceState(null, '', window.location.pathname)
        })
        .catch(() => {})
    }
    // Restore the cart (e.g. items added from Shop by Occasion) into the bag.
    const cart = sessionStorage.getItem('pl_box_selection')
    if (cart) {
      try {
        const items = JSON.parse(cart) as SelectedItem[]
        if (Array.isArray(items) && items.length) {
          setSelected(prev => {
            const next = new Map(prev)
            items.forEach(p => {
              if (!p?.id) return
              const key = p.lineKey ?? variantKey(p.id, p.selectedColor, p.selectedSize, p.selectedStyle)
              if (!next.has(key)) next.set(key, { ...p, lineKey: key, qty: p.qty ?? 1 })
            })
            return next
          })
        }
      } catch { /* ignore */ }
    }
  }, [])

  // The header cart icon opens the bag in place when we're on /build.
  useEffect(() => {
    const open = () => setBagOpen(true)
    window.addEventListener('pl:open-bag', open)
    return () => window.removeEventListener('pl:open-bag', open)
  }, [])

  // Keep the persisted cart in sync as the box changes, so the header badge is
  // always accurate and the selection survives navigation away from /build.
  useEffect(() => {
    try {
      sessionStorage.setItem('pl_box_selection', JSON.stringify(Array.from(selected.values())))
      window.dispatchEvent(new Event('pl:cart'))
    } catch { /* ignore */ }
  }, [selected])

  // Load certs for all products in catalog
  useEffect(() => {
    const allProducts = Object.values(catalog).flat()
    const toLoad = allProducts.filter(p => !(p.id in productCerts))
    if (toLoad.length === 0) return

    Promise.all(toLoad.map(p =>
      fetch(`/api/products/${p.id}`)
        .then(r => r.json())
        .then(d => ({ id: p.id, certs: d.product?.certifications ?? [] }))
        .catch(() => ({ id: p.id, certs: [] }))
    )).then(results => {
      setProductCerts(prev => ({
        ...prev,
        ...Object.fromEntries(results.map(r => [r.id, r.certs]))
      }))
    })
  }, [catalog, productCerts])

  const modalVideo = modalProduct ? hoverMedia[modalProduct.id]?.video : undefined

  useEffect(() => {
    if (!modalProduct) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setModalProduct(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modalProduct])

  const isSoldOut = useCallback((id: string) => {
    if (!(id in inventory)) return false
    return inventory[id] <= 0
  }, [inventory])

  // Non-variant add/remove (key = product id)
  // GA4 add_to_cart fires from these handlers (the user's action), never from
  // the persist effect below — restores, resumes and hydration stay silent.
  const toggle = useCallback((product: BuildProduct) => {
    if (!selected.has(product.id)) trackAddToCart([{ id: product.id, name: product.name, price: product.price, category: product.category, qty: 1 }])
    setSelected(prev => {
      const next = new Map(prev)
      if (next.has(product.id)) next.delete(product.id)
      else next.set(product.id, { ...product, lineKey: product.id, qty: 1 })
      return next
    })
  }, [selected])

  // Variant add/remove (key = id:color:size:style)
  const toggleVariant = useCallback((product: BuildProduct, color: string, size: string, hex?: string | null, style?: string) => {
    const key = variantKey(product.id, color, size, style)
    if (!selected.has(key)) trackAddToCart([{ id: product.id, name: product.name, price: product.price, category: product.category, qty: 1, lineKey: key }])
    setSelected(prev => {
      const next = new Map(prev)
      if (next.has(key)) next.delete(key)
      else next.set(key, { ...product, selectedColor: color, selectedSize: size, selectedStyle: style || undefined, colorHex: hex ?? undefined, lineKey: key, qty: 1 })
      return next
    })
  }, [selected])

  const removeItem = useCallback((key: string) => {
    setSelected(prev => { const next = new Map(prev); next.delete(key); return next })
  }, [])

  // Adjust quantity for a line (min 1; never below 1 — use Remove to delete).
  const changeQty = useCallback((key: string, delta: number) => {
    const cur = selected.get(key)
    if (cur && delta > 0) trackAddToCart([{ id: cur.id, name: cur.name, price: cur.price, category: cur.category, qty: delta, lineKey: key }])
    setSelected(prev => {
      const next = new Map(prev)
      const item = next.get(key)
      if (item) next.set(key, { ...item, qty: Math.max(1, (item.qty ?? 1) + delta) })
      return next
    })
  }, [selected])

  // Is any variant (or the plain product) of this id in the box?
  const isProductSelected = useCallback(
    (id: string) => Array.from(selected.keys()).some(k => k === id || k.startsWith(`${id}:`)),
    [selected]
  )

  const openModal = useCallback(async (product: BuildProduct) => {
    setModalProduct(product)
    setModalVariants([])
    setModalCerts([])
    setPickColor(null)
    setPickSize(null)
    setPickStyle(null)
    setModalImgIdx(0)
    setDescOpen(false)
    setModalLoading(true)
    setModalGallery(galleryCache.current[product.id] ?? [])
    try {
      const res = await fetch(`/api/products/${product.id}`)
      if (res.ok) {
        const { gallery, variants, product: productData } = await res.json()
        const sorted: GalleryImage[] = [...(gallery ?? [])].sort((a: GalleryImage, b: GalleryImage) => {
          if (a.is_primary && !b.is_primary) return -1
          if (!a.is_primary && b.is_primary) return 1
          return a.sort_order - b.sort_order
        })
        galleryCache.current[product.id] = sorted
        setModalGallery(sorted)
        if (Array.isArray(variants)) setModalVariants(variants)
        if (Array.isArray(productData?.certifications)) setModalCerts(productData.certifications)
      }
    } catch {}
    setModalLoading(false)
  }, [])

  const selectedList = useMemo(() => Array.from(selected.values()), [selected])
  const subtotal = useMemo(() => selectedList.reduce((s, p) => s + p.price * (p.qty ?? 1), 0), [selectedList])
  const hasItems = selected.size > 0
  // Same predicate the bag drawer, checkout and the Stripe session use.
  const shipsFree = freeShippingApplies(subtotal + BOX_BASE_PRICE, 'standard')

  const modalMainSrc = modalProduct
    ? modalProduct.image ?? (SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/product-images/${modalProduct.id}.jpg` : null)
    : null

  // Variant picker derived state
  const modalHasVariants = !!modalProduct?.has_variants && modalVariants.length > 0
  const modalColors = useMemo(() => {
    const m = new Map<string, string | null>()
    modalVariants.forEach(v => { if (!m.has(v.color)) m.set(v.color, v.color_hex) })
    return Array.from(m.entries()).map(([color, color_hex]) => ({ color, color_hex }))
  }, [modalVariants])
  // Optional style/shape axis — only shown when this color actually has styles
  const stylesForColor = useMemo(() => {
    if (!pickColor) return [] as string[]
    return Array.from(new Set(modalVariants.filter(v => v.color === pickColor && (v.style ?? '').trim()).map(v => (v.style ?? '').trim())))
  }, [modalVariants, pickColor])
  const needsStyle = stylesForColor.length > 0
  const sizesForColor = pickColor
    ? modalVariants.filter(v => v.color === pickColor && (!needsStyle || (v.style ?? '') === (pickStyle ?? '')))
    : []
  const pickedVariant = modalVariants.find(v => v.color === pickColor && v.size === pickSize && (v.style ?? '') === (pickStyle ?? ''))
  const pickInStock = !!pickedVariant && pickedVariant.quantity > 0
  const pickedInBox = !!(modalProduct && pickColor && pickSize && (!needsStyle || pickStyle) && selected.has(variantKey(modalProduct.id, pickColor, pickSize, pickStyle ?? '')))
  const allVariantsOut = modalHasVariants && modalVariants.every(v => v.quantity <= 0)

  function handleCheckout() {
    sessionStorage.setItem('pl_box_selection', JSON.stringify(selectedList))
    router.push(isEs ? '/es/checkout' : '/checkout')
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">

        {/* Hero — ~85% of the viewport, parallax bg, Why Simple text, fade-in */}
        <section className="relative w-full min-h-[85vh] bg-bark-700 flex items-end overflow-hidden border-b border-cream-300">
          {(heroImg || heroImgMobile) ? (
            <>
              <ParallaxLayer strength={0.2}>
                {heroImg && heroImgMobile ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={heroImgMobile} alt="Build your own organic baby gift box — Petite Lavande keepsake basket" className="absolute inset-0 w-full h-full object-cover sm:hidden" fetchPriority="high" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={heroImg} alt="Build your own organic baby gift box — Petite Lavande keepsake basket" className="absolute inset-0 w-full h-full object-cover hidden sm:block" />
                  </>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={(heroImg ?? heroImgMobile)!} alt="Build your own organic baby gift box — Petite Lavande keepsake basket" className="absolute inset-0 w-full h-full object-cover" fetchPriority="high" />
                )}
              </ParallaxLayer>
              <ScrimOverlay scrimKey="build.header_bg" defaultHex="#181716" defaultOpacity={0.75} variant="gradient-top" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-bark-700 to-bark-800" />
          )}
          {/* The entrance animation starts at opacity 0, which would have left
              the new CTA invisible (and so untappable-looking) for 1.4s on the
              slowest devices. Desktop keeps it; phones render immediately. */}
          <div className="relative z-10 w-full px-8 sm:px-14 pb-16 sm:pb-28 max-w-3xl sm:[animation:slideUp_1.4s_cubic-bezier(0.22,1,0.36,1)_both]">
            {/* "We don't add what doesn't belong." was removed 2026-08-24, so
                "Build Your Box" moves up out of the 11px eyebrow into the h1 it
                left behind — the page keeps exactly one heading, at hero size. */}
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-cream-50 leading-[1.05] mb-6">
              {isEs ? 'Arma tu canastilla' : 'Build Your Box'}
            </h1>
            <p className="font-serif italic text-lg sm:text-xl text-cream-200/90 leading-relaxed max-w-lg mb-3">
              {isEs ? 'Cada pieza está aquí porque una mamá reciente o su bebé de verdad la van a usar y querer.' : <>Every item is chosen because a new mother or newborn will actually use and love it.</>}
            </p>
            {/* Kept for desktop, where there is room for it over the photo; on a
                phone it pushed the CTA below the fold for no conversion gain. */}
            <p className="hidden sm:block font-sans text-sm text-cream-100/50 tracking-wide">
              {isEs ? 'La sencillez no es un atajo. Es la decisión más difícil.' : <>Simplicity isn&apos;t a shortcut. It&apos;s the harder choice.</>}
            </p>
            {/* Anchor, not a route: the builder IS this page, directly below. */}
            <a
              href="#builder"
              className="mt-7 sm:mt-8 inline-flex items-center justify-center min-h-[48px] bg-[#7A8E7C] hover:bg-[#6d8070] text-white font-sans text-[11px] tracking-[0.25em] uppercase px-10 py-4 transition-colors"
            >
              {isEs ? 'Arma tu canastilla' : 'Build Your Box'}
            </a>
          </div>
        </section>

        <div id="builder" className="w-full pt-12 pb-4 relative scroll-mt-24">
          <div className="relative z-10 space-y-8">
          {catalogLoading && activeCategories.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <div className="w-8 h-8 border-2 border-cream-300 border-t-bark-600 rounded-full animate-spin" />
              <p className="font-sans text-xs tracking-[0.14em] uppercase text-bark-400">{isEs ? 'Cargando la colección…' : 'Loading the collection…'}</p>
            </div>
          )}
          {activeCategories.map((cat) => (
            <section key={cat} id={`cat-${cat}`}>
              <div className="pl-6 sm:pl-9 pr-6 sm:pr-8 mb-8">
                <p className="font-sans text-[11px] tracking-[0.18em] uppercase font-bold text-gold-500 mb-1">{(isEs ? CATEGORY_LABELS_ES : CATEGORY_LABELS)[cat]}</p>
                <h2 className="font-serif text-lg sm:text-xl text-terra-500">{(isEs ? CATEGORY_SUBTITLES_ES : CATEGORY_SUBTITLES)[cat]}</h2>
              </div>
              <div className="relative">
                <div
                  ref={el => { if (el) scrollRefs.current.set(cat, el); else scrollRefs.current.delete(cat) }}
                  onScroll={() => handleCategoryScroll(cat)}
                  className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-pl-6 sm:scroll-pl-9 gap-2.5 sm:gap-3 px-6 sm:px-9 pb-2"
                >
                  {(catalog[cat] ?? []).map(product => (
                    <div key={product.id} className="snap-start shrink-0 w-[66%] sm:w-[calc((100%-2.25rem)/4)] lg:w-[calc((100%-3rem)/5)]">
                      <ProductCard
                        product={product}
                        selected={isProductSelected(product.id)}
                        onToggle={() => product.has_variants ? openModal(product) : toggle(product)}
                        onOpen={() => openModal(product)}
                        soldOut={isSoldOut(product.id)}
                        stock={inventory[product.id]}
                        hoverImage={hoverMedia[product.id]?.image}
                        hoverVideo={hoverMedia[product.id]?.video}
                        certs={productCerts[product.id]}
                      />
                    </div>
                  ))}
                  <div className="shrink-0 w-6 sm:w-8" />
                </div>
                {/* Prev / next arrows — float over the row edges */}
                <button
                  type="button"
                  onClick={() => scrollCategoryTo(cat, Math.max(0, (activeIdxMap[cat] ?? 0) - 1))}
                  className="hidden sm:flex absolute left-3 top-[38%] -translate-y-1/2 z-10 w-11 h-11 rounded-full pl-round-full bg-white/95 shadow-md items-center justify-center text-bark-600 hover:bg-white hover:text-espresso transition-colors"
                  aria-label={`Previous ${(isEs ? CATEGORY_LABELS_ES : CATEGORY_LABELS)[cat]} products`}
                >
                  <ChevronLeft size={20} strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  onClick={() => scrollCategoryTo(cat, Math.min((catalog[cat]?.length ?? 1) - 1, (activeIdxMap[cat] ?? 0) + 1))}
                  className="hidden sm:flex absolute right-3 top-[38%] -translate-y-1/2 z-10 w-11 h-11 rounded-full pl-round-full bg-white/95 shadow-md items-center justify-center text-bark-600 hover:bg-white hover:text-espresso transition-colors"
                  aria-label={`Next ${(isEs ? CATEGORY_LABELS_ES : CATEGORY_LABELS)[cat]} products`}
                >
                  <ChevronRight size={20} strokeWidth={1.5} />
                </button>
              </div>
            </section>
          ))}
          {/* Spacer so the floating bag button doesn't overlap the footer on mobile.
              Kept INSIDE the background container so the image covers it — otherwise
              a cream gap shows between the image and the footer on phones. */}
          <div className="h-8 lg:hidden" />
          </div>
        </div>
        <Footer />
      </main>

      {/* ── Bag drawer backdrop ── */}
      <div
        className={`fixed inset-0 z-[52] bg-bark-800/30 backdrop-blur-sm transition-opacity duration-300 ${bagOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setBagOpen(false)}
      />

      {/* ── Bag drawer ── */}
      <div className={`fixed top-0 right-0 bottom-0 z-[53] w-[92vw] sm:w-[460px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${bagOpen ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* Drawer header */}
        <div className="flex items-center justify-between px-6 h-[68px] border-b border-cream-300 shrink-0">
          <h2 className="font-serif text-xl text-bark-600">{isEs ? 'Tu canastilla' : 'Your Box'}</h2>
          <button onClick={() => setBagOpen(false)} className="text-bark-400 hover:text-bark-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Free shipping progress — hidden once the box qualifies, exactly as
            in the global bag drawer: past the bar the footer states the free
            standard service instead of congratulating and then saying shipping
            will be calculated later. */}
        {!shipsFree && (() => {
          const threshold = FREE_SHIPPING_THRESHOLD
          // Count the real box price toward free shipping (items + the box base).
          const towardFree = subtotal + BOX_BASE_PRICE
          const pct = Math.min(towardFree / threshold, 1)
          const remaining = Math.max(0, threshold - towardFree)
          return (
            <div className="shrink-0 px-6 pt-4 pb-3 border-b border-cream-100">
              <p className="font-sans text-[11px] text-center text-bark-500 mb-3">
                {isEs
                  ? <>Te faltan <span className="text-bark-600 font-medium">{formatPrice(remaining)}</span> para obtener envío gratis.</>
                  : <><span className="text-bark-600 font-medium">{formatPrice(remaining)}</span> away from free shipping</>
                }
              </p>
              <div className="relative h-1.5 rounded-full bg-cream-200 border border-cream-300 mx-1">
                <div className="absolute left-0 top-0 h-full rounded-full bg-gold-400 transition-all duration-500" style={{ width: `${pct * 100}%` }} />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-7 h-7 rounded-full border flex items-center justify-center text-sm bg-white border-cream-300">
                  📦
                </div>
              </div>
              <div className="flex justify-end mt-2 pr-1">
                <span className="font-sans text-[11px] tracking-[0.1em] text-bark-400">{`$${Math.round(FREE_SHIPPING_THRESHOLD / 100)}`}</span>
              </div>
            </div>
          )
        })()}

        {/* Items list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {!hasItems ? (
            <p className="font-sans text-xs text-bark-400/60 tracking-wide text-center pt-10">{isEs ? 'Tu caja está vacía — añade productos para empezar.' : 'Your box is empty — add items to get started.'}</p>
          ) : (
            selectedList.map(product => {
              const src = product.image ?? (SUPABASE_URL
                ? `${SUPABASE_URL}/storage/v1/object/public/product-images/${product.id}.jpg`
                : null)
              const variantLabel = product.selectedColor && product.selectedSize
                ? `${product.selectedColor} · ${product.selectedSize}${product.selectedStyle ? ` · ${product.selectedStyle}` : ''}`
                : null
              return (
                <div key={product.lineKey} className="flex gap-4 items-start py-1">
                  <div className="w-28 h-32 bg-cream-100 relative shrink-0 overflow-hidden">
                    {src
                      ? <Image quality={88} src={src} alt={product.name} fill className="object-cover" sizes="112px" />
                      : <div className="w-full h-full flex items-center justify-center text-3xl">{product.imageEmoji}</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <p className="font-sans text-[11px] tracking-[0.11em] uppercase text-bark-400 mb-0.5">Petite Lavande</p>
                    <p className="font-sans text-sm text-bark-700 leading-snug mb-1.5">{product.name}</p>
                    {variantLabel && (
                      <p className="font-sans text-[11px] text-bark-400 capitalize mb-1">{variantLabel}</p>
                    )}
                    <p className="font-sans text-sm text-bark-500 mb-3">{formatPrice(product.price * (product.qty ?? 1))}{(product.qty ?? 1) > 1 && <span className="text-bark-400/70 text-xs"> ({formatPrice(product.price)} ea)</span>}</p>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center border border-cream-300 rounded">
                        <button onClick={() => changeQty(product.lineKey, -1)} disabled={(product.qty ?? 1) <= 1}
                          className="w-7 h-7 flex items-center justify-center text-bark-500 hover:bg-cream-100 disabled:opacity-30 transition-colors" aria-label="Decrease quantity">
                          <Minus size={13} />
                        </button>
                        <span className="w-7 text-center font-sans text-sm text-bark-600">{product.qty ?? 1}</span>
                        <button onClick={() => changeQty(product.lineKey, 1)}
                          className="w-7 h-7 flex items-center justify-center text-bark-500 hover:bg-cream-100 transition-colors" aria-label="Increase quantity">
                          <Plus size={13} />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(product.lineKey)}
                        className="font-sans text-[11px] tracking-[0.11em] uppercase text-bark-400 hover:text-bark-700 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>


        {/* Drawer footer */}
        <div className="shrink-0 border-t border-cream-300 px-6 py-5">
          <div className="flex justify-between items-baseline mb-1">
            <span className="font-sans text-[11px] tracking-[0.14em] uppercase text-bark-400">{isEs ? 'Subtotal' : 'Subtotal'}</span>
            <span className="font-sans text-base font-medium text-bark-600">{formatPrice(subtotal)}</span>
          </div>
          <CartFeeNote freeStandard={hasItems && shipsFree} className="mb-4" />
          <button
            onClick={handleCheckout}
            disabled={!hasItems}
            className="w-full bg-[#7A8E7C] text-white font-sans text-[11px] tracking-[0.16em] uppercase py-4 hover:bg-[#6d8070] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isEs ? 'Finalizar compra' : 'Check Out'}
          </button>
        </div>
      </div>

      {/* ── Product Modal ── */}
      {modalProduct && (
        <div
          className="fixed inset-0 z-[60] bg-bark-800/60 backdrop-blur-sm flex items-center justify-center p-4 lg:p-10"
          onClick={() => setModalProduct(null)}
        >
          <div
            className="bg-white w-full max-w-6xl max-h-[92vh] flex flex-col lg:flex-row lg:overflow-hidden overflow-y-auto relative rounded"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setModalProduct(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center text-bark-400 hover:text-bark-600 transition-colors bg-white/80"
            >
              <X size={16} />
            </button>

            {/* Image panel — thumbnail rail + one large photo with prev/next arrows */}
            <div className="lg:w-[58%] shrink-0 bg-white p-4 lg:p-5">
              {modalLoading ? (
                <div className="aspect-[3/4] flex items-center justify-center bg-cream-100">
                  <div className="w-6 h-6 border-2 border-cream-300 border-t-bark-600 rounded-full animate-spin" />
                </div>
              ) : (() => {
                const photos = modalGallery.length > 0 ? modalGallery.map(g => g.image_url) : (modalMainSrc ? [modalMainSrc] : [])
                const idx = Math.min(modalImgIdx, Math.max(0, photos.length - 1))
                const mainSrc = photos[idx] ?? null
                return (
                  <div className="flex flex-col sm:flex-row gap-3 h-full">
                    {/* Thumbnail rail — left column on desktop, horizontal row
                        BELOW the big photo on phones (keeps the big photo's
                        proportions balanced on small screens). */}
                    {photos.length > 1 && (
                      <div className="order-2 sm:order-1 w-full sm:w-20 shrink-0 flex flex-row sm:flex-col gap-2 overflow-x-auto sm:overflow-x-visible sm:overflow-y-auto scrollbar-hide">
                        {photos.map((src, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setModalImgIdx(i)}
                            className={`relative w-14 sm:w-full shrink-0 overflow-hidden bg-cream-100 border transition-colors ${i === idx ? 'border-bark-600' : 'border-transparent hover:border-cream-300'}`}
                            style={{ aspectRatio: '3/4' }}
                            aria-label={`Photo ${i + 1}`}
                          >
                            <Image quality={88} src={src} alt={`${modalProduct.name} — photo ${i + 1}`} fill className="object-cover" sizes="80px" />
                          </button>
                        ))}
                        {modalVideo && (
                          <div className="relative w-14 sm:w-full shrink-0 overflow-hidden bg-cream-100" style={{ aspectRatio: '3/4' }}>
                            <video src={modalVideo} muted loop playsInline autoPlay className="absolute inset-0 w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Main photo with arrows */}
                    <div className="order-1 sm:order-2 relative flex-1 bg-cream-50 overflow-hidden" style={{ aspectRatio: '3/4' }}>
                      {mainSrc ? (
                        <button type="button" onClick={() => setLightbox(mainSrc)} className="absolute inset-0 cursor-zoom-in group">
                          <Image quality={88} src={mainSrc} alt={modalProduct.name} fill className="object-cover" sizes="(max-width:1023px) 90vw, 560px" />
                          <span className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-cream-50/85 text-bark-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <ZoomIn size={13} />
                          </span>
                        </button>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-7xl"><span className="select-none">{modalProduct.imageEmoji}</span></div>
                      )}
                      {photos.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={() => setModalImgIdx((idx - 1 + photos.length) % photos.length)}
                            className="absolute left-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-white/90 drop-shadow-md hover:text-white transition-colors"
                            aria-label="Previous photo"
                          >
                            <ChevronLeft size={26} strokeWidth={1.5} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setModalImgIdx((idx + 1) % photos.length)}
                            className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-white/90 drop-shadow-md hover:text-white transition-colors"
                            aria-label="Next photo"
                          >
                            <ChevronRight size={26} strokeWidth={1.5} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* Product info — scrolls on desktop, flows naturally on mobile */}
            <div className="flex-1 lg:min-h-0 lg:overflow-y-auto p-6 lg:p-8 flex flex-col">
              <p className="font-sans text-[11px] tracking-[0.18em] uppercase text-gold-400 mb-2">{(isEs ? CATEGORY_LABELS_ES : CATEGORY_LABELS)[modalProduct.category]}</p>
              <h2 className="font-sans text-2xl lg:text-3xl text-espresso leading-tight mb-2">{modalProduct.name}</h2>
              <p className="font-sans text-base text-bark-400 mb-4">{formatPrice(modalProduct.price)}</p>

              {/* Certifications — right below the price. Falls back to the
                  shipping/handcrafted/gift-ready badges when there are none. */}
              <div className="border-t border-cream-300 py-4">
                {(modalCerts.length > 0 || modalProduct.organic) ? (
                  <CertBadges certs={modalCerts} organic={modalProduct.organic} />
                ) : (
                  <div className="flex items-start justify-between">
                    {[{ label: 'Free Shipping', sub: `$${Math.round(FREE_SHIPPING_THRESHOLD / 100)}+` }, { label: 'Handcrafted', sub: 'with care' }, { label: 'Gift Ready', sub: 'carefully packed' }].map(({ label, sub }) => (
                      <div key={label} className="flex-1 text-center">
                        <p className="font-sans text-[11px] tracking-[0.14em] uppercase text-bark-600">{label}</p>
                        <p className="font-sans text-[11px] tracking-[0.14em] uppercase text-bark-400">{sub}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Materials — covers the cotton story */}
              {modalProduct.ingredients && (
                <div className="border-t border-cream-300 py-3.5 mb-0.5 flex items-start gap-2">
                  <span className="font-sans text-[11px] tracking-[0.14em] uppercase text-bark-400 mt-0.5 shrink-0">Materials</span>
                  <span className="font-sans text-xs text-bark-400">{cleanGots(modalProduct.ingredients)}</span>
                </div>
              )}

              {/* Variant pickers (color + size) — below certs & materials */}
              {modalHasVariants && !allVariantsOut && (
                <div className="border-t border-cream-300 pt-4 space-y-4 mb-4">
                  <div>
                    <p className="font-sans text-[11px] tracking-[0.14em] uppercase text-bark-400 mb-2">
                      Color{pickColor ? <span className="text-bark-600 capitalize">: {pickColor}</span> : ''}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {modalColors.map(({ color, color_hex }) => {
                        const inStockForColor = modalVariants.some(v => v.color === color && v.quantity > 0)
                        const active = pickColor === color
                        return (
                          <button
                            key={color}
                            onClick={() => { setPickColor(color); setPickStyle(null); setPickSize(null) }}
                            disabled={!inStockForColor}
                            title={color}
                            className={`pl-swatch w-8 h-8 border-2 transition-all disabled:opacity-30 ${active ? 'border-bark-600 scale-110' : 'border-cream-300 hover:border-bark-400'}`}
                            style={{ backgroundColor: color_hex || '#e5e0d8' }}
                          />
                        )
                      })}
                    </div>
                  </div>

                  {pickColor && needsStyle && (
                    <div>
                      <p className="font-sans text-[11px] tracking-[0.14em] uppercase text-bark-400 mb-2">
                        Style{pickStyle ? <span className="text-bark-600 capitalize">: {pickStyle}</span> : ''}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {stylesForColor.map(st => {
                          const inStock = modalVariants.some(v => v.color === pickColor && (v.style ?? '') === st && v.quantity > 0)
                          const active = pickStyle === st
                          return (
                            <button
                              key={st}
                              onClick={() => { setPickStyle(st); setPickSize(null) }}
                              disabled={!inStock}
                              className={`px-3 py-2 border font-sans text-xs capitalize transition-colors disabled:opacity-30 ${
                                active ? 'border-bark-600 bg-bark-600 text-cream-50' : 'border-cream-300 text-bark-600 hover:border-bark-400'
                              }`}
                            >
                              {st}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {pickColor && (!needsStyle || pickStyle) && (
                    <div>
                      <p className="font-sans text-[11px] tracking-[0.14em] uppercase text-bark-400 mb-2">Size</p>
                      <div className="flex flex-wrap gap-2">
                        {sizesForColor.map(v => {
                          const out = v.quantity <= 0
                          const active = pickSize === v.size
                          return (
                            <button
                              key={v.size}
                              onClick={() => !out && setPickSize(v.size)}
                              disabled={out}
                              className={`px-3 py-2 border font-sans text-xs transition-colors ${
                                out
                                  ? 'border-cream-200 text-bark-300 line-through cursor-not-allowed'
                                  : active
                                    ? 'border-bark-600 bg-bark-600 text-cream-50'
                                    : 'border-cream-300 text-bark-600 hover:border-bark-400'
                              }`}
                            >
                              {v.size}{out ? ' · out' : ''}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Low-stock note for the specific chosen variant */}
              {modalHasVariants && pickedVariant && pickedVariant.quantity > 0 && pickedVariant.quantity <= 3 && (
                <p className="font-sans text-[11px] tracking-[0.08em] text-red-600 mb-1">{pickedVariant.quantity} left</p>
              )}

              <div className="pt-2 pb-4">
                {modalHasVariants ? (
                  allVariantsOut ? (
                    <div className="w-full border border-bark-300 text-bark-400 font-sans text-[11px] tracking-[0.14em] uppercase py-4 text-center">Sold Out</div>
                  ) : pickedInBox ? (
                    <button onClick={() => toggleVariant(modalProduct, pickColor!, pickSize!, pickedVariant?.color_hex, pickStyle ?? '')}
                      className="w-full border border-bark-300 text-bark-400 font-sans text-[11px] tracking-[0.14em] uppercase py-4 hover:border-bark-600 hover:text-bark-600 transition-colors flex items-center justify-center gap-2">
                      <Check size={13} /> {isEs ? 'En tu canastilla · Quitar' : 'In Your Box · Remove'}
                    </button>
                  ) : (
                    <button
                      onClick={() => toggleVariant(modalProduct, pickColor!, pickSize!, pickedVariant?.color_hex, pickStyle ?? '')}
                      disabled={!pickInStock}
                      className="w-full bg-[#7A8E7C] text-white font-sans text-[11px] tracking-[0.14em] uppercase py-4 hover:bg-[#6d8070] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                      {!pickColor ? (isEs ? 'Elige un color' : 'Choose a color') : needsStyle && !pickStyle ? (isEs ? 'Elige un estilo' : 'Choose a style') : !pickSize ? (isEs ? 'Elige una talla' : 'Choose a size') : (isEs ? 'Agregar a tu canastilla' : 'Add to Box')}
                    </button>
                  )
                ) : isSoldOut(modalProduct.id) ? (
                  <div className="w-full border border-bark-300 text-bark-400 font-sans text-[11px] tracking-[0.14em] uppercase py-4 text-center">Sold Out</div>
                ) : selected.has(modalProduct.id) ? (
                  <div className="space-y-2">
                    <div className="w-full border border-gold-400 text-gold-500 font-sans text-[11px] tracking-[0.14em] uppercase py-3.5 text-center flex items-center justify-center gap-2">
                      <Check size={13} /> {isEs ? 'En tu canastilla' : 'In Your Box'}
                    </div>
                    <button onClick={() => toggle(modalProduct)}
                      className="w-full border border-bark-300 text-bark-400 font-sans text-[11px] tracking-[0.14em] uppercase py-3 hover:border-bark-600 hover:text-bark-600 transition-colors">
                      Remove
                    </button>
                  </div>
                ) : (
                  <button onClick={() => toggle(modalProduct)}
                    className="w-full bg-[#7A8E7C] text-white font-sans text-[11px] tracking-[0.14em] uppercase py-4 hover:bg-[#6d8070] transition-colors">
                    {isEs ? 'Agregar a tu canastilla' : 'Add to Box'}
                  </button>
                )}
              </div>

              {/* Description — below the add-to-box CTA; folded by default */}
              <div className="border-t border-cream-300 py-3.5">
                <button
                  type="button"
                  onClick={() => setDescOpen(o => !o)}
                  className="w-full flex items-center justify-between text-left"
                  aria-expanded={descOpen}
                >
                  <span className="font-sans text-[11px] tracking-[0.14em] uppercase text-bark-600">Description</span>
                  <ChevronDown size={15} strokeWidth={1.5} className={`text-bark-400 transition-transform duration-300 ${descOpen ? 'rotate-180' : ''}`} />
                </button>
                {descOpen && (
                  <p className="text-base text-bark-600 leading-relaxed pt-3" style={{ fontFamily: 'var(--font-cormorant)' }}>
                    {cleanGots(modalProduct.description)}
                  </p>
                )}
              </div>
              {modalProduct.tag && (
                <span className="inline-block bg-terra-100 text-terra-500 font-sans text-[11px] tracking-[0.14em] uppercase px-3 py-1 mb-2 self-start">
                  {modalProduct.tag}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image lightbox — click any modal photo to enlarge */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[70] bg-bark-900/90 backdrop-blur-sm flex items-center justify-center p-4 sm:p-10 cursor-zoom-out"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt={modalProduct ? `${modalProduct.name} — enlarged photo` : 'Enlarged product photo'} className="max-h-[92vh] max-w-[92vw] w-auto h-auto object-contain shadow-2xl" />
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center text-cream-50/80 hover:text-cream-50 bg-bark-900/40 rounded-full"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
      )}
    </>
  )
}
