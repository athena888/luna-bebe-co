'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { getAllProducts, CATEGORY_LABELS, CATEGORY_ORDER } from '@/lib/products'
import { PRODUCT_TAGS } from '@/lib/product-tags'
import type { ProductCategory } from '@/types'
import { resizeImage } from '@/lib/image-resize'
import { ProductPrices } from '@/components/portal/ProductPrices'
import type { CertDef, ProductCert } from '@/lib/certifications'
import { ArrowLeft, Upload, Trash2, Star, Loader, Check, Plus, Minus, X, ShieldCheck, Wand2, Sparkles } from 'lucide-react'

type GalleryImage = {
  id: string
  product_id: string
  image_url: string
  label: string | null
  is_primary: boolean
  is_hover?: boolean
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
  image?: string | null
  active?: boolean
  needs_review?: boolean
}

type Variant = {
  id?: string
  color: string
  color_code?: string | null
  color_hex?: string | null
  style?: string | null        // optional shape/style (e.g. Star, Moon)
  size: string
  quantity: number
  unit_price?: number | null   // dollars
}

type InventoryChange = {
  id: string
  color: string
  color_code: string | null
  color_hex: string | null
  size: string
  old_quantity: number
  delta: number
  new_quantity: number
}

const VARIANT_SIZES = ['0-3', '3-6', '6-9', '9-12', '12-18', '18-24', 'one-size']
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

const inputCls = "w-full px-3 py-2.5 border border-cream-300 bg-white font-sans text-sm text-bark-600 placeholder:text-bark-400/40 focus:outline-none focus:border-bark-400 transition-colors rounded"
const labelCls = "block font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-1.5"

