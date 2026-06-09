'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { X, ArrowRight, Plus, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/lib/products'
import type { Product, ProductCategory } from '@/types'
import type { CollectionDef } from '@/lib/collections-db'
import { addToCart } from '@/lib/cart'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

function homeImg(slot: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/home-images/${slot}.jpg`
}

function productImg(id: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/product-images/${id}.jpg`
}

interface BoxItem { slug: string; name: string; tagline?: string; image?: string }

interface Category {
  id: string
  label: string
  sub: string
  img: string
  productIds: string[]
}

// What each occasion pulls. Categories come from the live catalog; "bundle"
// shows prebuilt boxes; "custom" shows everything grouped by category.
const OCCASION_CATEGORIES: Record<string, ProductCategory[]> = {
  newborn: ['garment', 'swaddle'],
  mama: ['mom'],
  custom: [...CATEGORY_ORDER],
}

// ─── Modal ───────────────────────────────────────────────────────────────────

function ProductTile({ product }: { product: Product }) {
  const [added, setAdded] = useState(false)
  function add(e: React.MouseEvent) {
    e.stopPropagation()
    addToCart(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 1600)
  }
  return (
    <div className="group">
      <div className="relative aspect-[3/4] bg-cream-100 mb-2 overflow-hidden">
        <Image
          src={product.image || productImg(product.id)}
          alt={product.name}
          fill
          className="object-cover"
          onError={e => {
            const t = e.currentTarget as HTMLImageElement
            t.style.display = 'none'
            const next = t.nextElementSibling as HTMLElement | null
            if (next) next.style.display = 'flex'
          }}
        />
        <div className="absolute inset-0 items-center justify-center text-4xl hidden" style={{ display: 'none' }}>
          {product.imageEmoji}
        </div>
        <button
          onClick={add}
          className={`absolute bottom-2 right-2 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full font-sans text-[9px] tracking-[0.1em] uppercase shadow-sm transition-colors ${added ? 'bg-sage-500 text-white' : 'bg-white/95 text-bark-600 hover:bg-white'}`}
        >
          {added ? <><Check size={11} /> Added</> : <><Plus size={11} /> Add</>}
        </button>
      </div>
      <p className="font-sans text-xs font-medium text-bark-600 leading-snug">{product.name}</p>
      <p className="font-sans text-[10px] text-bark-400 mt-0.5">${(product.price / 100).toFixed(2)}</p>
    </div>
  )
}

