'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useIsEs } from '@/lib/use-is-es'
import type { Product } from '@/types'
import type { CollectionDef } from '@/lib/collections-db'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

function homeImg(slot: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/home-images/${slot}.jpg`
}

interface BoxItem { slug: string; name: string; tagline?: string; image?: string }

interface Category {
  id: string
  label: string
  sub: string
  img: string
  productIds: string[]
}

// Tiles deep-link straight into the box pages (or the builder). Locale-aware:
// a Spanish visitor must STAY under /es — an EN href here silently flips the
// whole session to English (Emily 2026-08-14).
// The "bundle" tile is a box carousel handled separately below.
const TILE_LINKS: Record<string, { en: string; es: string }> = {
  newborn: { en: '/boxes/signature-baby-gift-box', es: '/es/canastillas/signature-baby-gift-box' },
  mama: { en: '/boxes/new-mom-gift-box', es: '/es/canastillas/new-mom-gift-box' },
  custom: { en: '/build', es: '/es/build' },
}

// ─── Bundle tile — the Mère et Bébé box as a static photo card ───────────────

const BUNDLE_SUB = 'For mother & baby — one gift, both of them'

function BundleTile({ boxes, fallback, isEs }: { boxes: BoxItem[]; fallback: Category; isEs: boolean }) {
  // Subtitle comes from the (possibly es-translated) collection row; the
  // constant is only the last-resort fallback.
  const bundleSub = fallback.sub || BUNDLE_SUB
  // The mother-&-baby flagship (slug kept stable through the rename).
  const box = boxes.find(b => b.name === 'Mère et Bébé') ?? boxes.find(b => b.slug === 'petit-ciel') ?? boxes[0]

  // Tile photo: the Homepage editor's "Mama & Baby Bundle" upload (the
  // category fallback image) wins; the prebuilt box's cover is the backstop.
  const img = fallback.img ?? box?.image ?? null
  const href = isEs ? '/es/canastillas/themed-baby-gift-box' : '/boxes/themed-baby-gift-box'  // Mama et Bébé (merged themed box)
  const name = box?.name ?? 'Mère et Bébé'

  return (
    <Link href={href} className="group relative overflow-hidden bg-cream-200 block">
      <div className="relative w-full aspect-[3/4] lg:aspect-none lg:h-[clamp(300px,58vh,600px)]">
        {img
          ? <Image src={img} alt={name} fill className="object-cover object-top group-hover:scale-105 transition-transform duration-700" unoptimized />
          : <div className="absolute inset-0 bg-cream-200" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
        {/* Name + subtitle baked into the photo */}
        <div className="absolute bottom-0 inset-x-0 flex flex-col items-center text-center pb-4 px-3">
          <span className="text-white font-sans text-[11px] tracking-[0.2em] uppercase px-2 py-1 drop-shadow-md">{name}</span>
          <span className="text-white/85 font-serif italic text-[12px] leading-snug drop-shadow-md">{bundleSub}</span>
        </div>
      </div>
    </Link>
  )
}

// ─── Section ─────────────────────────────────────────────────────────────────

export interface CollectionsInitial {
  categories: Category[]
  byCategory: Record<string, Product[]>
  boxes: BoxItem[]
}

export function CollectionsSection({ initial }: { initial?: CollectionsInitial }) {
  const isEs = useIsEs()
  const [categories, setCategories] = useState<Category[]>(initial?.categories ?? [])
  const [boxes, setBoxes] = useState<BoxItem[]>(initial?.boxes ?? [])
  const [loading, setLoading] = useState(!initial)

  useEffect(() => {
    if (initial) return // server provided data — no client fetch / loading state
    async function load() {
      try {
        const [colRes, boxRes] = await Promise.all([
          fetch('/api/collections'),
          fetch('/api/boxes'),
        ])
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
    /* Full-bleed 2-up on mobile / 4-up on desktop; hairline dividers via gap-px */
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-cream-300">
      {categories.map((cat) => (
        cat.id === 'bundle' ? (
          <BundleTile key={cat.id} boxes={boxes} fallback={cat} isEs={isEs} />
        ) : (
          <Link
            key={cat.id}
            href={TILE_LINKS[cat.id]?.[isEs ? 'es' : 'en'] ?? (isEs ? '/es/build' : '/build')}
            className="group relative overflow-hidden bg-cream-200 block"
          >
            <div className="relative w-full aspect-[3/4] lg:aspect-none lg:h-[clamp(300px,58vh,600px)]">
              <Image
                src={cat.img}
                alt={cat.label}
                fill
                className="object-cover object-top group-hover:scale-105 transition-transform duration-700"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
              {/* Label + tagline — baked over the image (no button background) */}
              <div className="absolute bottom-0 inset-x-0 flex flex-col items-center text-center pb-4 px-3">
                <span className="text-white font-sans text-[11px] tracking-[0.2em] uppercase px-2 py-1 drop-shadow-md">
                  {cat.label}
                </span>
                {cat.sub && (
                  <span className="text-white/85 font-serif italic text-[12px] leading-snug drop-shadow-md">{cat.sub}</span>
                )}
              </div>
            </div>
          </Link>
        )
      ))}
    </div>
  )
}
