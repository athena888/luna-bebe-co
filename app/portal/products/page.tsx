'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { PRODUCTS, CATEGORY_LABELS, CATEGORY_ORDER } from '@/lib/products'
import type { ProductCategory } from '@/types'
import { Upload, CheckCircle, Loader, Settings } from 'lucide-react'
import Image from 'next/image'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

function getStorageUrl(productId: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/product-images/${productId}.jpg`
}

type UploadState = 'idle' | 'uploading' | 'done' | 'error'

function ProductImageCard({ productId, name }: { productId: string; name: string }) {
  const [state, setState] = useState<UploadState>('idle')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [hasExisting, setHasExisting] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  const displayUrl = imageUrl ?? (hasExisting ? getStorageUrl(productId) : null)

  async function handleFile(file: File) {
    setState('uploading')
    const form = new FormData()
    form.append('file', file)
    form.append('productId', productId)
    try {
      const res = await fetch('/api/portal/products/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (data.url) {
        setImageUrl(data.url + `?t=${Date.now()}`)
        setState('done')
      } else {
        setState('error')
      }
    } catch {
      setState('error')
    }
  }

  return (
    <div className="bg-cream-50 border border-cream-200 rounded-xl overflow-hidden">
      {/* Image area */}
      <div
        className="relative aspect-square bg-cream-200 cursor-pointer group"
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault()
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
      >
        {displayUrl && (
          <Image
            src={displayUrl}
            alt={name}
            fill
            className="object-cover"
            unoptimized
            onError={() => setHasExisting(false)}
          />
        )}

        {/* Upload overlay */}
        <div className={`absolute inset-0 flex flex-col items-center justify-center gap-2 transition-opacity
          ${state === 'uploading' ? 'bg-cream-50/80 opacity-100' : 'bg-bark-600/0 opacity-0 group-hover:opacity-100 group-hover:bg-bark-600/50'}`}>
          {state === 'uploading' ? (
            <Loader size={24} className="text-bark-600 animate-spin" />
          ) : state === 'done' ? (
            <CheckCircle size={24} className="text-cream-50" />
          ) : (
            <>
              <Upload size={20} className="text-cream-50" />
              <span className="font-sans text-[10px] tracking-[0.2em] uppercase text-cream-50">
                {displayUrl ? 'Replace' : 'Upload'}
              </span>
            </>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ''
          }}
        />
      </div>

      {/* Name + Edit link */}
      <div className="px-3 py-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-sans text-xs text-bark-600 leading-snug truncate">{name}</p>
          <p className="font-sans text-[10px] text-bark-400 mt-0.5">{productId}</p>
          {state === 'error' && (
            <p className="font-sans text-[10px] text-red-500 mt-1">Upload failed — try again</p>
          )}
        </div>
        <Link
          href={`/portal/products/${productId}`}
          className="shrink-0 p-1.5 rounded-lg hover:bg-cream-200 text-bark-400 hover:text-bark-600 transition-colors"
          title="Edit product details"
          onClick={e => e.stopPropagation()}
        >
          <Settings size={14} />
        </Link>
      </div>
    </div>
  )
}

export default function ProductsPortalPage() {
  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="font-serif text-3xl text-bark-600">Products</h1>
          <p className="font-sans text-sm text-bark-400 mt-1">
            Click a card to swap the primary photo. Use the <Settings size={12} className="inline mb-0.5" /> icon to edit details, gallery, inventory, and AI-generate images.
          </p>
        </div>
        <Link
          href="/portal/products/bulk"
          className="font-sans text-[11px] tracking-[0.2em] uppercase text-bark-600 hover:text-bark-700 border border-bark-600 px-4 py-2 rounded transition-colors whitespace-nowrap"
        >
          Bulk Import
        </Link>
      </div>

      {CATEGORY_ORDER.map((cat: ProductCategory) => (
        <div key={cat} className="mb-10">
          <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark-400 mb-4 pb-3 border-b border-cream-300">
            {CATEGORY_LABELS[cat]}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {PRODUCTS[cat].map(product => (
              <ProductImageCard
                key={product.id}
                productId={product.id}
                name={product.name}
              />
            ))}
          </div>
        </div>
      ))}

      <div className="mt-8 p-5 bg-cream-200/50 border border-cream-300 rounded-xl">
        <p className="font-sans text-xs text-bark-400 leading-loose">
          <span className="font-medium text-bark-600">Images are stored in Supabase Storage</span> under the <code className="bg-cream-300/60 px-1 rounded">product-images</code> bucket
          and automatically appear in the box builder for customers. No code changes needed after upload.
        </p>
      </div>
    </div>
  )
}
