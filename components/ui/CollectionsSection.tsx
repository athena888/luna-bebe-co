'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { X, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getProductById } from '@/lib/products'
import type { Product } from '@/types'
import type { CollectionDef } from '@/lib/collections-db'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

function homeImg(slot: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/home-images/${slot}.jpg`
}

function productImg(id: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/product-images/${id}.jpg`
}

interface Category {
  id: string
  label: string
  sub: string
  img: string
  productIds: string[]
}

// ─── Modal ───────────────────────────────────────────────────────────────────

function CollectionModal({ cat, onClose }: { cat: Category; onClose: () => void }) {
  const router = useRouter()
  const ids = cat.productIds ?? []
  const products: Product[] = ids.map(id => getProductById(id)).filter(Boolean) as Product[]

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-cream-50 w-full sm:max-w-2xl max-h-[88vh] flex flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-cream-300 shrink-0">
          <div>
            <p className="font-sans text-[9px] tracking-[0.35em] uppercase text-gold-400 mb-1">{cat.sub}</p>
            <h2 className="font-serif text-2xl text-bark-600">{cat.label}</h2>
          </div>
          <button onClick={onClose} className="text-bark-400 hover:text-bark-600 transition-colors ml-4 mt-0.5">
            <X size={20} />
          </button>
        </div>

        {/* Items grid */}
        <div className="overflow-y-auto flex-1 p-6">
          {products.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {products.map(product => (
                <div key={product.id} className="group">
                  <div className="relative aspect-square bg-cream-100 mb-2 overflow-hidden rounded-sm">
                    <Image
                      src={productImg(product.id)}
                      alt={product.name}
                      fill
                      className="object-cover"
                      unoptimized
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
                  </div>
                  <p className="font-sans text-xs font-medium text-bark-600 leading-snug">{product.name}</p>
                  <p className="font-sans text-[10px] text-bark-400 mt-0.5">${(product.price / 100).toFixed(2)}</p>
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

        {/* CTA */}
        <div className="p-6 pt-4 border-t border-cream-300 shrink-0">
          <button
            onClick={() => { router.push('/build'); onClose() }}
            className="w-full bg-bark-600 text-cream-50 font-sans text-[11px] tracking-[0.2em] uppercase py-4 hover:bg-bark-700 transition-colors flex items-center justify-center gap-2"
          >
            Build This Box
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Section ─────────────────────────────────────────────────────────────────

export function CollectionsSection() {
  const [categories, setCategories] = useState<Category[]>([])
  const [active, setActive] = useState<Category | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/collections')
        if (res.ok) {
          const data = await res.json()
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

      {active && <CollectionModal cat={active} onClose={() => setActive(null)} />}
    </>
  )
}
