'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { getAllProducts } from '@/lib/products'
import { PRODUCT_TAGS } from '@/lib/product-tags'
import type { CertDef, ProductCert } from '@/lib/certifications'
import { ArrowLeft, Upload, Trash2, Star, Loader, Sparkles, Check, Plus, Minus, Video, X, ShieldCheck, Wand2 } from 'lucide-react'

type GalleryImage = {
  id: string
  product_id: string
  image_url: string
  label: string | null
  is_primary: boolean
  sort_order: number
}

type ProductData = {
  id: string
  name: string
  description: string
  price: number
  tag?: string
  ingredients?: string
  category: string
  has_variants?: boolean
}

type Variant = {
  id?: string
  color: string
  color_hex?: string | null
  size: string
  quantity: number
  unit_price?: number | null   // dollars
}

const VARIANT_SIZES = ['0-3', '3-6', '6-9', '9-12', '12-18', '18-24', 'one-size']

const inputCls = "w-full px-3 py-2.5 border border-cream-300 bg-white font-sans text-sm text-bark-600 placeholder:text-bark-400/40 focus:outline-none focus:border-bark-400 transition-colors rounded"
const labelCls = "block font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-1.5"

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const baseProduct = getAllProducts().find(p => p.id === id)

  const [product, setProduct] = useState<ProductData | null>(null)
  const [gallery, setGallery] = useState<GalleryImage[]>([])
  const [inventory, setInventory] = useState(0)
  const [sales, setSales] = useState<{ units: number; revenue: number; lastOrderedAt: string | null }>({ units: 0, revenue: 0, lastOrderedAt: null })
  const [hasVariants, setHasVariants] = useState(false)
  const [variants, setVariants] = useState<Variant[]>([])
  const [detectedColors, setDetectedColors] = useState<Array<{ name: string; hex: string }> | null>(null)
  const [colorDetecting, setColorDetecting] = useState(false)
  const [skipEnhanceIds, setSkipEnhanceIds] = useState<Set<string>>(new Set())
  const [enhancingPhotos, setEnhancingPhotos] = useState(false)
  const [enhanceMsg, setEnhanceMsg] = useState('')
  const [certs, setCerts] = useState<ProductCert[]>([])
  const [certLibrary, setCertLibrary] = useState<CertDef[]>([])
  const [certUploading, setCertUploading] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // Upload state
  const [uploading, setUploading] = useState(false)
  const [uploadPrimary, setUploadPrimary] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const galleryInputRef = useRef<HTMLInputElement>(null)

  // Hover video state
  const [hoverVideo, setHoverVideo] = useState<string | null>(null)
  const [videoUploading, setVideoUploading] = useState(false)
  const [videoError, setVideoError] = useState('')
  const videoInputRef = useRef<HTMLInputElement>(null)

  // AI writing assistance state
  const [improveLoading, setImproveLoading] = useState<'description' | 'ingredients' | null>(null)
  const [originalDescription, setOriginalDescription] = useState<string | null>(null)
  const [originalIngredients, setOriginalIngredients] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/portal/products/${id}`)
    if (res.ok) {
      const data = await res.json()
      setProduct(data.product)
      setGallery(data.gallery)
      setInventory(data.inventory.quantity)
      if (data.sales) setSales(data.sales)
      setHasVariants(!!data.product.has_variants)
      setCerts(data.product.certifications ?? [])
      setHoverVideo(data.product.hover_video ?? null)
    }
    // Load cert library + variants in parallel
    fetch('/api/portal/cert-library').then(r => r.json()).then(d => setCertLibrary(d.certs ?? [])).catch(() => {})
    const vRes = await fetch(`/api/portal/products/${id}/variants`)
    if (vRes.ok) {
      const vData = await vRes.json()
      setVariants((vData.variants ?? []).map((v: Variant) => ({
        ...v,
        unit_price: v.unit_price != null ? Number(v.unit_price) / 100 : null,
      })))
    }
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function handleSave() {
    if (!product) return
    setSaving(true)
    setSaveMsg('')
    const res = await fetch(`/api/portal/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: product.name,
        description: product.description,
        price: product.price,
        tag: product.tag,
        ingredients: product.ingredients,
        inventoryQuantity: inventory,
        hasVariants,
        certifications: certs,
      }),
    })
    // Save variants when this product uses them
    if (hasVariants) {
      await fetch(`/api/portal/products/${id}/variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variants: variants.filter(v => v.color.trim() && v.size.trim()) }),
      })
    }
    setSaving(false)
    setSaveMsg(res.ok ? 'Saved' : 'Error saving')
    setTimeout(() => setSaveMsg(''), 2000)
  }

  function addVariant() {
    setVariants(prev => [...prev, { color: '', color_hex: '', size: '0-3', quantity: 0, unit_price: null }])
  }
  function updateVariant(index: number, field: keyof Variant, value: string | number | null) {
    setVariants(prev => prev.map((v, i) => i === index ? { ...v, [field]: value } : v))
  }
  function removeVariant(index: number) {
    setVariants(prev => prev.filter((_, i) => i !== index))
  }

  async function detectColorsFromPhotos() {
    setColorDetecting(true)
    try {
      const res = await fetch(`/api/portal/products/${id}/detect-colors`)
      const data = await res.json()
      if (data.colors) {
        setDetectedColors(data.colors)
      }
    } catch (e) {
      console.error('Color detection failed', e)
    } finally {
      setColorDetecting(false)
    }
  }

  async function enhanceAllPhotos() {
    if (!gallery || gallery.length === 0) {
      setEnhanceMsg('No photos to enhance')
      return
    }
    setEnhancingPhotos(true)
    setEnhanceMsg('Analyzing images...')
    let successCount = 0
    let errorCount = 0
    for (const img of gallery) {
      if (skipEnhanceIds.has(img.id)) continue
      try {
        const res = await fetch(img.image_url)
        const blob = await res.blob()
        const form = new FormData()
        form.append('file', blob)
        const enhanceRes = await fetch('/api/portal/products/enhance-photo', { method: 'POST', body: form })
        const enhanceData = await enhanceRes.json()

        if (!enhanceRes.ok) {
          console.error('Enhancement failed:', enhanceData)
          setEnhanceMsg(`Error: ${enhanceData.error || 'Unknown error'}`)
          errorCount++
          continue
        }

        if (enhanceData.imageData) {
          // Convert base64 data URL to blob
          const base64 = enhanceData.imageData.split(',')[1]
          const byteCharacters = atob(base64)
          const byteNumbers = new Array(byteCharacters.length)
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i)
          }
          const byteArray = new Uint8Array(byteNumbers)
          const enhancedBlob = new Blob([byteArray], { type: 'image/jpeg' })

          const galleryForm = new FormData()
          galleryForm.append('file', enhancedBlob, `enhanced-${Date.now()}.jpg`)
          await fetch(`/api/portal/products/${id}/gallery`, { method: 'POST', body: galleryForm })
          successCount++
          setEnhanceMsg(`${successCount}/${gallery.length - skipEnhanceIds.size} enhanced...`)
        } else {
          console.error('No imageData in response:', enhanceData)
          errorCount++
        }
      } catch (e) {
        console.error('Enhancement failed for image', e)
        errorCount++
      }
    }
    const finalMsg = errorCount > 0
      ? `Enhanced ${successCount}/${gallery.length - skipEnhanceIds.size} (${errorCount} errors - check console)`
      : `Enhanced ${successCount}/${gallery.length - skipEnhanceIds.size} photos`
    setEnhanceMsg(finalMsg)
    setEnhancingPhotos(false)
    setTimeout(() => setEnhanceMsg(''), 3000)
  }

  async function improveText(type: 'description' | 'ingredients') {
    const text = type === 'description' ? product?.description : product?.ingredients
    if (!text || !text.trim()) return

    setImproveLoading(type)
    try {
      if (type === 'description' && !originalDescription) setOriginalDescription(text)
      if (type === 'ingredients' && !originalIngredients) setOriginalIngredients(text)

      const res = await fetch('/api/portal/products/improve-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, type }),
      })
      const data = await res.json()

      if (data.improved) {
        setProduct(p => p ? { ...p, [type]: data.improved } : p)
      } else if (data.error) {
        console.error('Improve text failed:', data.error)
      }
    } catch (e) {
      console.error('Improve text error:', e)
    } finally {
      setImproveLoading(null)
    }
  }

  function revertText(type: 'description' | 'ingredients') {
    if (type === 'description' && originalDescription) {
      setProduct(p => p ? { ...p, description: originalDescription } : p)
      setOriginalDescription(null)
    } else if (type === 'ingredients' && originalIngredients) {
      setProduct(p => p ? { ...p, ingredients: originalIngredients } : p)
      setOriginalIngredients(null)
    }
  }

  function toggleCert(key: string) {
    setCerts(prev =>
      prev.some(c => c.key === key)
        ? prev.filter(c => c.key !== key)
        : [...prev, { key, certificateUrl: null }]
    )
  }
  async function uploadCertImage(key: string, file: File) {
    setCertUploading(key)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('certKey', key)
      const res = await fetch(`/api/portal/products/${id}/certificate`, { method: 'POST', body: form })
      const data = await res.json()
      if (data.url) {
        setCerts(prev => prev.map(c => c.key === key ? { ...c, certificateUrl: data.url } : c))
      }
    } finally {
      setCertUploading(null)
    }
  }

  async function handleGalleryUpload(file: File, primary: boolean) {
    setUploading(true)
    setUploadError('')
    const form = new FormData()
    form.append('file', file)
    form.append('primary', primary ? 'true' : 'false')
    const res = await fetch(`/api/portal/products/${id}/gallery`, { method: 'POST', body: form })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setUploadError(data.error ?? 'Upload failed. Check that your Supabase storage bucket exists and is public.')
    }
    await load()
    setUploading(false)
    setUploadPrimary(false)
  }

  async function handleDelete(imageId: string) {
    if (!confirm('Delete this image?')) return
    await fetch(`/api/portal/products/${id}/gallery/${imageId}`, { method: 'DELETE' })
    setGallery(g => g.filter(img => img.id !== imageId))
  }

  async function handleSetPrimary(imageId: string) {
    await fetch(`/api/portal/products/${id}/gallery/${imageId}`, { method: 'PATCH' })
    setGallery(g => g.map(img => ({ ...img, is_primary: img.id === imageId })))
  }

  if (loading) return <div className="p-8 flex items-center gap-3 font-sans text-sm text-bark-400"><Loader size={16} className="animate-spin" /> Loading…</div>
  if (!product) return <div className="p-8 font-sans text-bark-400">Product not found. (Try refreshing the page or going back.)</div>

  return (
    <div className="p-6 max-w-5xl">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/portal/products')} className="text-bark-400 hover:text-bark-600 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark-400">{product.category}</p>
            <h1 className="font-serif text-2xl text-bark-600">{product.name}</h1>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-bark-600 text-white font-sans text-[11px] tracking-[0.2em] uppercase px-6 py-2.5 hover:bg-bark-700 transition-colors disabled:opacity-40"
        >
          {saving ? <Loader size={13} className="animate-spin" /> : saveMsg === 'Saved' ? <Check size={13} /> : null}
          {saving ? 'Saving…' : saveMsg || 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* LEFT — Gallery + AI */}
        <div className="lg:col-span-2 space-y-8">

          {/* Photo Gallery */}
          <div className="bg-white border border-cream-300 rounded-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-2 mb-5">
              <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark-400">Photo Gallery</p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <button
                  onClick={enhanceAllPhotos}
                  disabled={enhancingPhotos || gallery.length === 0}
                  className="flex items-center gap-1.5 border border-gold-400 text-gold-600 font-sans text-[9px] sm:text-[10px] tracking-[0.2em] uppercase px-3 sm:px-4 py-2 hover:bg-gold-50 transition-colors disabled:opacity-40 whitespace-nowrap"
                  title="Enhance all photos with AI: standardize size + add oat wall background"
                >
                  {enhancingPhotos ? <Loader size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  <span className="hidden sm:inline">{enhancingPhotos ? 'Enhancing…' : 'Enhance All'}</span>
                  <span className="sm:hidden">{enhancingPhotos ? 'Enhancing…' : 'Enhance'}</span>
                </button>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={uploadPrimary}
                    onChange={e => setUploadPrimary(e.target.checked)}
                    className="accent-bark-600"
                  />
                  <span className="font-sans text-xs text-bark-400">Set as primary</span>
                </label>
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) handleGalleryUpload(f, uploadPrimary)
                    e.target.value = ''
                  }}
                />
              </div>
            </div>

            {uploadError && (
              <p className="mb-4 font-sans text-xs text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">{uploadError}</p>
            )}

            {enhanceMsg && (
              <p className={`mb-4 font-sans text-xs rounded px-3 py-2 border ${
                enhanceMsg.includes('Error') || enhanceMsg.includes('error')
                  ? 'text-red-500 bg-red-50 border-red-200'
                  : 'text-bark-600 bg-cream-50 border-cream-200'
              }`}>{enhanceMsg}</p>
            )}

            {gallery.length === 0 ? (
              <div
                className="border-2 border-dashed border-cream-300 rounded-lg h-40 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-bark-400 transition-colors"
                onClick={() => galleryInputRef.current?.click()}
              >
                <Upload size={20} className="text-bark-400/50" />
                <p className="font-sans text-xs text-bark-400">Click to upload your first photo</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {gallery.map((img) => {
                  const nonPrimaryIdx = gallery.filter(i => !i.is_primary).indexOf(img)
                  const isHover = !img.is_primary && nonPrimaryIdx === 0
                  return (
                  <div key={img.id} className="group relative aspect-square bg-cream-200 rounded-lg overflow-hidden">
                    <Image src={img.image_url} alt={img.label ?? product.name} fill className="object-cover" unoptimized />
                    {img.is_primary && (
                      <div className="absolute top-2 left-2 bg-gold-400 text-white font-sans text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 rounded">
                        Primary
                      </div>
                    )}
                    {isHover && (
                      <div className="absolute top-2 left-2 bg-sage-400 text-white font-sans text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 rounded">
                        Hover
                      </div>
                    )}
                    <button
                      onClick={() => setSkipEnhanceIds(prev => {
                        const next = new Set(prev)
                        if (next.has(img.id)) next.delete(img.id)
                        else next.add(img.id)
                        return next
                      })}
                      className="absolute top-2 right-2 flex items-center gap-1.5 bg-white/90 hover:bg-white text-bark-600 font-sans text-[9px] px-2 py-1.5 rounded transition-colors"
                      title="Skip AI enhancement for this photo"
                    >
                      <input
                        type="checkbox"
                        checked={skipEnhanceIds.has(img.id)}
                        onChange={() => {}}
                        className="accent-bark-600 cursor-pointer"
                      />
                      <span className="text-[9px]">Skip</span>
                    </button>
                    <div className="absolute inset-0 bg-bark-600/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button
                        onClick={() => galleryInputRef.current?.click()}
                        title="Add more photos"
                        className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-bark-600 hover:text-white transition-colors"
                      >
                        <Plus size={14} className="text-bark-600" />
                      </button>
                      {!img.is_primary && (
                        <button
                          onClick={() => handleSetPrimary(img.id)}
                          title="Set as primary"
                          className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-gold-100 transition-colors"
                        >
                          <Star size={14} className="text-bark-600" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(img.id)}
                        title="Delete"
                        className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={14} className="text-red-500" />
                      </button>
                    </div>
                    {img.label && (
                      <p className="absolute bottom-0 left-0 right-0 bg-bark-600/70 text-white font-sans text-[9px] px-2 py-1 truncate">{img.label}</p>
                    )}
                  </div>
                  )
                })}
                {/* Add more */}
                <div
                  className="aspect-square border-2 border-dashed border-cream-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-bark-400 transition-colors"
                  onClick={() => galleryInputRef.current?.click()}
                >
                  <Plus size={20} className="text-bark-400/50" />
                </div>
              </div>
            )}
          </div>

          {/* Hover Video */}
          <div className="bg-white border border-cream-300 rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Video size={14} className="text-gold-400" />
                <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark-400">Hover Video</p>
              </div>
              <button
                onClick={() => videoInputRef.current?.click()}
                disabled={videoUploading}
                className="flex items-center gap-1.5 border border-bark-600 text-bark-600 font-sans text-[10px] tracking-[0.2em] uppercase px-4 py-2 hover:bg-bark-600 hover:text-white transition-colors disabled:opacity-40"
              >
                {videoUploading ? <Loader size={12} className="animate-spin" /> : <Upload size={12} />}
                Upload
              </button>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                className="hidden"
                onChange={async e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setVideoUploading(true)
                  setVideoError('')
                  const form = new FormData()
                  form.append('file', file)
                  const res = await fetch(`/api/portal/products/${id}/hover-video`, { method: 'POST', body: form })
                  if (res.ok) {
                    const data = await res.json()
                    setHoverVideo(data.videoUrl)
                  } else {
                    const data = await res.json().catch(() => ({}))
                    setVideoError(data.error ?? 'Upload failed')
                  }
                  setVideoUploading(false)
                  e.target.value = ''
                }}
              />
            </div>

            <p className="font-sans text-[10px] text-bark-400/60 mb-4">
              Plays silently when a customer hovers over this product on the build page. MP4, WebM, or MOV. Keep it under 10 MB.
            </p>

            {videoError && (
              <p className="mb-3 font-sans text-xs text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">{videoError}</p>
            )}

            {hoverVideo ? (
              <div className="relative">
                <video
                  src={hoverVideo}
                  className="w-full rounded-lg max-h-48 object-cover bg-cream-100"
                  muted
                  loop
                  autoPlay
                  playsInline
                />
                <button
                  onClick={async () => {
                    await fetch(`/api/portal/products/${id}/hover-video`, { method: 'DELETE' })
                    setHoverVideo(null)
                  }}
                  className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow hover:bg-red-50 transition-colors"
                  title="Remove video"
                >
                  <X size={13} className="text-red-500" />
                </button>
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-cream-300 rounded-lg h-28 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-bark-400 transition-colors"
                onClick={() => videoInputRef.current?.click()}
              >
                <Video size={20} className="text-bark-400/40" />
                <p className="font-sans text-xs text-bark-400">Click to upload hover video</p>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT — Product Details + Inventory */}
        <div className="space-y-6">

          {/* Product Details */}
          <div className="bg-white border border-cream-300 rounded-xl p-6">
            <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark-400 mb-5">Product Details</p>

            <div className="space-y-4">
              <div>
                <label className={labelCls}>Name</label>
                <input
                  type="text"
                  value={product.name}
                  onChange={e => setProduct(p => p ? { ...p, name: e.target.value } : p)}
                  className={inputCls}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={labelCls}>Description</label>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => improveText('description')}
                      disabled={improveLoading === 'description' || !product.description.trim()}
                      title="Improve clarity and writing"
                      className="flex items-center gap-1 text-gold-600 hover:text-gold-700 disabled:opacity-40 font-sans text-[9px] tracking-[0.15em] uppercase"
                    >
                      {improveLoading === 'description' ? <Loader size={12} className="animate-spin" /> : <Wand2 size={12} />}
                      Improve
                    </button>
                    {originalDescription && (
                      <button
                        onClick={() => revertText('description')}
                        title="Revert to original"
                        className="text-bark-400 hover:text-bark-600 font-sans text-[9px] tracking-[0.15em] uppercase"
                      >
                        Undo
                      </button>
                    )}
                  </div>
                </div>
                <textarea
                  value={product.description}
                  onChange={e => setProduct(p => p ? { ...p, description: e.target.value } : p)}
                  rows={4}
                  className={inputCls + ' resize-none'}
                />
              </div>
              <div>
                <label className={labelCls}>Price (USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-sans text-sm text-bark-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={(product.price / 100).toFixed(2)}
                    onChange={e => setProduct(p => p ? { ...p, price: Math.round(parseFloat(e.target.value) * 100) } : p)}
                    className={inputCls + ' pl-7'}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Tag / Badge</label>
                <select
                  value={product.tag ?? ''}
                  onChange={e => setProduct(p => p ? { ...p, tag: e.target.value || undefined } : p)}
                  className={inputCls + ' appearance-none cursor-pointer'}
                >
                  <option value="">— None —</option>
                  {PRODUCT_TAGS.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={labelCls}>Ingredients / Materials</label>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => improveText('ingredients')}
                      disabled={improveLoading === 'ingredients' || !product.ingredients?.trim()}
                      title="Improve clarity and writing"
                      className="flex items-center gap-1 text-gold-600 hover:text-gold-700 disabled:opacity-40 font-sans text-[9px] tracking-[0.15em] uppercase"
                    >
                      {improveLoading === 'ingredients' ? <Loader size={12} className="animate-spin" /> : <Wand2 size={12} />}
                      Improve
                    </button>
                    {originalIngredients && (
                      <button
                        onClick={() => revertText('ingredients')}
                        title="Revert to original"
                        className="text-bark-400 hover:text-bark-600 font-sans text-[9px] tracking-[0.15em] uppercase"
                      >
                        Undo
                      </button>
                    )}
                  </div>
                </div>
                <input
                  type="text"
                  value={product.ingredients ?? ''}
                  onChange={e => setProduct(p => p ? { ...p, ingredients: e.target.value } : p)}
                  placeholder="e.g. 100% Organic Cotton"
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* Sales */}
          <div className="bg-white border border-cream-300 rounded-xl p-6">
            <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark-400 mb-5">Sales</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-serif text-3xl text-bark-600">{sales.units}</p>
                <p className="font-sans text-[10px] tracking-[0.15em] uppercase text-bark-400 mt-1">Units sold</p>
              </div>
              <div>
                <p className="font-serif text-3xl text-bark-600">${(sales.revenue / 100).toFixed(2)}</p>
                <p className="font-sans text-[10px] tracking-[0.15em] uppercase text-bark-400 mt-1">Revenue</p>
              </div>
            </div>
            <p className="font-sans text-[10px] text-bark-400/70 mt-4">
              {sales.lastOrderedAt
                ? `Last ordered ${new Date(sales.lastOrderedAt).toLocaleDateString()}`
                : 'No sales yet'}
              {' '}· across all paid orders
            </p>
          </div>

          {/* Variants (sizes & colors) */}
          <div className="bg-white border border-cream-300 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark-400">Sizes &amp; Colors</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="font-sans text-xs text-bark-500">This item has sizes/colors</span>
                <input
                  type="checkbox"
                  checked={hasVariants}
                  onChange={e => setHasVariants(e.target.checked)}
                  className="accent-bark-600 w-4 h-4"
                />
              </label>
            </div>

            {hasVariants ? (
              <>
                <p className="font-sans text-[10px] text-bark-400/70 mb-4">
                  Each row is one color + size with its own stock. Customers choose from these; sizes with 0 stock show as unavailable.
                </p>

                {/* Color detection */}
                <div className="mb-4 p-4 bg-cream-50 rounded-lg border border-cream-200">
                  <button
                    onClick={detectColorsFromPhotos}
                    disabled={colorDetecting}
                    className="flex items-center gap-2 font-sans text-[11px] tracking-[0.2em] uppercase text-bark-600 hover:text-bark-700 disabled:opacity-50"
                  >
                    {colorDetecting ? <Loader size={14} className="animate-spin" /> : <Wand2 size={14} />}
                    {colorDetecting ? 'Analyzing photos…' : 'Detect colors from photos'}
                  </button>
                  {detectedColors && detectedColors.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="font-sans text-[10px] text-bark-400">Click to add:</p>
                      <div className="flex flex-wrap gap-2">
                        {detectedColors.map((col, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              const exists = variants.some(v => v.color.toLowerCase() === col.name.toLowerCase())
                              if (!exists) {
                                addVariant()
                                setTimeout(() => {
                                  setVariants(prev => {
                                    const updated = [...prev]
                                    updated[updated.length - 1] = { ...updated[updated.length - 1], color: col.name, color_hex: col.hex }
                                    return updated
                                  })
                                })
                              }
                            }}
                            className="flex items-center gap-2 px-2.5 py-1.5 bg-white border border-cream-300 rounded hover:border-bark-400 text-sm text-bark-600 transition-colors"
                          >
                            <div className="w-5 h-5 rounded border border-bark-200" style={{ backgroundColor: col.hex }} />
                            {col.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {variants.map((v, i) => (
                    <div key={v.id ?? i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={v.color}
                        onChange={e => updateVariant(i, 'color', e.target.value)}
                        placeholder="color"
                        className="flex-1 min-w-0 px-2 py-1.5 border border-cream-300 rounded text-sm text-bark-600 focus:outline-none focus:border-bark-400"
                      />
                      <div className="flex items-center gap-1 shrink-0">
                        <input
                          type="text"
                          value={v.color_hex || ''}
                          onChange={e => updateVariant(i, 'color_hex', e.target.value)}
                          placeholder="#000"
                          className="w-16 px-2 py-1.5 border border-cream-300 rounded text-xs text-bark-600 focus:outline-none focus:border-bark-400"
                          title="Hex color code"
                        />
                        <input
                          type="color"
                          value={v.color_hex || '#cccccc'}
                          onChange={e => updateVariant(i, 'color_hex', e.target.value)}
                          className="w-8 h-8 rounded border border-cream-300 shrink-0 cursor-pointer"
                          title="Swatch color"
                        />
                      </div>
                      <select
                        value={v.size}
                        onChange={e => updateVariant(i, 'size', e.target.value)}
                        className="w-20 px-1 py-1.5 border border-cream-300 rounded text-sm text-bark-600 focus:outline-none focus:border-bark-400 shrink-0"
                      >
                        {VARIANT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <input
                        type="number"
                        min={0}
                        value={v.quantity}
                        onChange={e => updateVariant(i, 'quantity', parseInt(e.target.value) || 0)}
                        className="w-16 px-2 py-1.5 border border-cream-300 rounded text-sm text-bark-600 text-center focus:outline-none focus:border-bark-400 shrink-0"
                        title="Quantity in stock"
                      />
                      <button
                        onClick={() => removeVariant(i)}
                        className="text-bark-300 hover:text-red-500 transition-colors shrink-0"
                        title="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addVariant}
                  className="mt-3 flex items-center gap-1.5 font-sans text-xs text-gold-500 hover:text-gold-600 transition-colors"
                >
                  <Plus size={14} /> Add a size/color
                </button>
                <p className="font-sans text-[10px] text-bark-400/60 mt-3">Tip: the AI Inventory upload (Inventory page) also fills these rows from a supplier sheet.</p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setInventory(i => Math.max(0, i - 1))}
                    className="w-9 h-9 border border-cream-300 flex items-center justify-center hover:border-bark-400 transition-colors rounded"
                  >
                    <Minus size={14} className="text-bark-600" />
                  </button>
                  <input
                    type="number"
                    min={0}
                    value={inventory}
                    onChange={e => setInventory(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-20 text-center border border-cream-300 bg-white font-sans text-lg text-bark-600 py-2 focus:outline-none focus:border-bark-400 rounded"
                  />
                  <button
                    onClick={() => setInventory(i => i + 1)}
                    className="w-9 h-9 border border-cream-300 flex items-center justify-center hover:border-bark-400 transition-colors rounded"
                  >
                    <Plus size={14} className="text-bark-600" />
                  </button>
                  <span className="font-sans text-xs text-bark-400">units in stock</span>
                </div>
                {inventory === 0 && (
                  <p className="font-sans text-[10px] text-red-400 mt-3">⚠ Out of stock — shows as &ldquo;Sold Out&rdquo; to customers.</p>
                )}
                {inventory > 0 && inventory <= 5 && (
                  <p className="font-sans text-[10px] text-gold-500 mt-3">Low stock — consider restocking soon.</p>
                )}
              </>
            )}
          </div>

          {/* Certifications */}
          <div className="bg-white border border-cream-300 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={14} className="text-gold-400" />
              <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark-400">Certifications</p>
            </div>
            <p className="font-sans text-[10px] text-bark-400/70 mb-4 leading-relaxed">
              Toggle a cert to show its badge on the storefront. Optionally upload the actual certificate image so customers can tap to view it.
            </p>
            {certLibrary.length === 0 && (
              <p className="font-sans text-xs text-bark-400 mb-4">
                No certifications in the library yet. Add some in <a href="/portal/cert-icons" className="text-gold-500 underline">Cert Library</a>.
              </p>
            )}
            <div className="space-y-3">
              {certLibrary.map(cert => {
                const active = certs.some(c => c.key === cert.key)
                const saved = certs.find(c => c.key === cert.key)
                const uploading = certUploading === cert.key
                return (
                  <div key={cert.key} className={`border rounded-lg p-3 transition-colors ${active ? 'border-gold-300 bg-gold-50/30' : 'border-cream-200'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => toggleCert(cert.key)}
                          className="accent-bark-600 w-4 h-4"
                        />
                        <div>
                          <span className="font-sans text-sm font-medium text-bark-600">{cert.name}</span>
                          <span className="font-sans text-[10px] text-bark-400 ml-2">({cert.region})</span>
                        </div>
                      </label>
                      {active && (
                        <label className={`flex items-center gap-1.5 cursor-pointer border border-cream-300 px-2.5 py-1 rounded text-[10px] font-sans text-bark-500 hover:border-bark-400 transition-colors ${uploading ? 'opacity-50' : ''}`}>
                          {uploading ? <Loader size={11} className="animate-spin" /> : <Upload size={11} />}
                          {saved?.certificateUrl ? 'Replace cert' : 'Upload cert'}
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            className="hidden"
                            disabled={uploading}
                            onChange={e => {
                              const f = e.target.files?.[0]
                              if (f) uploadCertImage(cert.key, f)
                              e.target.value = ''
                            }}
                          />
                        </label>
                      )}
                    </div>
                    <p className="font-sans text-[10px] text-bark-400/70 ml-6">{cert.blurb}</p>
                    {active && saved?.certificateUrl && (
                      <p className="font-sans text-[10px] text-sage-500 ml-6 mt-1">✓ Certificate uploaded — customers can tap to view it</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Save button (sticky bottom on mobile) */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-bark-600 text-white font-sans text-[11px] tracking-[0.2em] uppercase py-3.5 hover:bg-bark-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {saving ? <Loader size={13} className="animate-spin" /> : saveMsg === 'Saved' ? <Check size={13} /> : null}
            {saving ? 'Saving…' : saveMsg || 'Save All Changes'}
          </button>

        </div>
      </div>
    </div>
  )
}
