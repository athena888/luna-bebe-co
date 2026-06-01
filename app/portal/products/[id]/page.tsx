'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { getAllProducts } from '@/lib/products'
import { PRODUCT_TAGS } from '@/lib/product-tags'
import { ArrowLeft, Upload, Trash2, Star, Loader, Sparkles, Check, Plus, Minus, Video, X } from 'lucide-react'

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

  // AI generate state
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiBaseFile, setAiBaseFile] = useState<File | null>(null)
  const [aiBasePreview, setAiBasePreview] = useState<string | null>(null)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiResult, setAiResult] = useState<string | null>(null)

  // Lifestyle photo state
  const [lifestyleMode, setLifestyleMode] = useState(false)
  const [babyImage, setBabyImage] = useState<File | null>(null)
  const [babyImagePreview, setBabyImagePreview] = useState<string | null>(null)
  const [clothingImage, setClothingImage] = useState<File | null>(null)
  const [clothingImagePreview, setClothingImagePreview] = useState<string | null>(null)

  // AI Draft (description writer) state
  const [draftKeywords, setDraftKeywords] = useState('')
  const [draftFile, setDraftFile] = useState<File | null>(null)
  const [drafting, setDrafting] = useState(false)
  const [draftError, setDraftError] = useState('')
  const draftFileRef = useRef<HTMLInputElement>(null)

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
      setHoverVideo(data.product.hover_video ?? null)
    }
    // Load variants in parallel
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

  async function handleAiGenerate() {
    if (lifestyleMode) {
      if (!clothingImage) return
      setAiGenerating(true)
      setAiResult(null)
      const form = new FormData()
      form.append('isLifestyle', 'true')
      form.append('image', clothingImage)
      if (babyImage) form.append('babyImage', babyImage)
      const res = await fetch(`/api/portal/products/${id}/ai-generate`, { method: 'POST', body: form })
      const data = await res.json()
      if (data.imageUrl) {
        setAiResult(data.imageUrl)
        await load()
        // Discard baby image after generation
        setBabyImage(null)
        setBabyImagePreview(null)
      }
      setAiGenerating(false)
    } else {
      if (!aiPrompt && !aiBaseFile) return
      setAiGenerating(true)
      setAiResult(null)
      const form = new FormData()
      form.append('prompt', aiPrompt)
      if (aiBaseFile) form.append('image', aiBaseFile)
      const res = await fetch(`/api/portal/products/${id}/ai-generate`, { method: 'POST', body: form })
      const data = await res.json()
      if (data.imageUrl) {
        setAiResult(data.imageUrl)
        await load()
      }
      setAiGenerating(false)
    }
  }

  function handleAiBaseSelect(file: File) {
    setAiBaseFile(file)
    setAiBasePreview(URL.createObjectURL(file))
  }

  async function handleAiDraft() {
    if (!draftKeywords.trim() && !draftFile) return
    setDrafting(true)
    setDraftError('')
    try {
      let res: Response
      if (draftFile) {
        const form = new FormData()
        form.append('file', draftFile)
        form.append('keywords', draftKeywords)
        form.append('category', product?.category ?? '')
        res = await fetch('/api/portal/products/ai-describe', { method: 'POST', body: form })
      } else {
        res = await fetch('/api/portal/products/ai-describe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keywords: draftKeywords, category: product?.category ?? '' }),
        })
      }
      const data = await res.json()
      if (data.draft) {
        setProduct(p => p ? {
          ...p,
          name: data.draft.name || p.name,
          description: data.draft.description || p.description,
          ingredients: data.draft.ingredients || p.ingredients,
          tag: data.draft.tag || p.tag,
        } : p)
        setDraftKeywords('')
        setDraftFile(null)
      } else {
        setDraftError(data.error || 'Could not generate a draft')
      }
    } catch {
      setDraftError('Could not generate a draft')
    } finally {
      setDrafting(false)
    }
  }

  if (!baseProduct) return <div className="p-8 font-sans text-bark-400">Product not found.</div>
  if (loading) return <div className="p-8 flex items-center gap-3 font-sans text-sm text-bark-400"><Loader size={16} className="animate-spin" /> Loading…</div>
  if (!product) return null

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
            <div className="flex items-center justify-between mb-5">
              <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark-400">Photo Gallery</p>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={uploadPrimary}
                    onChange={e => setUploadPrimary(e.target.checked)}
                    className="accent-bark-600"
                  />
                  <span className="font-sans text-xs text-bark-400">Set as primary</span>
                </label>
                <button
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1.5 border border-bark-600 text-bark-600 font-sans text-[10px] tracking-[0.2em] uppercase px-4 py-2 hover:bg-bark-600 hover:text-white transition-colors disabled:opacity-40"
                >
                  {uploading ? <Loader size={12} className="animate-spin" /> : <Upload size={12} />}
                  Upload
                </button>
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
                    <div className="absolute inset-0 bg-bark-600/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
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

          {/* AI Photo Generation */}
          <div className="bg-white border border-cream-300 rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-gold-400" />
                <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark-400">AI Photo Generation</p>
              </div>
              <div className="flex items-center border border-cream-300 rounded bg-cream-50">
                <button
                  onClick={() => { setLifestyleMode(false); setAiResult(null) }}
                  className={`px-3 py-1.5 font-sans text-[9px] tracking-[0.15em] uppercase transition-colors ${
                    !lifestyleMode ? 'bg-bark-600 text-white' : 'text-bark-400 hover:text-bark-600'
                  }`}
                >
                  Standard
                </button>
                <button
                  onClick={() => { setLifestyleMode(true); setAiResult(null) }}
                  className={`px-3 py-1.5 font-sans text-[9px] tracking-[0.15em] uppercase transition-colors border-l border-cream-300 ${
                    lifestyleMode ? 'bg-bark-600 text-white' : 'text-bark-400 hover:text-bark-600'
                  }`}
                >
                  Lifestyle
                </button>
              </div>
            </div>

            {/* AI result preview */}
            {(aiGenerating || aiResult) && (
              <div className="mb-4">
                <p className={labelCls}>Generated result</p>
                <div className="border border-cream-300 rounded-lg h-48 flex items-center justify-center bg-cream-50 relative overflow-hidden">
                  {aiGenerating ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader size={20} className="text-gold-400 animate-spin" />
                      <p className="font-sans text-[10px] text-bark-400">Generating…</p>
                    </div>
                  ) : aiResult ? (
                    <Image src={aiResult} alt="Generated" fill className="object-cover" unoptimized />
                  ) : null}
                </div>
              </div>
            )}

            {/* Standard mode */}
            {!lifestyleMode && (
              <div className="mb-4">
                <label className={labelCls}>Prompt</label>
                <div
                  className="relative"
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault()
                    const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/'))
                    if (file) handleAiBaseSelect(file)
                  }}
                >
                  <textarea
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    onPaste={e => {
                      const items = Array.from(e.clipboardData.items)
                      const imageItem = items.find(item => item.type.startsWith('image/'))
                      if (imageItem) {
                        e.preventDefault()
                        const file = imageItem.getAsFile()
                        if (file) handleAiBaseSelect(file)
                      }
                    }}
                    placeholder="e.g. soft cream background, natural morning light, product on linen fabric…  Paste or drop a photo here to use as reference"
                    rows={3}
                    className={inputCls + ' resize-none'}
                  />
                </div>

                {aiBaseFile && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="relative w-10 h-10 rounded overflow-hidden border border-cream-300 shrink-0">
                      {aiBasePreview && <Image src={aiBasePreview} alt="reference" fill className="object-cover" unoptimized />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-sans text-[10px] text-bark-600 truncate">{aiBaseFile.name}</p>
                      <p className="font-sans text-[9px] text-bark-400">Reference photo attached</p>
                    </div>
                    <button
                      onClick={() => { setAiBaseFile(null); setAiBasePreview(null) }}
                      className="font-sans text-[10px] text-bark-400 hover:text-red-500 transition-colors shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                )}

                <p className="font-sans text-[9px] text-bark-400/60 mt-2">
                  Paste or drop a photo to use as reference. Generated images are saved to gallery automatically.
                </p>
              </div>
            )}

            {/* Lifestyle mode */}
            {lifestyleMode && (
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Clothing Photo</label>
                  <div className="relative border-2 border-dashed border-cream-300 rounded-lg p-4 flex items-center justify-center min-h-32 cursor-pointer hover:border-bark-400 transition-colors"
                    onClick={() => document.getElementById('clothing-upload')?.click()}
                  >
                    {clothingImagePreview ? (
                      <div className="relative w-full h-24">
                        <Image src={clothingImagePreview} alt="clothing" fill className="object-contain" unoptimized />
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload size={18} className="text-bark-400/50 mx-auto mb-1" />
                        <p className="font-sans text-[9px] text-bark-400">Click to upload clothing photo</p>
                      </div>
                    )}
                  </div>
                  <input
                    id="clothing-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (f) {
                        setClothingImage(f)
                        setClothingImagePreview(URL.createObjectURL(f))
                      }
                    }}
                  />
                </div>

                <div>
                  <label className={labelCls}>Baby Reference Photo (Optional)</label>
                  <div className="relative border-2 border-dashed border-cream-300 rounded-lg p-4 flex items-center justify-center min-h-32 cursor-pointer hover:border-bark-400 transition-colors"
                    onClick={() => document.getElementById('baby-upload')?.click()}
                  >
                    {babyImagePreview ? (
                      <div className="relative w-full h-24">
                        <Image src={babyImagePreview} alt="baby" fill className="object-contain" unoptimized />
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload size={18} className="text-bark-400/50 mx-auto mb-1" />
                        <p className="font-sans text-[9px] text-bark-400">Click to upload baby reference</p>
                      </div>
                    )}
                  </div>
                  <input
                    id="baby-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (f) {
                        setBabyImage(f)
                        setBabyImagePreview(URL.createObjectURL(f))
                      }
                    }}
                  />
                  <p className="font-sans text-[9px] text-bark-400/60 mt-2">
                    Upload a baby photo for reference. Image discarded after generation.
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={handleAiGenerate}
              disabled={aiGenerating || (lifestyleMode ? !clothingImage : (!aiPrompt && !aiBaseFile))}
              className="flex items-center gap-2 bg-gold-400 text-white font-sans text-[10px] tracking-[0.2em] uppercase px-6 py-2.5 hover:bg-gold-500 transition-colors disabled:opacity-40"
            >
              <Sparkles size={12} />
              {aiGenerating ? 'Generating…' : lifestyleMode ? 'Generate Lifestyle Photo' : 'Generate Photo'}
            </button>
          </div>

        </div>

        {/* RIGHT — Product Details + Inventory */}
        <div className="space-y-6">

          {/* Product Details */}
          <div className="bg-white border border-cream-300 rounded-xl p-6">
            <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark-400 mb-5">Product Details</p>

            {/* AI Draft helper */}
            <div className="mb-6 border border-gold-200 bg-gold-50/40 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={13} className="text-gold-400" />
                <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-bark-500">AI Draft Writer</p>
              </div>
              <p className="font-sans text-[10px] text-bark-400 mb-3 leading-relaxed">
                Type a few keywords or attach a supplier spec sheet (PDF/image). Claude drafts the name, ingredients, description &amp; tag in the brand voice. Review before saving.
              </p>
              <textarea
                value={draftKeywords}
                onChange={e => setDraftKeywords(e.target.value)}
                placeholder="e.g. organic cotton sleep sack, GOTS certified, sage green, sizes 0-6m, TOG 1.0…"
                rows={2}
                className={inputCls + ' resize-none mb-2'}
              />
              {draftFile && (
                <div className="flex items-center gap-2 mb-2 text-xs text-bark-500">
                  <span className="truncate flex-1">{draftFile.name}</span>
                  <button onClick={() => setDraftFile(null)} className="text-bark-400 hover:text-red-500 transition-colors">
                    <X size={13} />
                  </button>
                </div>
              )}
              {draftError && <p className="font-sans text-[10px] text-red-500 mb-2">{draftError}</p>}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAiDraft}
                  disabled={drafting || (!draftKeywords.trim() && !draftFile)}
                  className="flex items-center gap-1.5 bg-gold-400 text-white font-sans text-[10px] tracking-[0.15em] uppercase px-4 py-2 rounded hover:bg-gold-500 transition-colors disabled:opacity-40"
                >
                  {drafting ? <Loader size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  {drafting ? 'Writing…' : 'Draft with AI'}
                </button>
                <button
                  onClick={() => draftFileRef.current?.click()}
                  disabled={drafting}
                  className="flex items-center gap-1.5 border border-cream-300 text-bark-500 font-sans text-[10px] tracking-[0.15em] uppercase px-4 py-2 rounded hover:border-bark-400 transition-colors disabled:opacity-40"
                >
                  <Upload size={12} />
                  Attach File
                </button>
                <input
                  ref={draftFileRef}
                  type="file"
                  accept="application/pdf,image/*"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) setDraftFile(f)
                    e.target.value = ''
                  }}
                />
              </div>
            </div>

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
                <label className={labelCls}>Description</label>
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
                <label className={labelCls}>Ingredients / Materials</label>
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
                <p className="font-sans text-[10px] text-bark-400/70 mb-3">
                  Each row is one color + size with its own stock. Customers choose from these; sizes with 0 stock show as unavailable.
                </p>
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
                      <input
                        type="color"
                        value={v.color_hex || '#cccccc'}
                        onChange={e => updateVariant(i, 'color_hex', e.target.value)}
                        className="w-8 h-8 rounded border border-cream-300 shrink-0 cursor-pointer"
                        title="Swatch color"
                      />
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
