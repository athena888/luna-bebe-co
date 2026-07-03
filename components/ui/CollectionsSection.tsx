'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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

// Tiles deep-link straight into the build page (or its category anchors).
// The "bundle" tile is a box carousel handled separately below.
const TILE_LINKS: Record<string, string> = {
  newborn: '/build#cat-garment',   // baby garments list
  mama: '/build#cat-mom',          // mama's list
  custom: '/build',                // top of the build page
}

// ─── Bundle tile — one prebuilt box at a time, arrows both ways ──────────────

function BundleTile({ boxes, fallback }: { boxes: BoxItem[]; fallback: Category }) {
  const [idx, setIdx] = useState(0)
  const box = boxes[idx % Math.max(1, boxes.length)]

  // No boxes yet → plain tile linking to the boxes page.
  if (!box) {
    return (
      <Link href="/boxes" className="group relative overflow-hidden bg-cream-200 block">
        <div className="relative w-full aspect-[3/4] lg:aspect-none lg:h-[clamp(300px,58vh,600px)]">
          <Image src={fallback.img} alt={fallback.label} fill className="object-cover object-top group-hover:scale-105 transition-transform duration-700" unoptimized />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
          <div className="absolute bottom-0 inset-x-0 flex justify-center pb-5 px-3">
            <span className="text-center text-white font-sans text-[10px] tracking-[0.2em] uppercase px-2 py-1 drop-shadow-md">{fallback.label}</span>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <div className="group relative overflow-hidden bg-cream-200">
      <div className="relative w-full aspect-[3/4] lg:aspect-none lg:h-[clamp(300px,58vh,600px)]">
        {/* Photo links to the exact box on the boxes page */}
        <Link href={`/boxes#box-${box.slug}`} className="absolute inset-0 block">
          {box.image
            ? <Image src={box.image} alt={box.name} fill className="object-cover object-top group-hover:scale-105 transition-transform duration-700" unoptimized />
            : <div className="absolute inset-0 bg-cream-200" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
          {/* Name baked into the photo */}
          <div className="absolute bottom-0 inset-x-0 flex justify-center pb-5 px-3">
            <span className="text-center text-white font-sans text-[10px] tracking-[0.2em] uppercase px-2 py-1 drop-shadow-md">{box.name}</span>
          </div>
        </Link>

        {/* Arrows — cycle through the boxes */}
        {boxes.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setIdx(i => (i - 1 + boxes.length) % boxes.length)}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full pl-round-full bg-white/85 shadow-sm flex items-center justify-center text-bark-600 hover:bg-white transition-colors"
              aria-label="Previous box"
            >
              <ChevronLeft size={17} strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={() => setIdx(i => (i + 1) % boxes.length)}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full pl-round-full bg-white/85 shadow-sm flex items-center justify-center text-bark-600 hover:bg-white transition-colors"
              aria-label="Next box"
            >
              <ChevronRight size={17} strokeWidth={1.5} />
            </button>
          </>
        )}
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
          <BundleTile key={cat.id} boxes={boxes} fallback={cat} />
        ) : (
          <Link
            key={cat.id}
            href={TILE_LINKS[cat.id] ?? '/build'}
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
              {/* Label — text only, baked over the image (no button background) */}
              <div className="absolute bottom-0 inset-x-0 flex justify-center pb-5 px-3">
                <span className="text-center text-white font-sans text-[10px] tracking-[0.2em] uppercase px-2 py-1 drop-shadow-md">
                  {cat.label}
                </span>
              </div>
            </div>
          </Link>
        )
      ))}
    </div>
  )
}
