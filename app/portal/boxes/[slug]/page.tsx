'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader, Check, Plus, Trash2, Upload, Star, Package, ChevronDown } from 'lucide-react'
import Image from 'next/image'
import type { ResolvedBox, SlotRef, Audience } from '@/lib/prebuilt-boxes-db'
import { resizeImage } from '@/lib/image-resize'
import { SiteImageUploader } from '@/components/portal/SiteImageUploader'

type CatalogProduct = { id: string; name: string; category: string; has_variants?: boolean; price: number; image?: string | null }
type BoxSlot = { key: string; label: string; product_id: string | null; color?: string | null; size?: string | null; audience?: Audience | null }

const SLOT_TEMPLATES: Array<{ key: string; label: string }> = [
  { key: 'swaddle', label: 'Swaddle / Blanket' },
  { key: 'garment', label: 'Garment' },
  { key: 'bath', label: 'Bath & Skincare' },
  { key: 'keepsake', label: 'Keepsake' },
  { key: 'mom', label: "Mama's Gift" },
  { key: 'extra1', label: 'Extra 1' },
  { key: 'extra2', label: 'Extra 2' },
]

const inputCls = "w-full px-3 py-2.5 border border-cream-300 bg-white font-sans text-sm text-bark-600 focus:outline-none focus:border-bark-400 transition-colors rounded"
const labelCls = "block font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-1.5"

// Visual product picker — searchable list with thumbnails (replaces the
// plain <select> so you can see what you're adding to the box).
function ProductPicker({ products, value, onChange }: { products: CatalogProduct[]; value: string | null; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const [dropUp, setDropUp] = useState(false)
  const [q, setQ] = useState('')
  const btnRef = useRef<HTMLButtonElement>(null)
  const selected = products.find(p => p.id === value)
  const ql = q.trim().toLowerCase()
  const filtered = ql ? products.filter(p => p.name.toLowerCase().includes(ql) || p.category.toLowerCase().includes(ql)) : products

  function toggle() {
    if (!open && btnRef.current) {
      // Open upward when there isn't room below, so the list always stays on screen.
      const rect = btnRef.current.getBoundingClientRect()
      setDropUp(window.innerHeight - rect.bottom < 320 && rect.top > window.innerHeight / 2)
    }
    setOpen(o => !o)
  }

  return (
    <div className="relative">
      <button ref={btnRef} type="button" onClick={toggle} className={inputCls + ' flex items-center justify-between gap-2 cursor-pointer'}>
        <span className={`truncate ${selected ? 'text-bark-600' : 'text-bark-400'}`}>{selected ? selected.name : '— Empty —'}</span>
        <ChevronDown size={14} className="text-bark-400 shrink-0" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => { setOpen(false); setQ('') }} />
          <div className={`absolute z-30 w-full max-h-72 overflow-y-auto bg-white border border-cream-300 rounded-lg shadow-xl ${dropUp ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
            <div className="p-2 sticky top-0 bg-white border-b border-cream-200">
              <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search products…"
                className="w-full px-2 py-1.5 border border-cream-300 rounded text-sm text-bark-600 focus:outline-none focus:border-bark-400" />
            </div>
            <button type="button" onClick={() => { onChange(''); setOpen(false); setQ('') }}
              className="w-full text-left px-3 py-2 font-sans text-sm text-bark-400 hover:bg-cream-50">— Empty —</button>
            {filtered.map(p => (
              <button key={p.id} type="button" onClick={() => { onChange(p.id); setOpen(false); setQ('') }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-cream-50 ${p.id === value ? 'bg-cream-100' : ''}`}>
                <div className="w-9 h-9 rounded bg-cream-100 border border-cream-200 overflow-hidden shrink-0 flex items-center justify-center">
                  {p.image
                    ? <Image src={p.image} alt={p.name} width={36} height={36} className="w-full h-full object-cover" unoptimized />
                    : <Package size={14} className="text-bark-300" />}
                </div>
                <div className="min-w-0">
                  <p className="font-sans text-sm text-bark-600 truncate">{p.name}</p>
                  <p className="font-sans text-[10px] text-bark-400 capitalize">{p.category} · ${(p.price / 100).toFixed(2)}</p>
                </div>
              </button>
            ))}
            {filtered.length === 0 && <p className="px-3 py-3 font-sans text-xs text-bark-400">No matches</p>}
          </div>
        </>
      )}
    </div>
  )
}

