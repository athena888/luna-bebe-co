'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/lib/products'
import { PRODUCT_TAGS } from '@/lib/product-tags'
import type { ProductCategory, Product } from '@/types'
import { Upload, CheckCircle, Loader, Settings, Trash2, Plus, X, Sparkles } from 'lucide-react'
import Image from 'next/image'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

function getStorageUrl(productId: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/product-images/${productId}.jpg`
}

type UploadState = 'idle' | 'uploading' | 'done' | 'error'

function ProductImageCard({
  product,
  onDelete,
}: {
  product: Product
  onDelete: (id: string) => void
}) {
  const [state, setState] = useState<UploadState>('idle')
  const [imageUrl, setImageUrl] = useState<string | null>(product.image ?? null)
  const [hasExisting, setHasExisting] = useState(!!product.image)
  const inputRef = useRef<HTMLInputElement>(null)

  const displayUrl = imageUrl ?? (hasExisting ? getStorageUrl(product.id) : getStorageUrl(product.id))

  async function handleFile(file: File) {
    setState('uploading')
    const form = new FormData()
    form.append('file', file)
    form.append('productId', product.id)
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
    <div className="bg-cream-50 border border-cream-200 rounded-xl overflow-hidden group/card">
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
            alt={product.name}
            fill
            className="object-cover"
            unoptimized
            onError={() => { setHasExisting(false); setImageUrl(null) }}
          />
        )}
        {!displayUrl && (
          <div className="absolute inset-0 flex items-center justify-center text-4xl">{product.imageEmoji}</div>
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
              <span className="font-sans text-[10px] tracking-[0.2em] uppercase text-cream-50">Replace</span>
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

      {/* Name + actions */}
      <div className="px-3 py-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-sans text-xs text-bark-600 leading-snug truncate">{product.name}</p>
          <p className="font-sans text-[10px] text-bark-400 mt-0.5">{product.id}</p>
          {state === 'error' && (
            <p className="font-sans text-[10px] text-red-500 mt-1">Upload failed — try again</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Link
            href={`/portal/products/${product.id}`}
            className="p-1.5 rounded-lg hover:bg-cream-200 text-bark-400 hover:text-bark-600 transition-colors"
            title="Edit product details"
            onClick={e => e.stopPropagation()}
          >
            <Settings size={14} />
          </Link>
          <button
            onClick={() => onDelete(product.id)}
            className="p-1.5 rounded-lg hover:bg-red-50 text-bark-400 hover:text-red-500 transition-colors"
            title="Delete product"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

const inputCls = "w-full px-3 py-2.5 border border-cream-300 bg-white font-sans text-sm text-bark-600 placeholder:text-bark-400/40 focus:outline-none focus:border-bark-400 transition-colors rounded"
const labelCls = "block font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-1.5"

function AddProductModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<ProductCategory>('swaddle')
  const [price, setPrice] = useState('')
  const [emoji, setEmoji] = useState('🎁')
  const [tag, setTag] = useState('')
  const [description, setDescription] = useState('')
  const [ingredients, setIngredients] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!name.trim()) { setError('Name is required'); return }
    const priceNum = parseFloat(price)
    if (isNaN(priceNum) || priceNum < 0) { setError('Valid price is required'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/portal/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, category, price: Math.round(priceNum * 100),
          imageEmoji: emoji, tag: tag || null, description, ingredients,
        }),
      })
      const data = await res.json()
      if (data.product) {
        onCreated()
      } else {
        setError(data.error || 'Failed to create product')
      }
    } catch {
      setError('Failed to create product')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-bark-600/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-serif text-xl text-bark-600">Add New Product</h2>
          <button onClick={onClose} className="text-bark-400 hover:text-bark-600"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className={labelCls}>Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Organic Cotton Sleep Sack" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Category</label>
              <select value={category} onChange={e => setCategory(e.target.value as ProductCategory)} className={inputCls + ' appearance-none cursor-pointer'}>
                {CATEGORY_ORDER.map(cat => (
                  <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Price (USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-sans text-sm text-bark-400">$</span>
                <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="32.00" className={inputCls + ' pl-7'} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Emoji (placeholder)</label>
              <input type="text" value={emoji} onChange={e => setEmoji(e.target.value)} maxLength={4} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Tag / Badge</label>
              <select value={tag} onChange={e => setTag(e.target.value)} className={inputCls + ' appearance-none cursor-pointer'}>
                <option value="">— None —</option>
                {PRODUCT_TAGS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className={inputCls + ' resize-none'} />
          </div>
          <div>
            <label className={labelCls}>Ingredients / Materials</label>
            <input type="text" value={ingredients} onChange={e => setIngredients(e.target.value)} placeholder="100% Organic Cotton" className={inputCls} />
          </div>

          {error && <p className="font-sans text-xs text-red-500">{error}</p>}

          <p className="font-sans text-[10px] text-bark-400 leading-relaxed">
            After creating, click the new product card to upload its photo, or use the AI Draft Writer in the editor.
          </p>

          <button
            onClick={handleCreate}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-bark-600 text-white font-sans text-[11px] tracking-[0.2em] uppercase py-3 rounded hover:bg-bark-700 transition-colors disabled:opacity-40"
          >
            {saving ? <Loader size={13} className="animate-spin" /> : <Plus size={13} />}
            {saving ? 'Creating…' : 'Create Product'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ProductsPortalPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/portal/products')
      const data = await res.json()
      setProducts(data.products ?? [])
    } catch {
      setProducts([])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleDelete(id: string) {
    if (!confirm('Permanently delete this product? This cannot be undone.')) return
    setDeleteError('')
    const res = await fetch(`/api/portal/products/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setProducts(prev => prev.filter(p => p.id !== id))
    } else {
      const data = await res.json().catch(() => ({}))
      setDeleteError(data.error || 'Could not delete this product.')
    }
  }

  async function handleCleanup() {
    setCleaning(true)
    setDeleteError('')
    try {
      const listRes = await fetch('/api/portal/products/cleanup')
      const { candidates } = await listRes.json()
      if (!candidates?.length) {
        alert('Every product has an image — nothing to clean up.')
        return
      }
      const names = candidates.map((c: { name: string }) => `• ${c.name}`).join('\n')
      if (!confirm(`Permanently delete these ${candidates.length} products with no image?\n\n${names}\n\nProducts used in prebuilt boxes are protected and won't be deleted.`)) {
        return
      }
      const delRes = await fetch('/api/portal/products/cleanup', { method: 'POST' })
      const result = await delRes.json()
      await load()
      alert(`Deleted ${result.deleted?.length ?? 0} products.`)
    } catch {
      setDeleteError('Cleanup failed.')
    } finally {
      setCleaning(false)
    }
  }

  const grouped = CATEGORY_ORDER.map(cat => ({
    cat,
    items: products.filter(p => p.category === cat),
  })).filter(g => g.items.length > 0)

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-bark-600">Products</h1>
          <p className="font-sans text-sm text-bark-400 mt-1">
            Click a card to swap the photo. Use <Settings size={12} className="inline mb-0.5" /> to edit details, or <Trash2 size={12} className="inline mb-0.5" /> to delete.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          <button
            onClick={handleCleanup}
            disabled={cleaning}
            className="font-sans text-[11px] tracking-[0.2em] uppercase text-bark-500 hover:text-red-500 border border-cream-300 hover:border-red-300 px-4 py-2 rounded transition-colors whitespace-nowrap disabled:opacity-40"
          >
            {cleaning ? 'Cleaning…' : 'Delete No-Image'}
          </button>
          <Link
            href="/portal/products/bulk"
            className="font-sans text-[11px] tracking-[0.2em] uppercase text-bark-600 hover:text-bark-700 border border-bark-600 px-4 py-2 rounded transition-colors whitespace-nowrap"
          >
            Bulk Import
          </Link>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 font-sans text-[11px] tracking-[0.2em] uppercase text-white bg-bark-600 hover:bg-bark-700 px-4 py-2 rounded transition-colors whitespace-nowrap"
          >
            <Plus size={13} /> Add Product
          </button>
        </div>
      </div>

      {deleteError && (
        <p className="mb-6 font-sans text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{deleteError}</p>
      )}

      {loading ? (
        <div className="flex items-center gap-3 font-sans text-sm text-bark-400 py-12">
          <Loader size={16} className="animate-spin" /> Loading products…
        </div>
      ) : (
        grouped.map(({ cat, items }) => (
          <div key={cat} className="mb-10">
            <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark-400 mb-4 pb-3 border-b border-cream-300">
              {CATEGORY_LABELS[cat]}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {items.map(product => (
                <ProductImageCard key={product.id} product={product} onDelete={handleDelete} />
              ))}
            </div>
          </div>
        ))
      )}

      {showAdd && (
        <AddProductModal
          onClose={() => setShowAdd(false)}
          onCreated={() => { setShowAdd(false); load() }}
        />
      )}
    </div>
  )
}