// Primary photo always first, then by sort_order
function sortGallery(imgs: GalleryImage[]): GalleryImage[] {
  return [...imgs].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1
    if (!a.is_primary && b.is_primary) return 1
    return a.sort_order - b.sort_order
  })
}

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
  const [published, setPublished] = useState(true)
  const [needsReview, setNeedsReview] = useState(false)
  const [featured, setFeatured] = useState(false)
  const [organic, setOrganic] = useState(false)
  const [changes, setChanges] = useState<InventoryChange[]>([])
  const [changeBusy, setChangeBusy] = useState(false)
  const [aiScanning, setAiScanning] = useState(false)
  const [aiNames, setAiNames] = useState<string[]>([])
  const [aiMsg, setAiMsg] = useState('')
  const [detectedColors, setDetectedColors] = useState<Array<{ name: string; hex: string }> | null>(null)
  const [colorDetecting, setColorDetecting] = useState(false)
  const [dropVariant, setDropVariant] = useState<number | null>(null)
  const [dragImg, setDragImg] = useState<number | null>(null)
  const [styling, setStyling] = useState(false)
  const [styleMsg, setStyleMsg] = useState('')
  // SEO Studio state
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [faqs, setFaqs] = useState<{ q: string; a: string }[]>([])
  const [seoBrandVoice, setSeoBrandVoice] = useState('Warm, poetic, premium, calming')
  const [seoKeyword, setSeoKeyword] = useState('')
  const [seoSpecs, setSeoSpecs] = useState('')
  const [seoLoading, setSeoLoading] = useState(false)
  const [seoMsg, setSeoMsg] = useState('')
  const [certs, setCerts] = useState<ProductCert[]>([])
  const [certLibrary, setCertLibrary] = useState<CertDef[]>([])
  const [certUploading, setCertUploading] = useState<string | null>(null)
  const [altBusy, setAltBusy] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // Upload state
  const [uploading, setUploading] = useState(false)
  const [uploadPrimary, setUploadPrimary] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const galleryInputRef = useRef<HTMLInputElement>(null)

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
      setGallery(sortGallery(data.gallery ?? []))
      setInventory(data.inventory.quantity)
      if (data.sales) setSales(data.sales)
      setHasVariants(!!data.product.has_variants)
      setCerts(data.product.certifications ?? [])
      setPublished(data.product.active !== false)
      setNeedsReview(!!data.product.needs_review)
      setSeoTitle(data.product.seo_title ?? '')
      setSeoDescription(data.product.seo_description ?? '')
      setFaqs(Array.isArray(data.product.faqs) ? data.product.faqs : [])
      setFeatured(!!data.product.featured)
      setOrganic(!!data.product.organic)
    }
    // Load cert library + pending inventory changes in parallel
    fetch('/api/portal/cert-library').then(r => r.json()).then(d => setCertLibrary(d.certs ?? [])).catch(() => {})
    fetch(`/api/portal/products/${id}/changes`).then(r => r.json()).then(d => setChanges(d.changes ?? [])).catch(() => {})
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

  async function handleSave(opts?: { active?: boolean; needsReview?: boolean }) {
    if (!product) return
    const nextActive = opts?.active ?? published
    const nextReview = opts?.needsReview ?? needsReview
    setSaving(true)
    setSaveMsg('')
    const res = await fetch(`/api/portal/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: product.name,
        description: product.description,
        price: product.price,
        category: product.category,
        tag: product.tag,
        ingredients: product.ingredients,
        inventoryQuantity: inventory,
        hasVariants,
        certifications: certs,
        active: nextActive,
        needsReview: nextReview,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
        faqs: faqs.filter(f => f.q.trim() && f.a.trim()),
        featured,
        organic,
      }),
    })
    if (opts?.active !== undefined) setPublished(opts.active)
    if (opts?.needsReview !== undefined) setNeedsReview(opts.needsReview)
    let detailError = ''
    if (!res.ok) { const d = await res.json().catch(() => ({})); detailError = d.error || 'Error saving' }
    // Save variants when this product uses them.
    // Fall back to the hex value as the color name when none is typed,
    // so a row with only a swatch still saves instead of being dropped.
    let variantError = ''
    if (hasVariants) {
      const variantsToSave = variants
        .map(v => ({ ...v, color: (v.color.trim() || v.color_hex?.trim() || '') }))
        .filter(v => v.color && v.size.trim())
      const vRes = await fetch(`/api/portal/products/${id}/variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variants: variantsToSave }),
      })
      if (!vRes.ok) {
        const d = await vRes.json().catch(() => ({}))
        variantError = d.errors?.[0] || 'Variants failed to save'
      }
    }
    setSaving(false)
    const anyError = detailError || variantError
    setSaveMsg(anyError ? `Error: ${anyError}` : 'Saved')
    setTimeout(() => setSaveMsg(''), anyError ? 6000 : 2000)
  }

  // Approve (keep) or revert (undo the added qty) imported stock changes
  async function resolveChange(action: 'approve' | 'revert', changeId?: string, all?: boolean) {
    setChangeBusy(true)
    try {
      await fetch(`/api/portal/products/${id}/changes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, changeId, all }),
      })
      await load()  // refresh variants + remaining changes + review flag
    } finally {
      setChangeBusy(false)
    }
  }

  // AI: suggest name / description / materials from the product's primary photo
  async function aiScanFromPhoto() {
    const primary = gallery.find(g => g.is_primary) ?? gallery[0]
    if (!primary) { setAiMsg('Add a photo first, then scan.'); setTimeout(() => setAiMsg(''), 2500); return }
    setAiScanning(true)
    setAiMsg('')
    setAiNames([])
    try {
      const blob = await fetch(primary.image_url).then(r => r.blob())
      const form = new FormData()
      form.append('file', blob, 'product.jpg')
      form.append('category', product?.category ?? '')
      const res = await fetch('/api/portal/products/ai-describe', { method: 'POST', body: form })
      const data = await res.json()
      if (data.draft) {
        setAiNames(data.draft.names || [])
        if (data.draft.description) setProduct(p => p ? { ...p, description: data.draft.description } : p)
        if (data.draft.ingredients) setProduct(p => p ? { ...p, ingredients: data.draft.ingredients } : p)
        if (data.draft.tag) setProduct(p => p ? { ...p, tag: data.draft.tag } : p)
        setAiMsg('Filled description & materials below — pick a name if you like, then Save.')
      } else {
        setAiMsg(data.error || 'Could not read the photo')
      }
    } catch {
      setAiMsg('AI scan failed')
    } finally {
      setAiScanning(false)
    }
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
      // Shrink large photos client-side first (PDFs pass through unchanged) so
      // the upload is fast and stays under the serverless body limit.
      const prepared = await resizeImage(file, 1600, 0.85)
      const form = new FormData()
      form.append('file', prepared)
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

  // AI restyle: take the primary photo and re-stage it in the house style
  // (oat-muslin flat lay, soft daylight) while keeping the garment. Saves the
  // result as a NEW primary image so the original stays as a fallback.
  async function stylePhoto() {
    const primary = gallery.find(g => g.is_primary) ?? gallery[0]
    if (!primary) { setStyleMsg('Add a photo first.'); setTimeout(() => setStyleMsg(''), 2500); return }
    setStyling(true)
    setStyleMsg('Restyling… this can take ~20s')
    try {
      const blob = await fetch(primary.image_url).then(r => r.blob())
      const form = new FormData()
      form.append('file', blob)
      const res = await fetch(`/api/portal/products/${id}/restyle`, { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok || !data.imageData) { setStyleMsg(data.error || 'Restyle failed'); return }
      // Convert base64 → blob and save as new primary image
      const b64 = data.imageData.split(',')[1]
      const bin = atob(b64)
      const arr = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
      const styledBlob = new Blob([arr], { type: 'image/jpeg' })
      const gForm = new FormData()
      gForm.append('file', styledBlob, `styled-${Date.now()}.jpg`)
      gForm.append('primary', 'true')
      await fetch(`/api/portal/products/${id}/gallery`, { method: 'POST', body: gForm })
      await load()
      setStyleMsg('Done — styled photo set as primary. Original kept below.')
      setTimeout(() => setStyleMsg(''), 4000)
    } catch {
      setStyleMsg('Restyle failed')
    } finally {
      setStyling(false)
    }
  }

  async function splitByColor() {
    const colorCount = new Set(variants.map(v => v.color.toLowerCase().trim()).filter(Boolean)).size
    if (colorCount < 2) { alert('This product needs at least 2 colors to split.'); return }
    if (!confirm(`Split into ${colorCount} separate products (one per color)? Each color becomes a new unpublished draft with its own stock and a copy of the photo. The original is unpublished.`)) return
    setSaving(true)
    try {
      const res = await fetch(`/api/portal/products/${id}/split`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { alert(data.error || 'Split failed'); setSaving(false); return }
      router.push('/portal/products')
    } catch {
      alert('Split failed'); setSaving(false)
    }
  }

  // Interactive SEO generator — uses owner hints + the primary photo
  async function generateSeo() {
    setSeoLoading(true)
    setSeoMsg('')
    setAiNames([])
    try {
      const form = new FormData()
      const primary = gallery.find(g => g.is_primary) ?? gallery[0]
      if (primary) {
        const blob = await fetch(primary.image_url).then(r => r.blob())
        form.append('file', blob, 'product.jpg')
      }
      form.append('brandVoice', seoBrandVoice)
      form.append('targetKeyword', seoKeyword)
      form.append('specs', seoSpecs)
      form.append('currentName', product?.name ?? '')
      form.append('category', product?.category ?? '')
      const res = await fetch('/api/portal/products/ai-seo', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok || !data.seo) { setSeoMsg(data.error || 'Generation failed'); return }
      const s = data.seo
      if (Array.isArray(s.names)) setAiNames(s.names)
      if (s.description) setProduct(p => p ? { ...p, description: s.description } : p)
      if (s.titleTag) setSeoTitle(s.titleTag)
      if (s.metaDescription) setSeoDescription(s.metaDescription)
      if (Array.isArray(s.faqs)) setFaqs(s.faqs.map((f: { q: string; a: string }) => ({ q: f.q, a: f.a })))
      setSeoMsg('Generated — review the name options, description, title tag, meta & FAQs below, then Save.')
    } catch {
      setSeoMsg('Generation failed')
    } finally {
      setSeoLoading(false)
    }
  }

  async function handleGalleryUpload(file: File, primary: boolean) {
    setUploading(true)
    setUploadError('')
    // Shrink/convert phone photos so they fit Vercel's upload size limit
    const resized = await resizeImage(file)
    const form = new FormData()
    form.append('file', resized)
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
    setGallery(g => sortGallery(g.map(img => ({ ...img, is_primary: img.id === imageId }))))
  }

  async function handleSetHover(imageId: string) {
    await fetch(`/api/portal/products/${id}/gallery/${imageId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'hover' }),
    })
    setGallery(g => g.map(img => ({ ...img, is_hover: img.id === imageId })))
  }

  // AI: generate alt text for a single gallery photo (Claude vision) and save it.
  async function aiAltForImage(img: GalleryImage) {
    setAltBusy(img.id)
    try {
      const res = await fetch('/api/portal/site-images/alt-suggest', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: img.image_url, context: product?.name }),
      })
      const data = await res.json()
      if (data.altText) {
        await fetch(`/api/portal/products/${id}/gallery/${img.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label: data.altText }),
        })
        setGallery(g => g.map(x => x.id === img.id ? { ...x, label: data.altText } : x))
      }
    } finally { setAltBusy(null) }
  }

  // Drag-to-reorder gallery photos
  async function reorderGallery(from: number, to: number) {
    if (from === to) return
    const next = [...gallery]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setGallery(next)
    await fetch(`/api/portal/products/${id}/gallery/reorder`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds: next.map(g => g.id) }),
    }).catch(() => {})
  }

  if (loading) return <div className="p-8 flex items-center gap-3 font-sans text-sm text-bark-400"><Loader size={16} className="animate-spin" /> Loading…</div>
  if (!product) return <div className="p-8 font-sans text-bark-400">Product not found. (Try refreshing the page or going back.)</div>

  return (
    <div className="p-6 max-w-7xl">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/portal/products')} className="text-bark-400 hover:text-bark-600 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark-400">{product.category}</p>
              {!published && <span className="font-sans text-[9px] tracking-[0.15em] uppercase bg-bark-200 text-bark-600 px-2 py-0.5 rounded">Unpublished</span>}
              {needsReview && <span className="font-sans text-[9px] tracking-[0.15em] uppercase bg-amber-100 text-amber-700 px-2 py-0.5 rounded">Needs review</span>}
              {published && !needsReview && <span className="font-sans text-[9px] tracking-[0.15em] uppercase bg-sage-100 text-sage-700 px-2 py-0.5 rounded">Published</span>}
            </div>
            <h1 className="font-serif text-2xl text-bark-600">{product.name}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(!published || needsReview) && (
            <button
              onClick={() => handleSave({ active: true, needsReview: false })}
              disabled={saving}
              className="flex items-center gap-2 bg-sage-500 text-white font-sans text-[11px] tracking-[0.2em] uppercase px-5 py-2.5 hover:bg-sage-600 transition-colors disabled:opacity-40"
              title="Verify looks good, mark reviewed, and show to customers"
            >
              <Check size={13} /> Publish
            </button>
          )}
          {published && !needsReview && (
            <button
              onClick={() => handleSave({ active: false })}
              disabled={saving}
              className="font-sans text-[11px] tracking-[0.2em] uppercase px-4 py-2.5 border border-cream-300 text-bark-500 hover:border-bark-400 transition-colors disabled:opacity-40"
              title="Hide from customers"
            >
              Unpublish
            </button>
          )}
          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="flex items-center gap-2 bg-bark-600 text-white font-sans text-[11px] tracking-[0.2em] uppercase px-6 py-2.5 hover:bg-bark-700 transition-colors disabled:opacity-40"
          >
            {saving ? <Loader size={13} className="animate-spin" /> : saveMsg === 'Saved' ? <Check size={13} /> : null}
            {saving ? 'Saving…' : saveMsg || 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="space-y-6">

        {/* Pending inventory changes — review before they count */}
        {changes.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
              <div>
                <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-amber-700">Pending stock changes from import</p>
                <p className="font-sans text-xs text-amber-700/80 mt-0.5">These quantities were already added. Approve to keep them, or revert to undo and restore the previous stock.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => resolveChange('approve', undefined, true)} disabled={changeBusy}
                  className="bg-sage-500 text-white font-sans text-[10px] tracking-[0.15em] uppercase px-4 py-2 rounded hover:bg-sage-600 transition-colors disabled:opacity-40">Approve all</button>
                <button onClick={() => resolveChange('revert', undefined, true)} disabled={changeBusy}
                  className="border border-amber-400 text-amber-700 font-sans text-[10px] tracking-[0.15em] uppercase px-4 py-2 rounded hover:bg-amber-100 transition-colors disabled:opacity-40">Revert all</button>
              </div>
            </div>
            <div className="space-y-1.5">
              {changes.map(c => (
                <div key={c.id} className="flex items-center gap-3 flex-wrap bg-white/60 rounded px-3 py-2">
                  {c.color_hex && <span className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: c.color_hex }} />}
                  <span className="font-sans text-xs text-bark-600 min-w-0">
                    {c.color_code ? <span className="text-bark-400">[{c.color_code}] </span> : null}
                    <strong>{c.color}</strong> · {c.size}
                  </span>
                  <span className="font-sans text-xs text-bark-500">{c.old_quantity} → <strong className="text-bark-700">{c.new_quantity}</strong> <span className="text-sage-600">(+{c.delta})</span></span>
                  <div className="flex gap-1.5 ml-auto">
                    <button onClick={() => resolveChange('approve', c.id)} disabled={changeBusy}
                      className="text-sage-600 hover:text-sage-700 font-sans text-[10px] uppercase tracking-[0.12em]">Approve</button>
                    <button onClick={() => resolveChange('revert', c.id)} disabled={changeBusy}
                      className="text-red-500 hover:text-red-600 font-sans text-[10px] uppercase tracking-[0.12em]">Revert</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Row 1 — Gallery + Product Details side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* Gallery */}
        <div className="space-y-8">

          {/* Photo Gallery */}
          <div className="bg-white border border-cream-300 rounded-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-2 mb-5">
              <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark-400">Photo Gallery</p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <button
                  onClick={stylePhoto}
                  disabled={styling || gallery.length === 0}
                  className="flex items-center gap-1.5 border border-gold-400 text-gold-600 font-sans text-[10px] tracking-[0.15em] uppercase px-3 py-1.5 rounded hover:bg-gold-50 transition-colors disabled:opacity-40"
                  title="Re-stage the primary photo in the house style (oat-muslin flat lay, soft daylight) — keeps the garment, original is kept as fallback"
                >
                  {styling ? <Loader size={12} className="animate-spin" /> : <Wand2 size={12} />}
                  {styling ? 'Styling…' : 'Style photo (AI)'}
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
            {styleMsg && (
              <p className="mb-4 font-sans text-xs text-bark-600 bg-cream-50 border border-cream-200 rounded px-3 py-2">{styleMsg}</p>
            )}

            {gallery.length === 0 ? (
              (() => {
                // Fall back to the product's main image (the storefront headshot)
                // when there are no gallery rows yet.
                const headshot = product.image
                  || (SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/product-images/${product.id}.jpg` : null)
                return (
                  <div className="space-y-3">
                    {headshot && (
                      <div className="relative aspect-square w-full max-w-[200px] bg-cream-200 rounded-lg overflow-hidden">
                        <Image src={headshot} alt={product.name} fill className="object-cover" unoptimized
                          onError={e => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none' }} />
                        <div className="absolute top-2 left-2 bg-gold-400 text-white font-sans text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 rounded">
                          Current
                        </div>
                      </div>
                    )}
                    <div
                      className="border-2 border-dashed border-cream-300 rounded-lg h-32 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-bark-400 transition-colors"
                      onClick={() => galleryInputRef.current?.click()}
                    >
                      <Upload size={20} className="text-bark-400/50" />
                      <p className="font-sans text-xs text-bark-400">{headshot ? 'Add gallery photos' : 'Click to upload your first photo'}</p>
                      <p className="font-sans text-[10px] text-bark-400/60">Best size: 1200 × 1600 px (3:4 portrait)</p>
                    </div>
                  </div>
                )
              })()
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {gallery.map((img, idx) => {
                  return (
                  <div
                    key={img.id}
                    draggable
                    onDragStart={() => setDragImg(idx)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); if (dragImg !== null) reorderGallery(dragImg, idx); setDragImg(null) }}
                    onDragEnd={() => setDragImg(null)}
                    className={`group relative aspect-square bg-cream-200 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing ${dragImg === idx ? 'opacity-50' : ''}`}
                  >
                    <Image src={img.image_url} alt={img.label ?? product.name} fill className="object-cover pointer-events-none" unoptimized />
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {img.is_primary && (
                        <span className="bg-gold-400 text-white font-sans text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 rounded">Primary</span>
                      )}
                      {img.is_hover && (
                        <span className="bg-sage-400 text-white font-sans text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 rounded">Hover</span>
                      )}
                    </div>
                    <div className="absolute inset-0 bg-bark-600/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2.5">
                      <button
                        onClick={() => handleSetPrimary(img.id)}
                        title={img.is_primary ? 'This is the primary photo' : 'Set as primary photo'}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                          img.is_primary ? 'bg-gold-400' : 'bg-white hover:bg-gold-100'
                        }`}
                      >
                        <Star size={14} className={img.is_primary ? 'text-white fill-current' : 'text-bark-600'} />
                      </button>
                      <button
                        onClick={() => handleSetHover(img.id)}
                        title={img.is_hover ? 'This is the hover photo' : 'Set as hover photo (shown on card hover)'}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-bold tracking-wide transition-colors ${
                          img.is_hover ? 'bg-sage-400 text-white' : 'bg-white text-bark-600 hover:bg-sage-100'
                        }`}
                      >
                        H
                      </button>
                      <button
                        onClick={() => aiAltForImage(img)}
                        disabled={altBusy === img.id}
                        title="Generate alt text with AI"
                        className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-gold-100 transition-colors disabled:opacity-50"
                      >
                        {altBusy === img.id ? <Loader size={14} className="text-bark-600 animate-spin" /> : <Sparkles size={14} className="text-gold-500" />}
                      </button>
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
                  className="aspect-square border-2 border-dashed border-cream-300 rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-bark-400 transition-colors text-center px-2"
                  onClick={() => galleryInputRef.current?.click()}
                >
                  <Plus size={20} className="text-bark-400/50" />
                  <span className="font-sans text-[9px] text-bark-400/60 leading-tight">1200×1600 px<br />(3:4)</span>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Product Details */}
        <div className="bg-white border border-cream-300 rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark-400">Product Details</p>
              <button
                onClick={aiScanFromPhoto}
                disabled={aiScanning}
                className="flex items-center gap-1.5 border border-gold-400 text-gold-600 font-sans text-[10px] tracking-[0.15em] uppercase px-3 py-1.5 rounded hover:bg-gold-50 transition-colors disabled:opacity-40"
                title="Scan the product photo and suggest a name, description, and materials"
              >
                {aiScanning ? <Loader size={12} className="animate-spin" /> : <Wand2 size={12} />}
                {aiScanning ? 'Scanning…' : 'AI fill from photo'}
              </button>
            </div>
            {aiMsg && <p className="font-sans text-[11px] text-bark-500 bg-cream-50 border border-cream-200 rounded px-3 py-2 mb-3">{aiMsg}</p>}

            <div className="space-y-4">
              <div>
                <label className={labelCls}>Name</label>
                <input
                  type="text"
                  value={product.name}
                  onChange={e => setProduct(p => p ? { ...p, name: e.target.value } : p)}
                  className={inputCls}
                />
                {aiNames.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {aiNames.map(n => (
                      <button key={n} onClick={() => setProduct(p => p ? { ...p, name: n } : p)}
                        className="px-2 py-1 rounded border border-cream-300 text-bark-500 hover:border-bark-400 font-sans text-[11px] transition-colors">{n}</button>
                    ))}
                  </div>
                )}
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
              {product?.id && (
                <ProductPrices productId={product.id} basePriceCents={product.price} />
              )}
              <div>
                <label className={labelCls}>Category</label>
                <select
                  value={product.category}
                  onChange={e => setProduct(p => p ? { ...p, category: e.target.value as ProductCategory } : p)}
                  className={inputCls + ' appearance-none cursor-pointer'}
                >
                  {CATEGORY_ORDER.map(cat => (
                    <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                  ))}
                </select>
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
              <div className="flex flex-wrap gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)} className="accent-gold-500 w-4 h-4" />
                  <span className="font-sans text-xs text-bark-600">⭐ Show in Bestsellers carousel</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={organic} onChange={e => setOrganic(e.target.checked)} className="accent-sage-500 w-4 h-4" />
                  <span className="font-sans text-xs text-bark-600">🌿 Organic (shows organic badge)</span>
                </label>
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

        </div>{/* end Row 1 */}

        {/* SEO Studio */}
        <div className="bg-white border border-cream-300 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <Wand2 size={14} className="text-gold-400" />
            <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark-400">SEO Studio</p>
          </div>
          <p className="font-sans text-[11px] text-bark-400 mb-4 leading-relaxed max-w-2xl">
            These three inputs are <strong>your suggestions to guide optimization</strong> — give what you know and AI turns it into
            keyword-led SEO. On-page copy stays poetic for customers; the title tag &amp; meta are built robust for search.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className={labelCls}>Brand voice</label>
              <input value={seoBrandVoice} onChange={e => setSeoBrandVoice(e.target.value)} className={inputCls} placeholder="Warm, poetic, premium" />
            </div>
            <div>
              <label className={labelCls}>Target keyword</label>
              <input value={seoKeyword} onChange={e => setSeoKeyword(e.target.value)} className={inputCls} placeholder="e.g. organic baby bubble romper" />
            </div>
            <div>
              <label className={labelCls}>Verified specs</label>
              <input value={seoSpecs} onChange={e => setSeoSpecs(e.target.value)} className={inputCls} placeholder="material, cert, size, origin, what's inside" />
            </div>
          </div>
          <button
            onClick={generateSeo}
            disabled={seoLoading}
            className="flex items-center gap-1.5 bg-gold-400 text-white font-sans text-[10px] tracking-[0.2em] uppercase px-4 py-2 rounded hover:bg-gold-500 transition-colors disabled:opacity-40"
          >
            {seoLoading ? <Loader size={12} className="animate-spin" /> : <Wand2 size={12} />}
            {seoLoading ? 'Generating…' : 'Generate names, copy, title, meta & FAQs'}
          </button>
          {seoMsg && <p className="font-sans text-[11px] text-bark-500 mt-3 bg-cream-50 border border-cream-200 rounded px-3 py-2">{seoMsg}</p>}

          {/* SEO outputs (editable, saved with the product) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-5">
            <div>
              <label className={labelCls}>Title tag <span className="text-bark-400/60">({seoTitle.length}/60)</span></label>
              <input value={seoTitle} onChange={e => setSeoTitle(e.target.value)} className={inputCls} placeholder="Keyword-led title for search (≤60 chars)" />
            </div>
            <div>
              <label className={labelCls}>Meta description <span className="text-bark-400/60">({seoDescription.length}/160)</span></label>
              <input value={seoDescription} onChange={e => setSeoDescription(e.target.value)} className={inputCls} placeholder="150–160 char search snippet" />
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <label className={labelCls}>FAQs (used for Google FAQ rich results)</label>
              <button onClick={() => setFaqs(f => [...f, { q: '', a: '' }])} className="font-sans text-[11px] text-gold-500 hover:text-gold-600 flex items-center gap-1"><Plus size={12} /> Add FAQ</button>
            </div>
            <div className="space-y-2">
              {faqs.map((f, i) => (
                <div key={i} className="border border-cream-200 rounded-lg p-2 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <input value={f.q} onChange={e => setFaqs(prev => prev.map((x, j) => j === i ? { ...x, q: e.target.value } : x))} placeholder="Question" className="flex-1 px-2 py-1.5 border border-cream-300 rounded text-sm text-bark-600 focus:outline-none focus:border-bark-400" />
                    <button onClick={() => setFaqs(prev => prev.filter((_, j) => j !== i))} className="text-bark-300 hover:text-red-500 shrink-0"><Trash2 size={13} /></button>
                  </div>
                  <textarea value={f.a} onChange={e => setFaqs(prev => prev.map((x, j) => j === i ? { ...x, a: e.target.value } : x))} placeholder="Answer" rows={2} className="w-full px-2 py-1.5 border border-cream-300 rounded text-sm text-bark-600 resize-none focus:outline-none focus:border-bark-400" />
                </div>
              ))}
              {faqs.length === 0 && <p className="font-sans text-[11px] text-bark-300">No FAQs yet — generate above or add manually.</p>}
            </div>
          </div>
        </div>

        {/* Row 2 — Sizes & Colors (full width — it has the most fields) */}
        <div>

          {/* Variants (sizes & colors) */}
          <div className="bg-white border border-cream-300 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark-400">Sizes &amp; Colors</p>
              <div className="flex items-center gap-3">
                {hasVariants && new Set(variants.map(v => v.color.toLowerCase().trim()).filter(Boolean)).size >= 2 && (
                  <button
                    onClick={splitByColor}
                    className="font-sans text-[10px] tracking-[0.15em] uppercase text-bark-500 border border-cream-300 hover:border-bark-400 px-3 py-1.5 rounded transition-colors"
                    title="Split this product into one separate product per color"
                  >
                    Split by color
                  </button>
                )}
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
            </div>

            {hasVariants ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <p className="font-sans text-[10px] text-bark-400/70 max-w-md">
                    Each row is one color + size with its own stock. Customers choose from these; sizes with 0 stock show as unavailable.
                  </p>
                  {(() => {
                    const total = variants.reduce((s, v) => s + (Number(v.quantity) || 0), 0)
                    return (
                      <span className={`shrink-0 font-sans text-[11px] tracking-[0.1em] uppercase px-3 py-1.5 rounded-full ${total > 0 ? 'bg-sage-100 text-sage-700' : 'bg-cream-200 text-bark-400'}`}>
                        In stock: {total}
                      </span>
                    )
                  })()}
                </div>

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
                      <p className="font-sans text-[10px] text-bark-400">Tap to add a new row · or drag a color onto a row below to recolor it.</p>
                      <div className="flex flex-wrap gap-2">
                        {detectedColors.map((col, idx) => (
                          <button
                            key={idx}
                            draggable
                            onDragStart={e => { e.dataTransfer.setData('application/x-color', JSON.stringify(col)); e.dataTransfer.effectAllowed = 'copy' }}
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
                            className="flex items-center gap-2 px-2.5 py-1.5 bg-white border border-cream-300 rounded hover:border-bark-400 text-sm text-bark-600 transition-colors cursor-grab active:cursor-grabbing"
                            title="Drag onto a variant row to recolor it"
                          >
                            <span className="w-5 h-5 rounded border border-bark-200 shrink-0" style={{ backgroundColor: col.hex }} />
                            <span className="flex flex-col items-start leading-tight">
                              <span>{col.name}</span>
                              <span className="font-mono text-[9px] text-bark-400">{col.hex}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Column headers — desktop only (rows stack on mobile) */}
                {variants.length > 0 && (
                  <div className="hidden lg:flex items-center gap-2 px-1 mb-1.5">
                    <span className="flex-1 min-w-0 font-sans text-[9px] tracking-[0.15em] uppercase text-bark-400">Color name</span>
                    <span className="w-16 text-center font-sans text-[9px] tracking-[0.15em] uppercase text-bark-400 shrink-0">Code</span>
                    <span className="w-20 text-center font-sans text-[9px] tracking-[0.15em] uppercase text-bark-400 shrink-0">Hex</span>
                    <span className="w-9 shrink-0" />
                    <span className="w-24 text-center font-sans text-[9px] tracking-[0.15em] uppercase text-bark-400 shrink-0">Style</span>
                    <span className="w-20 text-center font-sans text-[9px] tracking-[0.15em] uppercase text-bark-400 shrink-0">Size</span>
                    <span className="w-16 text-center font-sans text-[9px] tracking-[0.15em] uppercase text-bark-400 shrink-0">Stock</span>
                    <span className="w-4 shrink-0" />
                  </div>
                )}
                <div className="space-y-3 lg:space-y-2">
                  {variants.map((v, i) => (
                    <div
                      key={v.id ?? i}
                      onDragOver={e => { if (e.dataTransfer.types.includes('application/x-color')) { e.preventDefault(); setDropVariant(i) } }}
                      onDragLeave={() => setDropVariant(d => d === i ? null : d)}
                      onDrop={e => {
                        const raw = e.dataTransfer.getData('application/x-color')
                        if (!raw) return
                        e.preventDefault(); setDropVariant(null)
                        try { const c = JSON.parse(raw); updateVariant(i, 'color', c.name); if (c.hex) updateVariant(i, 'color_hex', c.hex) } catch {}
                      }}
                      className={`flex flex-wrap items-center gap-2 rounded-lg p-2 border lg:border-0 lg:p-0 lg:rounded-none transition-colors ${
                        dropVariant === i ? 'border-gold-300 bg-gold-50/60' : 'border-cream-200 lg:bg-transparent'
                      }`}
                    >
                      <input
                        type="text"
                        value={v.color}
                        onChange={e => updateVariant(i, 'color', e.target.value)}
                        placeholder="Color name (e.g. Dusty Rose)"
                        className="basis-full lg:basis-auto lg:flex-1 min-w-0 px-2 py-1.5 border border-cream-300 rounded text-sm text-bark-600 focus:outline-none focus:border-bark-400"
                      />
                      <input
                        type="text"
                        value={v.color_code || ''}
                        onChange={e => updateVariant(i, 'color_code', e.target.value)}
                        placeholder="code"
                        className="flex-1 min-w-[3.5rem] lg:flex-none lg:w-16 px-2 py-1.5 border border-cream-300 rounded text-xs text-bark-600 text-center focus:outline-none focus:border-bark-400"
                        title="Supplier color code"
                      />
                      <input
                        type="text"
                        value={v.color_hex || ''}
                        onChange={e => updateVariant(i, 'color_hex', e.target.value)}
                        placeholder="#hex"
                        className="flex-1 min-w-[4rem] lg:flex-none lg:w-20 px-2 py-1.5 border border-cream-300 rounded text-xs text-bark-600 text-center focus:outline-none focus:border-bark-400"
                        title="Hex color code"
                      />
                      <input
                        type="color"
                        value={v.color_hex || '#cccccc'}
                        onChange={e => updateVariant(i, 'color_hex', e.target.value)}
                        className="w-9 h-9 rounded border border-cream-300 shrink-0 cursor-pointer"
                        title="Pick swatch color"
                      />
                      <input
                        type="text"
                        value={v.style || ''}
                        onChange={e => updateVariant(i, 'style', e.target.value)}
                        placeholder="style"
                        className="flex-1 min-w-[4rem] lg:flex-none lg:w-24 px-2 py-1.5 border border-cream-300 rounded text-xs text-bark-600 text-center focus:outline-none focus:border-bark-400"
                        title="Optional shape/style, e.g. Star or Moon"
                      />
                      <select
                        value={v.size}
                        onChange={e => updateVariant(i, 'size', e.target.value)}
                        className="flex-1 min-w-[4rem] lg:flex-none lg:w-20 px-1 py-1.5 border border-cream-300 rounded text-sm text-bark-600 focus:outline-none focus:border-bark-400"
                      >
                        {VARIANT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <input
                        type="number"
                        min={0}
                        value={v.quantity === 0 ? '' : v.quantity}
                        placeholder="0"
                        onChange={e => updateVariant(i, 'quantity', parseInt(e.target.value) || 0)}
                        className="flex-1 min-w-[3.5rem] lg:flex-none lg:w-16 px-2 py-1.5 border border-cream-300 rounded text-sm text-bark-600 text-center focus:outline-none focus:border-bark-400"
                        title="Quantity in stock"
                      />
                      <button
                        onClick={() => removeVariant(i)}
                        className="text-bark-300 hover:text-red-500 transition-colors shrink-0 ml-auto lg:ml-0"
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
                    value={inventory === 0 ? '' : inventory}
                    placeholder="0"
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

        </div>{/* end Row 2 */}

        {/* Row 3 — Sales + Certifications side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

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

        </div>{/* end Row 3 */}

        {/* Save button — spans full width */}
        <button
          onClick={() => handleSave()}
          disabled={saving}
          className="w-full bg-bark-600 text-white font-sans text-[11px] tracking-[0.2em] uppercase py-3.5 hover:bg-bark-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {saving ? <Loader size={13} className="animate-spin" /> : saveMsg === 'Saved' ? <Check size={13} /> : null}
          {saving ? 'Saving…' : saveMsg || 'Save All Changes'}
        </button>

      </div>
    </div>
  )
}
