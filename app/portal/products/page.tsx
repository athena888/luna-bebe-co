'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/lib/products'
import { PRODUCT_TAGS } from '@/lib/product-tags'
import { resizeImage } from '@/lib/image-resize'
import type { ProductCategory, Product } from '@/types'
import { Upload, CheckCircle, Loader, Settings, Trash2, Plus, X, Sparkles, ImageUp, Check, AlertCircle } from 'lucide-react'
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
    const resized = await resizeImage(file)
    const form = new FormData()
    form.append('file', resized)
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

type BulkResult = { productId: string; url?: string; error?: string }

function BulkPhotoUploadModal({ onClose, onUploaded }: { onClose: () => void; onUploaded: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [results, setResults] = useState<{ succeeded: BulkResult[]; failed: BulkResult[] } | null>(null)

  function handleFiles(selected: FileList | null) {
    if (!selected) return
    const imgs = Array.from(selected).filter(f => /\.(jpe?g|png|webp)$/i.test(f.name))
    setFiles(imgs)
    setResults(null)
  }

  async function handleUpload() {
    if (!files.length) return
    setUploading(true)
    const form = new FormData()
    files.forEach(f => form.append('files', f))
    const res = await fetch('/api/portal/products/bulk-upload', { method: 'POST', body: form })
    const data = await res.json()
    setResults(data)
    setUploading(false)
    if (data.succeeded?.length) onUploaded()
  }

  return (
    <div className="fixed inset-0 bg-bark-600/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-serif text-xl text-bark-600">Bulk Upload Photos</h2>
          <button onClick={onClose} className="text-bark-400 hover:text-bark-600"><X size={18} /></button>
        </div>

        <div className="bg-cream-50 border border-cream-200 rounded-xl p-4 mb-5 text-xs font-sans text-bark-500 leading-relaxed">
          <p className="font-medium text-bark-600 mb-1">File naming convention</p>
          <p>Name each image after the product ID, e.g.:</p>
          <ul className="mt-1.5 space-y-0.5 font-mono text-[11px] text-bark-500">
            <li>swaddle-muslin.jpg</li>
            <li>garment-romper.png</li>
            <li>bath-calendula.webp</li>
          </ul>
          <p className="mt-2 text-bark-400">The filename (without extension) must match the product ID exactly. Find product IDs in the Products list.</p>
        </div>

        {/* Drop zone */}
        <div
          className="border-2 border-dashed border-cream-300 rounded-xl p-10 text-center cursor-pointer hover:border-bark-400 hover:bg-cream-50 transition-colors mb-4"
          onClick={() => inputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
        >
          <ImageUp size={28} className="mx-auto mb-3 text-bark-400/50" />
          <p className="font-sans text-sm text-bark-600 font-medium">Drop images here or click to browse</p>
          <p className="font-sans text-xs text-bark-400 mt-1">JPG, PNG, WebP — select multiple at once</p>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden"
            onChange={e => handleFiles(e.target.files)} />
        </div>

        {/* File list preview */}
        {files.length > 0 && !results && (
          <div className="mb-4">
            <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-2">{files.length} files selected</p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {files.map(f => {
                const productId = f.name.replace(/\.[^.]+$/, '')
                return (
                  <div key={f.name} className="flex items-center gap-2 font-sans text-xs">
                    <span className="font-mono text-bark-500 flex-1 truncate">{f.name}</span>
                    <span className="text-bark-400">→</span>
                    <span className="text-bark-600 flex-1 truncate">{productId}</span>
                  </div>
                )
              })}
            </div>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-bark-600 text-white font-sans text-[11px] tracking-[0.2em] uppercase py-3 rounded hover:bg-bark-700 transition-colors disabled:opacity-40"
            >
              {uploading ? <Loader size={13} className="animate-spin" /> : <ImageUp size={13} />}
              {uploading ? `Uploading ${files.length} photos…` : `Upload ${files.length} Photos`}
            </button>
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="space-y-3">
            {results.succeeded.length > 0 && (
              <div className="bg-sage-50 border border-sage-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Check size={14} className="text-sage-600" />
                  <p className="font-sans text-sm font-medium text-sage-700">{results.succeeded.length} photos uploaded</p>
                </div>
                <div className="space-y-1">
                  {results.succeeded.map(r => (
                    <p key={r.productId} className="font-mono text-[11px] text-sage-600">{r.productId}</p>
                  ))}
                </div>
              </div>
            )}
            {results.failed.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle size={14} className="text-red-500" />
                  <p className="font-sans text-sm font-medium text-red-700">{results.failed.length} failed</p>
                </div>
                <div className="space-y-1">
                  {results.failed.map(r => (
                    <p key={r.productId} className="font-mono text-[11px] text-red-600">{r.productId}: {r.error}</p>
                  ))}
                </div>
              </div>
            )}
            <button onClick={onClose} className="w-full font-sans text-sm text-bark-400 hover:text-bark-600 transition-colors py-2">Done</button>
          </div>
        )}
      </div>
    </div>
  )
}

function AddProductModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [step, setStep] = useState<'ai' | 'form' | 'photo'>('ai')
  const [name, setName] = useState('')
  const [category, setCategory] = useState<ProductCategory>('swaddle')
  const [price, setPrice] = useState('')
  const [emoji, setEmoji] = useState('🎁')
  const [tag, setTag] = useState('')
  const [description, setDescription] = useState('')
  const [ingredients, setIngredients] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [productId, setProductId] = useState('')
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'done'>('idle')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiNames, setAiNames] = useState<string[]>([])
  const [aiError, setAiError] = useState('')
  const [aiFile, setAiFile] = useState<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const aiInputRef = useRef<HTMLInputElement>(null)

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
        setProductId(data.product.id)
        // If we have an AI-uploaded file, auto-upload it to gallery
        if (aiFile) {
          const form = new FormData()
          form.append('file', aiFile)
          form.append('primary', 'true')
          await fetch(`/api/portal/products/${data.product.id}/gallery`, { method: 'POST', body: form })
          setUploadState('done')
          setTimeout(() => { onCreated(); onClose() }, 1000)
        } else {
          setStep('photo')
        }
      } else {
        setError(data.error || 'Failed to create product')
      }
    } catch {
      setError('Failed to create product')
    } finally {
      setSaving(false)
    }
  }

  async function handleAIDraft(file: File) {
    setAiLoading(true)
    setAiError('')
    // Resize once; reuse for both the AI scan and the gallery save
    const resized = await resizeImage(file)
    setAiFile(resized)
    const form = new FormData()
    form.append('file', resized)
    form.append('category', category)
    try {
      const res = await fetch('/api/portal/products/ai-describe', { method: 'POST', body: form })
      const data = await res.json()
      if (data.draft) {
        setAiNames(data.draft.names || [])
        setDescription(data.draft.description || '')
        setIngredients(data.draft.ingredients || '')
        if (data.draft.tag) setTag(data.draft.tag)
      } else {
        setAiError(data.error || 'Failed to generate suggestions')
      }
    } catch {
      setAiError('Failed to process file')
    } finally {
      setAiLoading(false)
    }
  }

  async function handlePhoto(file: File) {
    setUploadState('uploading')
    const resized = await resizeImage(file)
    const form = new FormData()
    form.append('file', resized)
    form.append('productId', productId)
    try {
      const res = await fetch('/api/portal/products/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (data.url) {
        setUploadState('done')
        setTimeout(() => {
          onCreated()
          onClose()
        }, 1000)
      }
    } catch {
      setUploadState('idle')
    }
  }

  return (
    <div className="fixed inset-0 bg-bark-600/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {step === 'ai' ? (
          <>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-serif text-xl text-bark-600 flex items-center gap-2">
                <Sparkles size={20} />
                AI Product Info
              </h2>
              <button onClick={onClose} className="text-bark-400 hover:text-bark-600"><X size={18} /></button>
            </div>

            <div className="space-y-4">
              <p className="font-sans text-sm text-bark-600">Upload a product photo to get AI suggestions for names, description, and ingredients. Your photo will be auto-saved to the product gallery.</p>

              <div
                onClick={() => aiInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault()
                  const file = e.dataTransfer.files[0]
                  if (file) handleAIDraft(file)
                }}
                className="border-2 border-dashed border-cream-300 rounded-xl p-8 text-center cursor-pointer hover:border-bark-400 transition-colors"
              >
                {aiLoading ? (
                  <>
                    <Loader size={32} className="mx-auto text-bark-600 animate-spin mb-2" />
                    <p className="font-sans text-sm text-bark-600">Analyzing…</p>
                  </>
                ) : aiNames.length > 0 ? (
                  <>
                    <CheckCircle size={32} className="mx-auto text-gold-400 mb-2" />
                    <p className="font-sans text-sm text-bark-600">Ready! Select a name below.</p>
                  </>
                ) : (
                  <>
                    <ImageUp size={32} className="mx-auto text-bark-400 mb-2" />
                    <p className="font-sans text-sm text-bark-600">Click to upload or drag & drop</p>
                    <p className="font-sans text-xs text-bark-400 mt-1">JPG, PNG, WebP, or PDF</p>
                  </>
                )}
              </div>

              <input
                ref={aiInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) handleAIDraft(file)
                  e.target.value = ''
                }}
              />

              {aiError && <p className="font-sans text-xs text-red-500">{aiError}</p>}

              {aiNames.length > 0 && (
                <div className="space-y-2">
                  <p className="font-sans text-xs uppercase tracking-widest text-bark-400">Pick a name or skip:</p>
                  <div className="space-y-2">
                    {aiNames.map((nameOption, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setName(nameOption)
                          setStep('form')
                        }}
                        className="w-full text-left px-3 py-2 bg-cream-50 border border-cream-200 rounded hover:border-bark-400 hover:bg-cream-100 transition-colors font-sans text-sm text-bark-600"
                      >
                        {nameOption}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setStep('form')}
                className="w-full font-sans text-xs text-bark-400 hover:text-bark-600 transition-colors py-2 border-t border-cream-200"
              >
                Skip & Enter Manually
              </button>
            </div>
          </>
        ) : step === 'form' ? (
          <>
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

              <button
                onClick={handleCreate}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-bark-600 text-white font-sans text-[11px] tracking-[0.2em] uppercase py-3 rounded hover:bg-bark-700 transition-colors disabled:opacity-40"
              >
                {saving ? <Loader size={13} className="animate-spin" /> : <Plus size={13} />}
                {saving ? 'Creating…' : 'Next: Upload Photo'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-serif text-xl text-bark-600">Upload Photo</h2>
              <button onClick={onClose} className="text-bark-400 hover:text-bark-600" disabled={uploadState === 'uploading'}><X size={18} /></button>
            </div>

            <div className="space-y-4">
              <p className="font-sans text-sm text-bark-600">Now upload a photo for <strong>{name}</strong></p>

              <div
                onClick={() => inputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault()
                  const file = e.dataTransfer.files[0]
                  if (file) handlePhoto(file)
                }}
                className="border-2 border-dashed border-cream-300 rounded-xl p-8 text-center cursor-pointer hover:border-bark-400 transition-colors"
              >
                {uploadState === 'uploading' ? (
                  <Loader size={32} className="mx-auto text-bark-600 animate-spin mb-2" />
                ) : uploadState === 'done' ? (
                  <>
                    <CheckCircle size={32} className="mx-auto text-gold-400 mb-2" />
                    <p className="font-sans text-sm text-bark-600">Photo uploaded!</p>
                  </>
                ) : (
                  <>
                    <ImageUp size={32} className="mx-auto text-bark-400 mb-2" />
                    <p className="font-sans text-sm text-bark-600">Click to upload or drag & drop</p>
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
                  if (file) handlePhoto(file)
                  e.target.value = ''
                }}
              />

              <button
                onClick={() => {
                  onCreated()
                  onClose()
                }}
                disabled={uploadState === 'uploading'}
                className="w-full flex items-center justify-center gap-2 bg-bark-600 text-white font-sans text-[11px] tracking-[0.2em] uppercase py-3 rounded hover:bg-bark-700 transition-colors disabled:opacity-40"
              >
                <Check size={13} />
                {uploadState === 'done' ? 'Done' : 'Skip & Finish'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function ProductsPortalPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showBulkPhoto, setShowBulkPhoto] = useState(false)
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
          <button
            onClick={() => setShowBulkPhoto(true)}
            className="flex items-center gap-1.5 font-sans text-[11px] tracking-[0.2em] uppercase text-bark-600 hover:text-bark-700 border border-bark-600 px-4 py-2 rounded transition-colors whitespace-nowrap"
          >
            <ImageUp size={13} /> Bulk Photos
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

      {showBulkPhoto && (
        <BulkPhotoUploadModal
          onClose={() => setShowBulkPhoto(false)}
          onUploaded={() => load()}
        />
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
