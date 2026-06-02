'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader, Check, Sparkles } from 'lucide-react'
import Image from 'next/image'
import type { ResolvedBox, SlotRef } from '@/lib/prebuilt-boxes-db'

type CatalogProduct = { id: string; name: string; category: string; has_variants?: boolean }

const SLOTS: Array<{ key: string; label: string }> = [
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

export default function BoxEditorPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [box, setBox] = useState<ResolvedBox | null>(null)
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [selection, setSelection] = useState<Record<string, SlotRef | null>>({})
  const [name, setName] = useState('')
  const [customPrice, setCustomPrice] = useState('')
  const [image, setImage] = useState('')
  const [featured, setFeatured] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')

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
      setCustomPrice(box.customPrice != null ? (box.customPrice / 100).toFixed(2) : '')
      setImage(box.image ?? '')
      setFeatured(box.featured)
      setSelection(box.selectionRefs ?? {})
    }
    if (listRes.ok) {
      const { products } = await listRes.json()
      setProducts(products ?? [])
    }
    setLoading(false)
  }, [slug])

  useEffect(() => { load() }, [load])

  function setSlotProduct(slot: string, productId: string) {
    setSelection(prev => ({
      ...prev,
      [slot]: productId ? { product_id: productId } : null,
    }))
  }

  async function handleGenerateImage() {
    setGenerating(true)
    setGenError('')
    try {
      const res = await fetch(`/api/portal/boxes/${slug}/generate-image`, { method: 'POST' })
      const data = await res.json()
      if (data.imageUrl) {
        setImage(data.imageUrl)
        setSaveMsg('Image generated!')
        setTimeout(() => setSaveMsg(''), 3000)
      } else {
        setGenError(data.error || 'Generation failed')
      }
    } catch {
      setGenError('Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setSaveMsg('')
    const res = await fetch(`/api/portal/boxes/${slug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        image: image || null,
        featured,
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
          <button onClick={() => router.push('/portal/boxes')} className="text-bark-400 hover:text-bark-600 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark-400 capitalize">{box.style} · {box.variant}</p>
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Price (USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-sans text-sm text-bark-400">$</span>
                <input type="number" step="0.01" value={customPrice} onChange={e => setCustomPrice(e.target.value)} placeholder="leave blank to auto-calc" className={inputCls + ' pl-7'} />
              </div>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)} className="accent-bark-600 w-4 h-4" />
                <span className="font-sans text-sm text-bark-500">Featured on homepage</span>
              </label>
            </div>
          </div>
          <div>
            <label className={labelCls}>Assembled Box Image</label>

            {/* Current image preview */}
            {image && (
              <div className="relative w-full aspect-[4/3] bg-cream-200 rounded-xl overflow-hidden mb-3">
                <Image src={image} alt="Box image" fill className="object-cover" unoptimized />
              </div>
            )}

            {/* AI generate */}
            <button
              type="button"
              onClick={handleGenerateImage}
              disabled={generating}
              className="w-full flex items-center justify-center gap-2 border border-gold-300 bg-gold-50/40 text-bark-600 font-sans text-[11px] tracking-[0.2em] uppercase py-3 rounded hover:border-gold-400 transition-colors disabled:opacity-50 mb-3"
            >
              {generating ? <Loader size={13} className="animate-spin" /> : <Sparkles size={13} className="text-gold-400" />}
              {generating ? 'Generating ultra-realistic box photo…' : 'Generate box image with AI'}
            </button>
            {genError && <p className="font-sans text-xs text-red-500 mb-2">{genError}</p>}

            <input type="text" value={image} onChange={e => setImage(e.target.value)} placeholder="Or paste an image URL" className={inputCls} />
            <p className="font-sans text-[10px] text-bark-400/60 mt-1.5">AI reads each product&apos;s photo and composes a realistic organic French lifestyle shot. ~20–40s.</p>
          </div>
        </div>
      </div>

      {/* Slots */}
      <div className="bg-white border border-cream-300 rounded-xl p-6">
        <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark-400 mb-5">Box Contents (7 slots)</p>
        <div className="space-y-3">
          {SLOTS.map(({ key, label }) => {
            const ref = selection[key]
            return (
              <div key={key} className="flex items-center gap-3">
                <span className="font-sans text-xs text-bark-400 w-32 shrink-0">{label}</span>
                <select
                  value={ref?.product_id ?? ''}
                  onChange={e => setSlotProduct(key, e.target.value)}
                  className={inputCls + ' flex-1 cursor-pointer'}
                >
                  <option value="">— Empty —</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )
          })}
        </div>
        <p className="font-sans text-[10px] text-bark-400/70 mt-4">
          Swap any slot to a different product. Once a product is no longer used by any box, you can delete it from Products.
        </p>
      </div>
    </div>
  )
}