// Works as a standalone route (/portal/boxes/[slug]) AND embedded inline in the
// Prebuilt Boxes content tab (slugProp + onBack provided → no navigation, sidebar
// stays put).
export default function BoxEditorPage({ slugProp, onBack }: { slugProp?: string; onBack?: () => void } = {}) {
  const params = useParams()
  const router = useRouter()
  const slug = slugProp ?? (params.slug as string)
  const goBack = onBack ?? (() => router.push('/portal/boxes'))

  const [box, setBox] = useState<ResolvedBox | null>(null)
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [slots, setSlots] = useState<BoxSlot[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [customPrice, setCustomPrice] = useState('')
  const [showCustomPrice, setShowCustomPrice] = useState(true) // toggle: custom vs calculated
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [featured, setFeatured] = useState(true)
  const [active, setActive] = useState(true)
  const [audience, setAudience] = useState<'baby' | 'mama' | 'bundle'>('bundle')
  const [variant, setVariant] = useState<'neutral' | 'girl' | 'boy'>('neutral')
  const [season, setSeason] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [categoryWarning, setCategoryWarning] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [boxRes, listRes] = await Promise.all([
      fetch(`/api/portal/boxes/${slug}`),
      fetch('/api/portal/boxes'),
    ])
    if (boxRes.ok) {
      const { box } = await boxRes.json()
      setBox(box)
      setName(box.name)
      setDescription(box.description ?? '')
      setCustomPrice(box.customPrice != null ? (box.customPrice / 100).toFixed(2) : '')
      setImages(box.images ?? (box.image ? [box.image] : []))
      setFeatured(box.featured)
      setActive(box.active !== false)
      setAudience((['baby', 'mama', 'bundle'].includes(box.audience) ? box.audience : 'bundle'))
      setVariant((['neutral', 'girl', 'boy'].includes(box.variant) ? box.variant : 'neutral'))
      setSeason(box.style ?? '')
      // Convert selectionRefs map to slots array
      const slotRefs = box.selectionRefs ?? {}
      const newSlots: BoxSlot[] = Object.entries(slotRefs).map(([key, ref]) => {
        const template = SLOT_TEMPLATES.find(t => t.key === key)
        return {
          key,
          label: template?.label || key,
          product_id: (ref as SlotRef)?.product_id ?? null,
          color: (ref as SlotRef)?.color ?? undefined,
          size: (ref as SlotRef)?.size ?? undefined,
          audience: (ref as SlotRef)?.audience ?? null,
        }
      })
      setSlots(newSlots.length > 0 ? newSlots : [])
      setShowCustomPrice(true)
    }
    if (listRes.ok) {
      const { products } = await listRes.json()
      setProducts(products ?? [])
    }
    setLoading(false)
  }, [slug])

  useEffect(() => { load() }, [load])

  function updateSlotProduct(slotKey: string, productId: string) {
    setSlots(prev => prev.map(s => s.key === slotKey ? { ...s, product_id: productId || null } : s))
    setCategoryWarning(null)
  }

  function updateSlotAudience(slotKey: string, audience: Audience | null) {
    setSlots(prev => prev.map(s => s.key === slotKey ? { ...s, audience } : s))
  }

  function addSlot() {
    const newKey = `custom-${Date.now()}`
    const availableLabel = `Extra Slot ${slots.length - 6}`
    setSlots(prev => [...prev, {
      key: newKey,
      label: availableLabel,
      product_id: null,
    }])
  }

  function removeSlot(slotKey: string) {
    const slotToRemove = slots.find(s => s.key === slotKey)
    if (!slotToRemove) return

    // Check if this is the only slot with this category/label
    const categoryCount = slots.filter(s => s.label === slotToRemove.label).length
    if (categoryCount === 1) {
      setCategoryWarning(`Removing "${slotToRemove.label}" — this is the only slot with this category. Your box will no longer have this item type.`)
    }

    setSlots(prev => prev.filter(s => s.key !== slotKey))
  }

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    setUploadErr('')
    try {
      const uploaded: string[] = []
      for (const file of Array.from(files)) {
        const resized = await resizeImage(file, 2000, 0.9)
        const form = new FormData()
        form.append('file', resized)
        const res = await fetch(`/api/portal/boxes/${slug}/upload-image`, { method: 'POST', body: form })
        const data = await res.json()
        if (data.url) uploaded.push(data.url)
        else setUploadErr(data.error || 'Upload failed')
      }
      if (uploaded.length) setImages(prev => [...prev, ...uploaded])
    } catch {
      setUploadErr('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function removeImage(url: string) { setImages(prev => prev.filter(u => u !== url)) }
  function makeCover(url: string) { setImages(prev => [url, ...prev.filter(u => u !== url)]) }

  async function handleSave() {
    setSaving(true)
    setSaveMsg('')
    // Convert slots array back to selection map
    const selection: Record<string, SlotRef | null> = {}
    for (const slot of slots) {
      if (slot.product_id) {
        selection[slot.key] = {
          product_id: slot.product_id,
          color: slot.color || undefined,
          size: slot.size || undefined,
          audience: slot.audience ?? undefined,
        }
      } else {
        selection[slot.key] = null
      }
    }
    const res = await fetch(`/api/portal/boxes/${slug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description,
        style: season,
        audience,
        variant,
        images,
        featured,
        active,
        customPrice: customPrice ? Math.round(parseFloat(customPrice) * 100) : null,
        selection,
      }),
    })
    setSaving(false)
    setSaveMsg(res.ok ? 'Saved' : 'Error saving')
    setTimeout(() => setSaveMsg(''), 2000)
  }

  if (loading) return <div className="p-8 flex items-center gap-3 font-sans text-sm text-bark-400"><Loader size={16} className="animate-spin" /> Loading…</div>
  if (!box) return <div className="p-8 font-sans text-bark-400">Box not found.</div>

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={goBack} className="text-bark-400 hover:text-bark-600 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark-400 capitalize">{audience === 'baby' ? 'For Baby' : audience === 'mama' ? 'For Mama' : 'Baby & Mama'} · {variant}{season ? ` · ${season}` : ''}</p>
            <h1 className="font-serif text-2xl text-bark-600">{box.name}</h1>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-bark-600 text-white font-sans text-[11px] tracking-[0.2em] uppercase px-6 py-2.5 rounded hover:bg-bark-700 transition-colors disabled:opacity-40"
        >
          {saving ? <Loader size={13} className="animate-spin" /> : saveMsg === 'Saved' ? <Check size={13} /> : null}
          {saving ? 'Saving…' : saveMsg || 'Save Box'}
        </button>
      </div>

      {/* Details */}
      <div className="bg-white border border-cream-300 rounded-xl p-6 mb-6">
        <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark-400 mb-5">Box Details</p>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputCls} />
          </div>
          {/* Categorization — drives grouping (audience) + the badges (boy/girl + season) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Audience (grouping)</label>
              <select value={audience} onChange={e => setAudience(e.target.value as 'baby' | 'mama' | 'bundle')} className={inputCls}>
                <option value="baby">For Baby</option>
                <option value="mama">For Mama</option>
                <option value="bundle">Baby &amp; Mama Bundle</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>For (badge)</label>
              <select value={variant} onChange={e => setVariant(e.target.value as 'neutral' | 'girl' | 'boy')} className={inputCls}>
                <option value="neutral">Neutral</option>
                <option value="girl">Girl</option>
                <option value="boy">Boy</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Season (label)</label>
              <input type="text" value={season} onChange={e => setSeason(e.target.value)} placeholder="e.g. All-Season" className={inputCls} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className={labelCls}>Description (shown on the /boxes card)</label>
              <span className={`font-sans text-[10px] ${description.length > 240 ? 'text-red-500' : 'text-bark-400'}`}>{description.length}/240</span>
            </div>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value.slice(0, 240))}
              maxLength={240}
              rows={3}
              placeholder="A short, evocative line or two — kept brief so it fits the card without scrolling."
              className={inputCls + ' resize-none leading-relaxed'}
            />
          </div>
          <div>
            <label className={labelCls}>Pricing</label>
            <div className="space-y-3">
              {/* Price toggle */}
              <div className="flex items-center gap-4 p-3 bg-cream-100/40 rounded border border-cream-300">
                <button
                  type="button"
                  onClick={() => setShowCustomPrice(true)}
                  className={`flex-1 px-3 py-2 rounded text-sm font-sans transition-colors ${
                    showCustomPrice
                      ? 'bg-bark-600 text-white'
                      : 'bg-white text-bark-600 border border-cream-300'
                  }`}
                >
                  Your Price
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomPrice(false)}
                  className={`flex-1 px-3 py-2 rounded text-sm font-sans transition-colors ${
                    !showCustomPrice
                      ? 'bg-bark-600 text-white'
                      : 'bg-white text-bark-600 border border-cream-300'
                  }`}
                >
                  Calculated Sum
                </button>
              </div>

              {/* Price display based on toggle */}
              {showCustomPrice ? (
                <div>
                  <label className="block font-sans text-xs text-bark-400 mb-2">Set custom price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-sans text-sm text-bark-400">$</span>
                    <input type="number" step="0.01" value={customPrice} onChange={e => setCustomPrice(e.target.value)} placeholder="e.g., 125.00" className={inputCls + ' pl-7'} />
                  </div>
                </div>
              ) : (
                <div className="bg-cream-100/40 p-3 rounded border border-cream-300">
                  <div className="space-y-2">
                    <div className="flex justify-between font-sans text-sm">
                      <span className="text-bark-500">Products total:</span>
                      <span className="text-bark-600 font-medium">
                        ${(slots.reduce((sum, slot) => {
                          if (!slot.product_id) return sum
                          const prod = products.find(p => p.id === slot.product_id)
                          return sum + (prod?.price ?? 0)
                        }, 0) / 100).toFixed(2)}
                      </span>
                    </div>
                    {customPrice && (
                      <div className="flex justify-between font-sans text-sm border-t border-cream-300 pt-2">
                        <span className="text-bark-500">Your custom price:</span>
                        <span className="text-bark-600 font-medium">${parseFloat(customPrice).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="accent-bark-600 w-4 h-4" />
              <span className="font-sans text-sm text-bark-500">Show on site</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)} className="accent-bark-600 w-4 h-4" />
              <span className="font-sans text-sm text-bark-500">Featured on homepage</span>
            </label>
          </div>
          <div>
            <label className={labelCls}>Box Photos {images.length > 0 && <span className="text-bark-400/60 normal-case tracking-normal">· first photo is the cover</span>}</label>

            {/* Gallery thumbnails */}
            {images.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
                {images.map((url, idx) => (
                  <div key={url} className="relative group aspect-square rounded-lg overflow-hidden border border-cream-300 bg-cream-100">
                    <Image src={url} alt={`Box photo ${idx + 1}`} fill className="object-cover" unoptimized />
                    {idx === 0 && (
                      <span className="absolute top-1 left-1 inline-flex items-center gap-1 bg-bark-600/85 text-white text-[8px] tracking-[0.1em] uppercase px-1.5 py-0.5 rounded">
                        <Star size={9} className="fill-gold-300 text-gold-300" /> Cover
                      </span>
                    )}
                    <div className="absolute inset-0 bg-bark-700/0 group-hover:bg-bark-700/45 transition-colors flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
                      {idx !== 0 && (
                        <button type="button" onClick={() => makeCover(url)} title="Make cover" className="p-1.5 bg-white/90 rounded text-bark-600 hover:text-gold-500">
                          <Star size={13} />
                        </button>
                      )}
                      <button type="button" onClick={() => removeImage(url)} title="Remove" className="p-1.5 bg-white/90 rounded text-bark-600 hover:text-red-500">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upload */}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={e => { handleUpload(e.target.files); e.target.value = '' }} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 border border-cream-300 bg-cream-50 text-bark-600 font-sans text-[11px] tracking-[0.2em] uppercase py-3 rounded hover:border-bark-400 transition-colors disabled:opacity-50"
            >
              {uploading ? <Loader size={13} className="animate-spin" /> : <Upload size={13} />}
              {uploading ? 'Uploading…' : 'Upload box photos'}
            </button>
            {uploadErr && <p className="font-sans text-xs text-red-500 mt-2">{uploadErr}</p>}
            <p className="font-sans text-[10px] text-bark-400/60 mt-2">JPG/PNG/WebP up to 8MB each. Upload several — the first is the cover; the rest show in the box&apos;s photo gallery. Resized to ~2000px automatically.</p>
          </div>
        </div>
      </div>


      {/* Slots */}
      <div className="bg-white border border-cream-300 rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark-400">Box Contents ({slots.length} items)</p>
          <button
            type="button"
            onClick={addSlot}
            className="flex items-center gap-2 px-3 py-1.5 rounded border border-gold-300 bg-gold-50/40 text-bark-600 font-sans text-[10px] tracking-[0.1em] uppercase hover:border-gold-400 transition-colors"
          >
            <Plus size={12} /> Add Item
          </button>
        </div>

        {categoryWarning && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded text-amber-900 font-sans text-xs">
            ⚠️ {categoryWarning}
          </div>
        )}

        <div className="space-y-3">
          {slots.map((slot) => {
            const product = products.find(p => p.id === slot.product_id)
            return (
              <div key={slot.key} className="flex items-center gap-3">
                {/* Thumbnail of the picked product */}
                <div className="w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-cream-100 border border-cream-200 flex items-center justify-center">
                  {product?.image
                    ? <Image src={product.image} alt={product.name} width={56} height={56} className="w-full h-full object-cover" unoptimized />
                    : <Package size={16} className="text-bark-300" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-sans text-xs text-bark-400 w-32 shrink-0 truncate">{slot.label}</span>
                    {product && Number.isFinite(product.price) && <span className="text-[10px] text-bark-500/60">• ${(product.price / 100).toFixed(2)}</span>}
                  </div>
                  <ProductPicker products={products} value={slot.product_id} onChange={id => updateSlotProduct(slot.key, id)} />
                  {/* For Baby / For Mama — optional grouping shown on the box page */}
                  <div className="flex items-center gap-1 mt-1.5">
                    {([['baby', 'For Baby'], ['mama', 'For Mama']] as const).map(([val, lbl]) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => updateSlotAudience(slot.key, slot.audience === val ? null : val)}
                        className={`font-sans text-[9px] tracking-[0.1em] uppercase px-2 py-1 rounded border transition-colors ${slot.audience === val ? 'border-bark-600 bg-bark-600 text-white' : 'border-cream-300 text-bark-400 hover:border-bark-400'}`}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeSlot(slot.key)}
                  className="p-2 text-bark-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors shrink-0"
                  title="Remove item from box"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )
          })}
        </div>

        <p className="font-sans text-[10px] text-bark-400/70 mt-4">
          Swap or remove items as needed. Add extra slots for seasonal variations. Once a product is no longer used by any box, you can delete it from Products.
        </p>
      </div>
    </div>
  )
}