function CollectionModal({ cat, byCategory, boxes, onClose }: {
  cat: Category
  byCategory: Record<string, Product[]>
  boxes: BoxItem[]
  onClose: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const isBundle = cat.id === 'bundle'
  const cats = OCCASION_CATEGORIES[cat.id]
  // Show category sections (newborn/mama/custom), prebuilt boxes (bundle),
  // or fall back to the collection's product_ids for any other collection.
  const sections: { label: string; products: Product[] }[] = cats
    ? cats.map(c => ({ label: CATEGORY_LABELS[c], products: byCategory[c] ?? [] })).filter(s => s.products.length > 0)
    : (() => {
        const all = Object.values(byCategory).flat()
        const map = new Map(all.map(p => [p.id, p]))
        return [{ label: '', products: (cat.productIds ?? []).map(id => map.get(id)).filter(Boolean) as Product[] }]
      })()

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={onClose}>
      <div className="bg-cream-50 w-full sm:max-w-3xl max-h-[88vh] flex flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between p-6 pb-4 border-b border-cream-300 shrink-0">
          <div>
            <p className="font-sans text-[9px] tracking-[0.35em] uppercase text-gold-400 mb-1">{cat.sub}</p>
            <h2 className="font-serif text-2xl text-bark-600">{cat.label}</h2>
          </div>
          <button onClick={onClose} className="text-bark-400 hover:text-bark-600 transition-colors ml-4 mt-0.5">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          {isBundle ? (
            boxes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {boxes.map(box => (
                  <button key={box.slug} onClick={() => { router.push(`/boxes/${box.slug}`); onClose() }} className="group text-left">
                    <div className="relative aspect-[4/3] bg-cream-100 mb-2 overflow-hidden">
                      {box.image && <Image src={box.image} alt={box.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />}
                    </div>
                    <p className="font-sans text-sm font-medium text-bark-600 leading-snug">{box.name}</p>
                    {box.tagline && <p className="font-sans text-[11px] text-bark-400 mt-0.5">{box.tagline}</p>}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-center py-12 font-serif text-xl text-bark-400">No prebuilt boxes yet.</p>
            )
          ) : sections.length > 0 ? (
            <div className="space-y-6">
              {sections.map((s, i) => (
                <div key={i}>
                  {s.label && <p className="font-sans text-[10px] tracking-[0.25em] uppercase text-bark-400 mb-3">{s.label}</p>}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {s.products.map(p => <ProductTile key={p.id} product={p} />)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-12 text-center">
              <div>
                <p className="font-serif text-2xl text-bark-400 mb-2">Build your own.</p>
                <p className="font-sans text-sm text-bark-400">Pick any 5 items you love — we&apos;ll wrap it beautifully.</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 pt-4 border-t border-cream-300 shrink-0">
          <button
            onClick={() => { router.push(isBundle ? '/boxes' : '/build'); onClose() }}
            className="w-full bg-bark-600 text-cream-50 font-sans text-[11px] tracking-[0.2em] uppercase py-4 hover:bg-bark-700 transition-colors flex items-center justify-center gap-2"
          >
            {isBundle ? 'Shop Prebuilt Boxes' : 'Build This Box'}
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Section ─────────────────────────────────────────────────────────────────

export interface CollectionsInitial {
  categories: Category[]
  byCategory: Record<string, Product[]>
  boxes: BoxItem[]
}

export function CollectionsSection({ initial }: { initial?: CollectionsInitial }) {
  const [categories, setCategories] = useState<Category[]>(initial?.categories ?? [])
  const [byCategory, setByCategory] = useState<Record<string, Product[]>>(initial?.byCategory ?? {})
  const [boxes, setBoxes] = useState<BoxItem[]>(initial?.boxes ?? [])
  const [active, setActive] = useState<Category | null>(null)
  const [loading, setLoading] = useState(!initial)

  useEffect(() => {
    if (initial) return // server provided data — no client fetch / loading state
    async function load() {
      try {
        // Live active catalog (grouped) + collections + prebuilt boxes
        const [colRes, prodRes, boxRes] = await Promise.all([
          fetch('/api/collections'),
          fetch('/api/products/all'),
          fetch('/api/boxes'),
        ])
        if (prodRes.ok) {
          const pd = await prodRes.json()
          setByCategory(pd.byCategory ?? {})
        }
        if (boxRes.ok) {
          const bd = await boxRes.json()
          setBoxes((bd.boxes ?? []).map((b: { slug: string; name: string; tagline?: string; image?: string }) => ({ slug: b.slug, name: b.name, tagline: b.tagline, image: b.image })))
        }
        if (colRes.ok) {
          const data = await colRes.json()
          const cats: Category[] = data.collections.map((col: CollectionDef) => ({
            id: col.id,
            label: col.label,
            sub: col.sub,
            img: homeImg(col.home_image_slot),
            productIds: col.product_ids,
          }))
          setCategories(cats)
        }
      } catch (err) {
        console.error('Failed to load collections:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) return <div className="py-12 text-center text-bark-400">Loading collections...</div>
  if (!categories.length) return null

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((cat, i) => (
          <div
            key={cat.id}
            className={`group relative overflow-hidden cursor-pointer border-b border-cream-300
              sm:border-b-0 sm:border-r
              ${i === categories.length - 1 ? 'sm:border-r-0' : ''}
              lg:border-r lg:last:border-r-0`}
            onClick={() => setActive(cat)}
          >
            <div className="relative w-full aspect-[4/3] sm:aspect-[3/4] lg:aspect-none lg:h-[clamp(300px,58vh,600px)]">
              <Image
                src={cat.img}
                alt={cat.label}
                fill
                className="object-cover object-top group-hover:scale-105 transition-transform duration-700"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-bark-800/50 via-transparent to-transparent" />
              <div className="absolute top-4 left-0 right-0 text-center px-3 hidden sm:block">
                <p className="font-sans text-[8px] tracking-[0.35em] uppercase text-white/70">{cat.sub}</p>
              </div>
              <div className="absolute bottom-0 inset-x-0 flex justify-center pb-5 px-4">
                <span className="w-full max-w-[180px] text-center bg-white/95 text-bark-700 font-sans text-[9px] tracking-[0.2em] uppercase px-3 py-2.5 group-hover:bg-white transition-colors shadow-sm">
                  {cat.label}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {active && <CollectionModal cat={active} byCategory={byCategory} boxes={boxes} onClose={() => setActive(null)} />}
    </>
  )
}
