'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { Leaf, X, ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react'
import { CertBadges } from '@/components/ui/CertBadges'
import type { ResolvedBox, BoxItem } from '@/lib/prebuilt-boxes-db'
import { BOX_BASE_PRICE } from '@/lib/products'
import { writeCart, type CartItem } from '@/lib/cart'

const BOX_SIZES = ['0–3 mo', '3–6 mo'] as const
const isGarment = (i: BoxItem) => /garment|swaddle|romper|kimono|clothes|onesie|bodysuit|sleep/i.test(`${i.category ?? ''} ${i.name ?? ''}`)

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SHOW_BOTANICAL = process.env.NEXT_PUBLIC_CARD_BOTANICAL_BG === 'true'
function fmt(c: number) { return `$${(c / 100).toFixed(0)}` }
function productImg(p: { id: string; image?: string | null }): string | null {
  return p.image ?? (SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/product-images/${p.id}.jpg` : null)
}

// Scroll-triggered fly-in — fires once when element enters viewport.
function FlyIn({ children, delay = 0, from = 'bottom', className = '', style }: {
  children: React.ReactNode; delay?: number; from?: 'bottom' | 'left' | 'right'; className?: string; style?: React.CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } }, { threshold: 0.12 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  const translate = from === 'left' ? 'translateX(-40px)' : from === 'right' ? 'translateX(40px)' : 'translateY(32px)'
  return (
    <div ref={ref} className={className} style={{
      ...style,
      opacity: visible ? 1 : 0,
      transform: visible ? 'none' : translate,
      transition: `opacity 0.75s ease ${delay}ms, transform 0.75s ease ${delay}ms`,
    }}>
      {children}
    </div>
  )
}

function prices(box: ResolvedBox) {
  const contents = box.items.reduce((s, p) => s + (p?.price ?? 0), 0)
  const regular = BOX_BASE_PRICE + contents
  const price = box.customPrice ?? regular
  const saving = box.customPrice != null && regular > box.customPrice
  return { regular, price, saving }
}

function PriceBlock({ box }: { box: ResolvedBox }) {
  const { regular, price, saving } = prices(box)
  return (
    <div>
      <div className="flex items-baseline gap-3 flex-wrap">
        {saving && <span className="font-serif text-xl text-bark-400 line-through">{fmt(regular)}</span>}
        <span className="font-serif text-3xl text-espresso">{fmt(price)}</span>
        {saving && <span className="font-sans text-[10px] tracking-[0.15em] uppercase text-sage-600">Save {fmt(regular - price)}</span>}
      </div>
      <p className="font-sans text-[11px] text-bark-400 mt-1">Box, packaging &amp; wax seal included · card at checkout</p>
    </div>
  )
}

// Loads the box's items (with the chosen box size on garments) into the cart and
// goes to checkout. Checkout shows the box; the Pay button is hidden while paused.
function BuyBox({ box, size }: { box: ResolvedBox; size: string }) {
  const router = useRouter()
  function buy() {
    const items: CartItem[] = box.items.map(it => ({
      ...it,
      qty: 1,
      lineKey: it.id,
      selectedColor: (it as CartItem).selectedColor,
      selectedSize: isGarment(it) ? size : (it as CartItem).selectedSize,
    }))
    writeCart(items)
    router.push('/checkout')
  }
  return (
    <button
      onClick={buy}
      className="w-full bg-bark-600 text-cream-50 font-sans text-[10px] tracking-[0.25em] uppercase py-4 hover:bg-bark-700 transition-colors"
    >
      Buy This Box
    </button>
  )
}

// Box-level size selector (0–3 / 3–6 mo), applied to the garments at checkout.
function SizePicker({ size, setSize }: { size: string; setSize: (s: string) => void }) {
  return (
    <div>
      <p className="font-sans text-[9px] tracking-[0.25em] uppercase text-bark-400 mb-2">Size</p>
      <div className="flex gap-2">
        {BOX_SIZES.map(s => (
          <button
            key={s}
            onClick={() => setSize(s)}
            className={`flex-1 border px-3 py-2.5 font-sans text-xs transition-colors ${size === s ? 'border-bark-600 bg-bark-600 text-cream-50' : 'border-cream-300 text-bark-600 hover:border-bark-400'}`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

// Thumbnail shortcut — tapping opens the product preview modal.
function ItemEntry({ item, onOpen }: { item: BoxItem; onOpen: (i: BoxItem) => void }) {
  const src = productImg(item)
  return (
    <button type="button" onClick={() => onOpen(item)} className="group flex items-center gap-3 text-left w-full">
      <div className="relative w-14 h-16 shrink-0 overflow-hidden bg-cream-100 border border-cream-200">
        {src
          ? <img src={src} alt={item.name} className="w-full h-full object-cover" />
          : <span className="absolute inset-0 flex items-center justify-center text-lg">{item.imageEmoji}</span>}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-sans text-xs text-bark-600 leading-snug group-hover:text-bark-800 line-clamp-2">{item.name}</p>
        <div className="flex items-center gap-2 flex-wrap mt-0.5">
          <span className="font-sans text-[9px] tracking-[0.15em] uppercase text-gold-400">{item.category}</span>
          {item.organic && <span className="inline-flex items-center gap-0.5 text-sage-600"><Leaf size={9} /><span className="font-sans text-[8px] tracking-[0.1em] uppercase">Organic</span></span>}
        </div>
      </div>
    </button>
  )
}

// Items grouped by audience with thumbnail shortcuts.
function ItemsList({ box, onOpen }: { box: ResolvedBox; onOpen: (i: BoxItem) => void }) {
  const isMama = (i: BoxItem) =>
    i.audience === 'mama' ||
    (!i.audience && /\b(mom|mama|mother|matern|postpartum|self.?care)\b/i.test(i.category ?? ''))
  const baby = box.items.filter(i => !isMama(i))
  const mama = box.items.filter(isMama)

  return (
    <div className="space-y-5">
      {baby.length > 0 && (
        <div>
          <p className="font-sans text-[9px] tracking-[0.4em] uppercase text-gold-400 pb-1.5 mb-3 border-b border-cream-200">For Baby</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-4">
            {baby.map((item, i) => <ItemEntry key={`${item.id}-${i}`} item={item} onOpen={onOpen} />)}
          </div>
        </div>
      )}
      {mama.length > 0 && (
        <div>
          <p className="font-sans text-[9px] tracking-[0.4em] uppercase text-gold-400 pb-1.5 mb-3 border-b border-cream-200">For Mama</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-4">
            {mama.map((item, i) => <ItemEntry key={`${item.id}-${i}`} item={item} onOpen={onOpen} />)}
          </div>
        </div>
      )}
    </div>
  )
}

// Mobile modal — items + price + buy.
function ItemsModal({ box, onClose, onPreview }: { box: ResolvedBox; onClose: () => void; onPreview: (i: BoxItem) => void }) {
  const [size, setSize] = useState<string>(BOX_SIZES[0])
  const hasGarment = box.items.some(isGarment)
  return (
    <div className="fixed inset-0 z-[60] bg-bark-900/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-lg max-h-[88vh] flex flex-col overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-4 border-b border-cream-200 shrink-0">
          <div>
            <p className="font-sans text-[9px] tracking-[0.35em] uppercase text-gold-400">{box.style}</p>
            <h3 className="font-serif text-2xl text-espresso">{box.name}</h3>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-bark-400 hover:text-bark-600 transition-colors -mt-1"><X size={18} /></button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
          <ItemsList box={box} onOpen={onPreview} />
        </div>
        <div className="shrink-0 px-6 py-4 border-t border-cream-200 space-y-3">
          {hasGarment && <SizePicker size={size} setSize={setSize} />}
          <PriceBlock box={box} />
          <BuyBox box={box} size={size} />
        </div>
      </div>
    </div>
  )
}

// Full-bleed product preview modal (unchanged — 2-col photo grid + lightbox + certs).
function ProductPreviewModal({ item, onClose }: { item: BoxItem; onClose: () => void }) {
  const [data, setData] = useState<{
    gallery?: Array<{ id: string; image_url: string; label?: string }>
    product?: { description?: string; ingredients?: string; certifications?: Array<{ key: string; name?: string; iconUrl?: string | null; certificateUrl?: string | null }> }
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const touchX = useRef<number | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/products/${item.id}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (alive) { setData(d); setLoading(false) } })
      .catch(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [item.id])

  const gallery = data?.gallery ?? []
  const cells: Array<{ src: string | null; label?: string }> = gallery.length ? gallery.map(g => ({ src: g.image_url, label: g.label ?? undefined })) : [{ src: productImg(item) }]
  const n = cells.length

  useEffect(() => {
    if (lightbox === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setLightbox(i => i !== null ? (i - 1 + n) % n : null)
      if (e.key === 'ArrowRight') setLightbox(i => i !== null ? (i + 1) % n : null)
      if (e.key === 'Escape') setLightbox(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [lightbox, n])
  const certs = data?.product?.certifications ?? []
  const description = data?.product?.description
  const ingredients = data?.product?.ingredients

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-bark-900/60 backdrop-blur-sm flex items-center justify-center p-4 lg:p-10" onClick={onClose}>
        <div className="bg-white w-full max-w-4xl max-h-[92vh] flex flex-col lg:flex-row lg:overflow-hidden overflow-y-auto relative" onClick={e => e.stopPropagation()}>
          <button onClick={onClose} aria-label="Close" className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center text-bark-400 hover:text-bark-600 bg-white/80"><X size={16} /></button>
          <div className="lg:w-[55%] shrink-0 bg-cream-50 p-4 lg:p-5 lg:overflow-y-auto">
            {loading && gallery.length === 0 ? (
              <div className="aspect-[3/4] flex items-center justify-center bg-cream-100">
                <div className="w-6 h-6 border-2 border-cream-300 border-t-bark-600 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {cells.map((c, i) => (
                  <button key={i} type="button" onClick={() => c.src && setLightbox(i)} disabled={!c.src}
                    className="group relative w-full overflow-hidden bg-cream-200 cursor-zoom-in disabled:cursor-default" style={{ aspectRatio: '3/4' }}>
                    {c.src
                      ? <img src={c.src} alt={c.label ?? item.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      : <div className="absolute inset-0 flex items-center justify-center text-6xl"><span className="select-none">{item.imageEmoji}</span></div>}
                    {c.src && <span className="absolute bottom-2 right-2 w-7 h-7 bg-cream-50/85 text-bark-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><ZoomIn size={13} /></span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex-1 lg:min-h-0 lg:overflow-y-auto p-6 lg:p-8 flex flex-col">
            <p className="font-sans text-[10px] tracking-[0.35em] uppercase text-gold-400 mb-2">{item.category}</p>
            <h2 className="font-serif text-2xl lg:text-3xl text-espresso leading-tight mb-2">{item.name}</h2>
            <p className="font-sans text-base text-bark-400 mb-2">{fmt(item.price)}</p>
            {description && (
              <div className="border-t border-cream-300 py-3.5 mt-2">
                <p className="text-base text-bark-600 leading-relaxed" style={{ fontFamily: 'var(--font-cormorant)' }}>{description}</p>
              </div>
            )}
            {(certs.length > 0 || item.organic) && (
              <div className="border-t border-cream-300 py-4">
                <CertBadges certs={certs} organic={item.organic} />
              </div>
            )}
            {ingredients && (
              <div className="border-t border-cream-300 py-3.5 flex items-start gap-2">
                <span className="font-sans text-[9px] tracking-[0.2em] uppercase text-bark-400 mt-0.5 shrink-0">Materials</span>
                <span className="font-sans text-xs text-bark-400">{ingredients}</span>
              </div>
            )}
            <div className="border-t border-cream-300 pt-4 mt-auto">
              <Link href={`/products/${item.id}`} className="font-sans text-[10px] tracking-[0.15em] uppercase text-bark-400 hover:text-bark-600 transition-colors">
                View full product →
              </Link>
            </div>
          </div>
        </div>
      </div>
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-[80] bg-bark-900/90 backdrop-blur-sm flex items-center justify-center p-4 sm:p-10"
          onClick={() => setLightbox(null)}
          onTouchStart={e => { touchX.current = e.touches[0].clientX }}
          onTouchEnd={e => {
            if (touchX.current === null) return
            const delta = e.changedTouches[0].clientX - touchX.current
            touchX.current = null
            if (Math.abs(delta) < 40) return
            if (delta < 0) setLightbox(i => i !== null ? (i + 1) % n : null)
            else setLightbox(i => i !== null ? (i - 1 + n) % n : null)
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cells[lightbox]?.src ?? ''}
            alt=""
            className="max-h-[92vh] max-w-[calc(100vw-2rem)] sm:max-w-[92vw] w-auto h-auto object-contain shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          {n > 1 && (
            <>
              <button
                className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
                onClick={e => { e.stopPropagation(); setLightbox(i => i !== null ? (i - 1 + n) % n : null) }}
                aria-label="Previous photo"
              >
                <ChevronLeft size={20} className="text-white" />
              </button>
              <button
                className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
                onClick={e => { e.stopPropagation(); setLightbox(i => i !== null ? (i + 1) % n : null) }}
                aria-label="Next photo"
              >
                <ChevronRight size={20} className="text-white" />
              </button>
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
                {cells.map((c, i) => c.src ? (
                  <button
                    key={i}
                    className={`transition-all duration-200 ${i === lightbox ? 'w-5 h-1 bg-white' : 'w-1.5 h-1.5 bg-white/40'}`}
                    onClick={e => { e.stopPropagation(); setLightbox(i) }}
                    aria-label={`View photo ${i + 1}`}
                  />
                ) : null)}
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}

// Simple swipeable image strip for the box (no card).
function BoxImages({ box }: { box: ResolvedBox }) {
  const images = box.images?.length ? box.images : (box.image ? [box.image] : [])
  const [idx, setIdx] = useState(0)
  const n = images.length

  if (n === 0) {
    return (
      <div className="relative h-full lg:absolute lg:inset-0 bg-cream-100 flex items-center justify-center">
        <span className="font-script text-4xl text-bark-300">Petite Lavande</span>
      </div>
    )
  }

  return (
    <>
      <img src={images[idx]} alt={box.name} className="w-full h-full object-cover lg:absolute lg:inset-0 transition-opacity duration-500" />
      {n > 1 && (
        <>
          <button
            onClick={() => setIdx(i => (i - 1 + n) % n)}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/75 hover:bg-white flex items-center justify-center transition-colors"
            aria-label="Previous photo"
          >
            <ChevronLeft size={18} className="text-bark-600" />
          </button>
          <button
            onClick={() => setIdx(i => (i + 1) % n)}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/75 hover:bg-white flex items-center justify-center transition-colors"
            aria-label="Next photo"
          >
            <ChevronRight size={18} className="text-bark-600" />
          </button>
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)} className={`transition-all duration-300 ${i === idx ? 'w-4 h-1 bg-white' : 'w-1 h-1 bg-white/50'}`} />
            ))}
          </div>
        </>
      )}
    </>
  )
}

function editionSlug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// One box — full editorial section, 95vh, image + info panel, no card borders.
function BoxSection({
  box, style, flip, onOpenItems, onPreview,
}: {
  box: ResolvedBox; style: string; flip: boolean
  onOpenItems: (b: ResolvedBox) => void; onPreview: (i: BoxItem) => void
}) {
  const [panelBg, setPanelBg] = useState<string | null>(null)
  const [size, setSize] = useState<string>(BOX_SIZES[0])
  const hasGarment = box.items.some(isGarment)
  useEffect(() => {
    fetch(`/api/site-images?keys=boxes.info_bg`)
      .then(r => r.json())
      .then(d => setPanelBg(d.images?.['boxes.info_bg']?.public_url ?? null))
      .catch(() => {})
  }, [])

  return (
    <section
      id={`box-${box.slug}`}
      className="scroll-mt-20 flex flex-col lg:flex-row border-b border-cream-300"
      style={{ minHeight: '90vh' }}
    >
      {/* Image — 60% width on desktop, full height, flies in from the image side */}
      {/* Mobile: image flows at its natural height (shown in full). Desktop: fills
          the 60% column. */}
      <FlyIn from={flip ? 'right' : 'left'} className={`relative w-full lg:w-[60%] overflow-hidden lg:min-h-[90vh] ${flip ? 'lg:order-2' : ''}`} style={{ flex: '0 0 auto' }}>
        {/* Web: image covers the whole column. Mobile: fixed ~80svh. */}
        <div className="relative h-[80svh] lg:h-auto lg:absolute lg:inset-0">
          <BoxImages box={box} />
        </div>
      </FlyIn>

      {/* Info panel — desktop: 95vh min-height, full panel scrolls so nothing is ever cut off;
           mobile: natural flow */}
      <div
        className={`relative isolate lg:w-[40%] flex flex-col lg:min-h-[90vh] lg:overflow-y-auto ${flip ? 'lg:order-1' : ''}`}
        style={panelBg ? {
          backgroundImage: `linear-gradient(rgba(255,255,255,0.88), rgba(255,255,255,0.88)), url(${panelBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : undefined}
      >
        {SHOW_BOTANICAL && (
          <div className="box-botanical-panel absolute inset-0 pointer-events-none" style={{ zIndex: -1 }} aria-hidden="true" />
        )}

        {/* Top: identity */}
        <div className="px-8 lg:px-12 xl:px-16 pt-12 lg:pt-16">
          <FlyIn delay={80}>
            <div className="flex items-center gap-2 mb-3">
              {box.style && <span className="font-sans text-[9px] tracking-[0.3em] uppercase text-gold-400">{box.style}</span>}
            </div>
          </FlyIn>
          <FlyIn delay={100}>
            <h2 className="font-serif text-5xl lg:text-6xl text-espresso leading-[1.02] mb-5">{box.name}</h2>
          </FlyIn>
          {box.tagline && (
            <FlyIn delay={200}>
              <p className="font-cormorant text-xl italic text-espresso-light leading-relaxed mb-6">{box.tagline}</p>
            </FlyIn>
          )}
          {box.description && (
            <FlyIn delay={280}>
              <p className="font-sans text-sm text-espresso-light leading-relaxed">{box.description}</p>
            </FlyIn>
          )}
        </div>

        {/* Middle: items — always fully visible, inner scroll if list is very long */}
        {box.items.length > 0 && (
          <div className="px-8 lg:px-12 xl:px-16 mt-8">
            <p className="font-sans text-[9px] tracking-[0.4em] uppercase text-bark-300 mb-4">What&apos;s Inside</p>
            <div className="max-h-[320px] lg:max-h-[50vh] overflow-y-auto scrollbar-hide pr-1 pb-2">
              <ItemsList box={box} onOpen={onPreview} />
            </div>
          </div>
        )}

        {/* Bottom: price + buy */}
        <FlyIn delay={450} className="px-8 lg:px-12 xl:px-16 pb-12 lg:pb-10 mt-6">
          <div className="border-t border-cream-300 pt-6 space-y-5">
            {hasGarment && <SizePicker size={size} setSize={setSize} />}
            <PriceBlock box={box} />
            <BuyBox box={box} size={size} />
          </div>
        </FlyIn>
      </div>
    </section>
  )
}

export function AestheticBoxes({ byStyle }: { byStyle: Array<{ style: string; boxes: ResolvedBox[] }> }) {
  const [openBox, setOpenBox] = useState<ResolvedBox | null>(null)
  const [previewItem, setPreviewItem] = useState<BoxItem | null>(null)

  let globalIdx = 0

  return (
    <>
      {byStyle.map(({ style, boxes }) => (
        <div key={style} id={`edition-${editionSlug(style)}`} className="scroll-mt-20">
          {/* Edition label — clean horizontal divider, no repeat count */}
          <div className="flex items-center gap-8 px-8 lg:px-12 xl:px-16 py-6 border-b border-cream-300">
            <span className="font-serif text-2xl sm:text-3xl text-espresso shrink-0 tracking-wide">{style}</span>
            <span className="flex-1 h-px bg-cream-300" />
          </div>
          {boxes.map(box => {
            const flip = globalIdx++ % 2 === 1
            return (
              <BoxSection
                key={box.slug}
                box={box}
                style={style}
                flip={flip}
                onOpenItems={setOpenBox}
                onPreview={setPreviewItem}
              />
            )
          })}
        </div>
      ))}
      {openBox && <ItemsModal box={openBox} onClose={() => setOpenBox(null)} onPreview={setPreviewItem} />}
      {previewItem && <ProductPreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />}
    </>
  )
}
