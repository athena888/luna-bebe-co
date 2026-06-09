'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { PRODUCTS, CATEGORY_LABELS, CATEGORY_ORDER, getAllProducts } from '@/lib/products'
import type { Product, ProductCategory } from '@/types'
import { Check, X, Plus, Minus, Heart, ShieldCheck, Leaf } from 'lucide-react'
import Image from 'next/image'
import { memo, useCallback, useMemo, useState as useLocalState } from 'react'
import { toggleWishlist, isWishlisted } from '@/lib/wishlist'
import { CertBadges } from '@/components/ui/CertBadges'
import { SlotImage } from '@/components/ui/SlotImage'
import { SlotBackground } from '@/components/ui/SlotBackground'
import type { ProductCert, CertDef } from '@/lib/certifications'

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
const ProductCard = memo(function ProductCard({ product, selected, onToggle, onOpen, soldOut, hoverImage, hoverVideo, certs }: {
  product: Product; selected: boolean; onToggle: () => void; onOpen: () => void; soldOut: boolean
  hoverImage?: string; hoverVideo?: string; certs?: ResolvedCert[]
}) {
  const [imgFailed, setImgFailed] = useState(false)
  const [hoverImgFailed, setHoverImgFailed] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [wishlisted, setWishlisted] = useLocalState(() => isWishlisted(product.id))

  function handleWishlist(e: React.MouseEvent) {
    e.stopPropagation()
    const next = toggleWishlist(product.id)
    setWishlisted(next)
  }

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
        className={`relative w-full overflow-hidden rounded block ${soldOut ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        style={{ aspectRatio: '3/4' }}
      >
        {showImage ? (
          <Image src={storageSrc} alt={product.name} fill
            className={`object-cover transition-all duration-500 ${soldOut ? 'grayscale brightness-[0.35]' : ''}`}
            sizes="(max-width: 640px) 60vw, 320px" onError={() => setImgFailed(true)} />
        ) : (
          <div className={`absolute inset-0 flex items-center justify-center text-5xl
            ${soldOut ? 'bg-cream-200 grayscale brightness-50' : selected ? 'bg-terra-100' : 'bg-cream-200 group-hover:bg-cream-300'}`}>
            <span className="select-none">{product.imageEmoji}</span>
          </div>
        )}
        {!soldOut && showHoverImage && (
          <Image src={hoverImage!} alt={product.name} fill
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
            <span className="bg-white/90 font-sans text-[10px] tracking-[0.25em] uppercase text-bark-600 px-3 py-1.5">Sold Out</span>
          </div>
        )}
        {!soldOut && (
          <button
            onClick={handleWishlist}
            className="absolute top-2 left-2 z-10 w-6 h-6 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            title={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
          >
            <Heart size={12} className={wishlisted ? 'text-rose-400 fill-rose-400' : 'text-bark-400'} />
          </button>
        )}
        {selected && !soldOut && (
          <div className="absolute top-2 right-2 w-5 h-5 bg-bark-600 flex items-center justify-center z-10">
            <Check size={10} className="text-cream-50" />
          </div>
        )}
        {!soldOut && !hasHoverMedia && (
          <div className="absolute inset-0 bg-bark-600/75 flex items-end p-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <p className="font-sans text-[10px] text-cream-100 leading-relaxed line-clamp-3">{product.description}</p>
          </div>
        )}

        {/* Cert logos — overlay; GOTS shown as our Organic leaf, not the official logo */}
        {(() => {
          const list = (certs ?? []).filter(c => !isGots(c))
          const showOrganic = !!product.organic || (certs ?? []).some(isGots)
          if (!showOrganic && list.length === 0) return null
          return (
            <div className="absolute bottom-2 left-2 flex items-center gap-1 z-10">
              {showOrganic && (
                <div className="w-5 h-5 rounded-full bg-sage-500 flex items-center justify-center shadow-sm" title="Made with organic cotton">
                  <Leaf size={12} className="text-white" />
                </div>
              )}
              {list.slice(0, 3).map(cert => (
                <div key={cert.key} className="w-5 h-5 relative bg-white/90 rounded-full p-0.5 backdrop-blur-sm" title={cert.name || cert.key}>
                  {cert.iconUrl ? (
                    <Image src={cert.iconUrl} alt={cert.name || cert.key} fill className="object-contain" />
                  ) : (
                    <ShieldCheck size={14} className="text-gold-400" />
                  )}
                </div>
              ))}
            </div>
          )
        })()}
      </button>

      <div className={`pb-1 ${soldOut ? 'opacity-40' : ''}`}>
        <h3 className="font-sans text-sm text-bark-600 leading-snug mb-1">{product.name}</h3>
        <div className="flex items-center justify-between gap-1">
          <span className={`font-sans text-xs text-bark-400 ${soldOut ? 'line-through' : ''}`}>{formatPrice(product.price)}</span>
          {!soldOut && (
            <button onClick={onToggle}
              className={`w-5 h-5 flex items-center justify-center shrink-0 transition-colors ${
                selected ? 'bg-bark-600 text-cream-50' : 'border border-bark-300 text-bark-400 hover:border-bark-600 hover:text-bark-600'
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
export default function BuildPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<Map<string, SelectedItem>>(new Map())
  const [inventory, setInventory] = useState<Record<string, number>>({})
  const [hoverMedia, setHoverMedia] = useState<Record<string, { image?: string; video?: string }>>({})
  const [productCerts, setProductCerts] = useState<Record<string, ResolvedCert[]>>({})

  // Live catalog from the database, grouped by category. Falls back to the
  // built-in static catalog until the fetch resolves.
  const [catalog, setCatalog] = useState<Record<string, BuildProduct[]>>(() => ({ ...PRODUCTS }))
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
  const [modalVariants, setModalVariants] = useState<VariantOpt[]>([])
  const [modalCerts, setModalCerts] = useState<ProductCert[]>([])
  const [pickColor, setPickColor] = useState<string | null>(null)
  const [pickSize, setPickSize] = useState<string | null>(null)
  const [pickStyle, setPickStyle] = useState<string | null>(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [modalImgIdx, setModalImgIdx] = useState(0)
  const galleryCache = useRef<Record<string, GalleryImage[]>>({})
  const modalScrollRef = useRef<HTMLDivElement>(null)

  function scrollToSlide(idx: number) {
    const el = modalScrollRef.current
    if (!el) return
    el.scrollTo({ left: idx * el.clientWidth, behavior: 'smooth' })
  }

  function handleModalScroll() {
    const el = modalScrollRef.current
    if (!el) return
    setModalImgIdx(Math.round(el.scrollLeft / el.clientWidth))
  }

  useEffect(() => {
    fetch('/api/inventory').then(r => r.json()).then(d => setInventory(d.inventory ?? {}))
    fetch('/api/products/hover').then(r => r.json()).then(d => setHoverMedia(d.hover ?? {}))
    fetch('/api/products/all')
      .then(r => r.json())
      .then(d => { if (d.byCategory) setCatalog(d.byCategory) })
      .catch(() => {})
    const pendingId = sessionStorage.getItem('pl_pending_add')
    if (pendingId) {
      const found = getAllProducts().find(p => p.id === pendingId)
      if (found) setSelected(prev => { const next = new Map(prev); next.set(found.id, { ...found, lineKey: found.id, qty: 1 }); return next })
      sessionStorage.removeItem('pl_pending_add')
    }
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
  const totalSlides = modalGallery.length + (modalVideo ? 1 : 0) || 1

  useEffect(() => {
    if (!modalProduct) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setModalProduct(null)
      if (e.key === 'ArrowRight') setModalImgIdx(i => { const n = Math.min(i + 1, totalSlides - 1); scrollToSlide(n); return n })
      if (e.key === 'ArrowLeft') setModalImgIdx(i => { const n = Math.max(i - 1, 0); scrollToSlide(n); return n })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modalProduct, totalSlides])

  const isSoldOut = useCallback((id: string) => {
    if (!(id in inventory)) return false
    return inventory[id] <= 0
  }, [inventory])

  // Non-variant add/remove (key = product id)
  const toggle = useCallback((product: BuildProduct) => {
    setSelected(prev => {
      const next = new Map(prev)
      if (next.has(product.id)) next.delete(product.id)
      else next.set(product.id, { ...product, lineKey: product.id, qty: 1 })
      return next
    })
  }, [])

  // Variant add/remove (key = id:color:size:style)
  const toggleVariant = useCallback((product: BuildProduct, color: string, size: string, hex?: string | null, style?: string) => {
    const key = variantKey(product.id, color, size, style)
    setSelected(prev => {
      const next = new Map(prev)
      if (next.has(key)) next.delete(key)
      else next.set(key, { ...product, selectedColor: color, selectedSize: size, selectedStyle: style || undefined, colorHex: hex ?? undefined, lineKey: key, qty: 1 })
      return next
    })
  }, [])

  const removeItem = useCallback((key: string) => {
    setSelected(prev => { const next = new Map(prev); next.delete(key); return next })
  }, [])

  // Adjust quantity for a line (min 1; never below 1 — use Remove to delete).
  const changeQty = useCallback((key: string, delta: number) => {
    setSelected(prev => {
      const next = new Map(prev)
      const item = next.get(key)
      if (item) next.set(key, { ...item, qty: Math.max(1, (item.qty ?? 1) + delta) })
      return next
    })
  }, [])

  // Is any variant (or the plain product) of this id in the box?
  const isProductSelected = useCallback(
    (id: string) => Array.from(selected.keys()).some(k => k === id || k.startsWith(`${id}:`)),
    [selected]
  )

  const openModal = useCallback(async (product: BuildProduct) => {
    setModalProduct(product)
    setModalImgIdx(0)
    setModalVariants([])
    setModalCerts([])
    setPickColor(null)
    setPickSize(null)
    setPickStyle(null)
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
    router.push('/letter')
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream-50 pb-16 lg:pb-0">

        <SlotBackground slotKey="build.header_bg" scrim="" className="border-b border-cream-300 bg-cream-50 px-6 py-14 sm:py-20 text-center">
          {(hasImage) => (
            <div style={hasImage ? { textShadow: '0 1px 12px rgba(0,0,0,0.35)' } : undefined}>
              <h1 className={`font-serif text-4xl sm:text-5xl mb-2 ${hasImage ? 'text-cream-50' : 'text-bark-600'}`}>Build Your Box</h1>
              <p className={`font-sans text-xs tracking-wide ${hasImage ? 'text-cream-100/90' : 'text-bark-500'}`}>Click any item to explore — add as many as you like.</p>
            </div>
          )}
        </SlotBackground>

        <div className="w-full py-12 space-y-14">
          {activeCategories.map((cat) => (
            <section key={cat} id={`cat-${cat}`}>
              <SlotImage slotKey={`build.banner.${cat}`} className="w-full aspect-[21/9] sm:aspect-[3/1] overflow-hidden mb-6" />
              <div className="pl-6 sm:pl-9 pr-6 sm:pr-8 mb-8">
                <p className="font-sans text-[10px] tracking-[0.35em] uppercase text-gold-400 mb-1">{CATEGORY_LABELS[cat]}</p>
                <h2 className="font-serif text-lg sm:text-xl text-terra-500">{CATEGORY_SUBTITLES[cat]}</h2>
              </div>
              <div
                ref={el => { if (el) scrollRefs.current.set(cat, el); else scrollRefs.current.delete(cat) }}
                onScroll={() => handleCategoryScroll(cat)}
                className="flex overflow-x-auto scrollbar-hide gap-5 pl-6 sm:pl-9 pb-2"
              >
                {(catalog[cat] ?? []).map(product => (
                  <div key={product.id} className="shrink-0 w-[180px] sm:w-[240px]">
                    <ProductCard
                      product={product}
                      selected={isProductSelected(product.id)}
                      onToggle={() => product.has_variants ? openModal(product) : toggle(product)}
                      onOpen={() => openModal(product)}
                      soldOut={isSoldOut(product.id)}
                      hoverImage={hoverMedia[product.id]?.image}
                      hoverVideo={hoverMedia[product.id]?.video}
                      certs={productCerts[product.id]}
                    />
                  </div>
                ))}
                <div className="shrink-0 w-6 sm:w-8" />
              </div>
              {/* Scroll dots */}
              <div className="flex items-center justify-end gap-1.5 mt-4 pr-6 sm:pr-9">
                {(catalog[cat] ?? []).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => scrollCategoryTo(cat, i)}
                    className={`w-1 h-1 rounded-full transition-colors duration-200 ${(activeIdxMap[cat] ?? 0) === i ? 'bg-bark-700' : 'bg-terra-300 hover:bg-terra-400'}`}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
      <Footer />

      {/* ── Bag drawer backdrop ── */}
      <div
        className={`fixed inset-0 z-[52] bg-bark-800/30 backdrop-blur-sm transition-opacity duration-300 ${bagOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setBagOpen(false)}
      />

      {/* ── Bag drawer ── */}
      <div className={`fixed top-0 right-0 bottom-0 z-[53] w-[92vw] sm:w-[460px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${bagOpen ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* Drawer header */}
        <div className="flex items-center justify-between px-6 h-[68px] border-b border-cream-300 shrink-0">
          <h2 className="font-serif text-xl text-bark-600">Your Box</h2>
          <button onClick={() => setBagOpen(false)} className="text-bark-400 hover:text-bark-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Free shipping progress */}
        {(() => {
          const threshold = 15000
          const pct = Math.min(subtotal / threshold, 1)
          const earned = subtotal >= threshold
          const remaining = threshold - subtotal
          return (
            <div className="shrink-0 px-6 pt-4 pb-3 border-b border-cream-100">
              <p className="font-sans text-[11px] text-center text-bark-500 mb-3">
                {earned
                  ? 'Congratulations — you earned free shipping!'
                  : <><span className="text-bark-600 font-medium">{formatPrice(remaining)}</span> away from free shipping</>
                }
              </p>
              <div className="relative h-px bg-cream-300 mx-1">
                <div className="absolute left-0 top-0 h-full bg-gold-400 transition-all duration-500" style={{ width: `${pct * 100}%` }} />
                <div className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-7 h-7 rounded-full border flex items-center justify-center text-sm transition-colors duration-300 ${earned ? 'bg-gold-400 border-gold-400' : 'bg-white border-cream-300'}`}>
                  📦
                </div>
              </div>
              <div className="flex justify-end mt-2 pr-1">
                <span className="font-sans text-[9px] tracking-[0.1em] text-bark-400">$150</span>
              </div>
            </div>
          )
        })()}

        {/* Items list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {!hasItems ? (
            <p className="font-sans text-xs text-bark-400/60 tracking-wide text-center pt-10">Your box is empty — add items to get started.</p>
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
                  <div className="w-28 h-32 bg-cream-100 relative shrink-0 overflow-hidden rounded">
                    {src
                      ? <Image src={src} alt={product.name} fill className="object-cover" sizes="112px" />
                      : <div className="w-full h-full flex items-center justify-center text-3xl">{product.imageEmoji}</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <p className="font-sans text-[10px] tracking-[0.15em] uppercase text-bark-400 mb-0.5">Petite Lavande</p>
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
                        className="font-sans text-[10px] tracking-[0.15em] uppercase text-bark-400 hover:text-bark-700 transition-colors"
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
            <span className="font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400">Subtotal</span>
            <span className="font-sans text-base font-medium text-bark-600">{formatPrice(subtotal)}</span>
          </div>
          <p className="font-sans text-[10px] text-bark-400/60 mb-4">Box fee &amp; shipping calculated at checkout</p>
          <button
            onClick={() => { setBagOpen(false); handleCheckout() }}
            disabled={!hasItems}
            className="w-full bg-bark-700 text-cream-50 font-sans text-[11px] tracking-[0.25em] uppercase py-4 hover:bg-bark-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Check Out
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
            className="bg-white w-full max-w-4xl max-h-[92vh] flex flex-col lg:flex-row lg:overflow-hidden overflow-y-auto relative rounded"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setModalProduct(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center text-bark-400 hover:text-bark-600 transition-colors bg-white/80"
            >
              <X size={16} />
            </button>

            {/* Image panel — fixed height on mobile, fills height on desktop */}
            <div className="relative lg:w-[55%] shrink-0 bg-cream-100 flex flex-col">
              {/* Image slides */}
              <div
                ref={modalScrollRef}
                onScroll={handleModalScroll}
                className="relative flex overflow-x-auto scrollbar-hide snap-x snap-mandatory aspect-[3/4] w-full"
              >
                {modalLoading && (
                  <div className="absolute inset-0 flex items-center justify-center z-10 bg-cream-100">
                    <div className="w-6 h-6 border-2 border-cream-300 border-t-bark-600 rounded-full animate-spin" />
                  </div>
                )}
                {!modalLoading && modalGallery.length === 0 && (
                  <div className="shrink-0 w-full h-full snap-start relative">
                    {modalMainSrc
                      ? <Image src={modalMainSrc} alt={modalProduct.name} fill className="object-cover" sizes="(max-width:1023px) 100vw, 55vw" />
                      : <div className="absolute inset-0 flex items-center justify-center text-8xl bg-cream-100">
                          <span className="select-none">{modalProduct.imageEmoji}</span>
                        </div>
                    }
                  </div>
                )}
                {modalGallery.map((img) => (
                  <div key={img.id} className="shrink-0 w-full h-full snap-start relative">
                    <Image src={img.image_url} alt={img.label ?? modalProduct.name} fill className="object-cover" sizes="(max-width:1023px) 100vw, 55vw" />
                  </div>
                ))}
                {modalVideo && (
                  <div className="shrink-0 w-full h-full snap-start relative">
                    <video src={modalVideo} autoPlay muted loop playsInline className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* Slide dots */}
              {totalSlides > 1 && (
                <div className="shrink-0 flex items-center justify-center gap-1.5 py-2.5">
                  {Array.from({ length: totalSlides }).map((_, i) => (
                    <button key={i} onClick={() => scrollToSlide(i)}
                      className={`rounded-full transition-all duration-200 ${modalImgIdx === i ? 'w-4 h-1.5 bg-bark-600' : 'w-1.5 h-1.5 bg-bark-300'}`} />
                  ))}
                </div>
              )}

              {/* Cert badges — below the photo, above the info text */}
              {modalCerts.length > 0 && (
                <div className="px-5 pb-2 pt-2 border-t border-cream-100">
                  <CertBadges certs={modalCerts} />
                </div>
              )}
            </div>

            {/* Product info — scrolls on desktop, flows naturally on mobile */}
            <div className="flex-1 lg:min-h-0 lg:overflow-y-auto p-6 lg:p-8 flex flex-col">
              <p className="font-sans text-[10px] tracking-[0.35em] uppercase text-gold-400 mb-2">{CATEGORY_LABELS[modalProduct.category]}</p>
              <h2 className="font-sans text-2xl lg:text-3xl text-bark-600 leading-tight mb-2">{modalProduct.name}</h2>
              <p className="font-sans text-base text-bark-400 mb-4">{formatPrice(modalProduct.price)}</p>
              {modalProduct.tag && (
                <span className="inline-block bg-terra-100 text-terra-500 font-sans text-[9px] tracking-[0.2em] uppercase px-3 py-1 mb-4 self-start">
                  {modalProduct.tag}
                </span>
              )}
              <div className="border-t border-cream-300 pt-4 mb-4">
                <p className="text-base text-bark-600 leading-relaxed" style={{ fontFamily: 'var(--font-cormorant)' }}>
                  {cleanGots(modalProduct.description)}
                </p>
              </div>
              {modalProduct.ingredients && (
                <div className="mb-4">
                  <span className="font-sans text-[9px] tracking-[0.2em] uppercase text-bark-400 mr-2">Materials</span>
                  <span className="font-sans text-xs text-bark-400">{cleanGots(modalProduct.ingredients)}</span>
                </div>
              )}
              {modalCerts.some(isGots) && (
                <p className="font-sans text-xs text-bark-400 mb-4 leading-relaxed">
                  Made with <span className="text-bark-600">GOTS-certified organic cotton</span> from a GOTS-certified manufacturer.
                </p>
              )}
              {/* Variant pickers (color + size) */}
              {modalHasVariants && !allVariantsOut && (
                <div className="space-y-4 mb-4">
                  <div>
                    <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-2">
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
                            className={`w-8 h-8 rounded-full border-2 transition-all disabled:opacity-30 ${active ? 'border-bark-600 scale-110' : 'border-cream-300 hover:border-bark-400'}`}
                            style={{ backgroundColor: color_hex || '#e5e0d8' }}
                          />
                        )
                      })}
                    </div>
                  </div>

                  {pickColor && needsStyle && (
                    <div>
                      <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-2">
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
                      <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-2">Size</p>
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

              <div className="mt-auto pt-4">
                {modalHasVariants ? (
                  allVariantsOut ? (
                    <div className="w-full border border-bark-300 text-bark-400 font-sans text-[11px] tracking-[0.2em] uppercase py-4 text-center">Sold Out</div>
                  ) : pickedInBox ? (
                    <button onClick={() => toggleVariant(modalProduct, pickColor!, pickSize!, pickedVariant?.color_hex, pickStyle ?? '')}
                      className="w-full border border-bark-300 text-bark-400 font-sans text-[11px] tracking-[0.2em] uppercase py-4 hover:border-bark-600 hover:text-bark-600 transition-colors flex items-center justify-center gap-2">
                      <Check size={13} /> In Your Box · Remove
                    </button>
                  ) : (
                    <button
                      onClick={() => toggleVariant(modalProduct, pickColor!, pickSize!, pickedVariant?.color_hex, pickStyle ?? '')}
                      disabled={!pickInStock}
                      className="w-full bg-bark-600 text-cream-50 font-sans text-[11px] tracking-[0.2em] uppercase py-4 hover:bg-bark-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                      {!pickColor ? 'Choose a color' : needsStyle && !pickStyle ? 'Choose a style' : !pickSize ? 'Choose a size' : 'Add to Box'}
                    </button>
                  )
                ) : isSoldOut(modalProduct.id) ? (
                  <div className="w-full border border-bark-300 text-bark-400 font-sans text-[11px] tracking-[0.2em] uppercase py-4 text-center">Sold Out</div>
                ) : selected.has(modalProduct.id) ? (
                  <div className="space-y-2">
                    <div className="w-full border border-gold-400 text-gold-500 font-sans text-[11px] tracking-[0.2em] uppercase py-3.5 text-center flex items-center justify-center gap-2">
                      <Check size={13} /> In Your Box
                    </div>
                    <button onClick={() => toggle(modalProduct)}
                      className="w-full border border-bark-300 text-bark-400 font-sans text-[11px] tracking-[0.2em] uppercase py-3 hover:border-bark-600 hover:text-bark-600 transition-colors">
                      Remove
                    </button>
                  </div>
                ) : (
                  <button onClick={() => toggle(modalProduct)}
                    className="w-full bg-bark-600 text-cream-50 font-sans text-[11px] tracking-[0.2em] uppercase py-4 hover:bg-bark-700 transition-colors">
                    Add to Box
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
