'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { Upload, FileText, Trash2, Plus, AlertTriangle, CheckCircle2, Loader2, Check, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { resizeImage, cropImage, dataUrlToFile, type PhotoBox } from '@/lib/image-resize'

const SIZES = ['0-3', '3-6', '6-9', '9-12', '12-18', '18-24', 'one-size']

// Suggested boutique retail = ~3x cost, rounded up to a .99 price point.
const RETAIL_MARKUP = 3
function recommendedRetail(cost?: number | null): number | null {
  const c = Number(cost)
  if (!c || c <= 0) return null
  return Math.max(0, Math.ceil(c * RETAIL_MARKUP) - 0.01)
}

interface ParsedItem {
  item_id: string
  name: string
  color: string
  color_hex?: string
  size: string
  quantity: number
  unit_price?: number | null   // dollars
  status?: string              // 'stock' | 'to_source'
  photo_box?: PhotoBox | null  // location of the product photo in an uploaded image
  _origId?: string             // originally-detected item_id, kept so a link can be undone
}

interface CatalogVariant { color: string; color_hex: string | null; size: string; quantity: number }
interface CatalogProduct { id: string; name: string; category: string; emoji: string; image: string | null; price?: number; sold90?: number; variants: CatalogVariant[] }

type Phase = 'upload' | 'parsing' | 'review' | 'saving' | 'done'

function Cell({ value, onChange, type = 'text' }: { value: string | number; onChange: (v: string) => void; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-transparent border-0 outline-none focus:bg-cream-50 px-2 py-1 rounded text-sm text-bark-700 font-sans"
      min={type === 'number' ? 0 : undefined}
    />
  )
}

function SizeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-transparent border-0 outline-none focus:bg-cream-50 px-2 py-1 rounded text-sm text-bark-700 font-sans"
    >
      {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
    </select>
  )
}

export default function InventoryPage() {
  const [phase, setPhase] = useState<Phase>('upload')
  const [items, setItems] = useState<ParsedItem[]>([])
  const [catalog, setCatalog] = useState<CatalogProduct[]>([])
  const [result, setResult] = useState<{ updated: number; failed: number; errors: string[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [dropRow, setDropRow] = useState<number | null>(null)   // row currently hovered during drag
  const [pickerSearch, setPickerSearch] = useState('')
  const [sourceImage, setSourceImage] = useState<string | null>(null)   // the uploaded image (data URL) to crop from
  const [crops, setCrops] = useState<Record<number, string>>({})        // row index -> cropped photo data URL
  const fileRef = useRef<HTMLInputElement>(null)

  // Load the product catalog (photos + current stock) for the picker
  useEffect(() => {
    if (phase !== 'review' || catalog.length) return
    fetch('/api/portal/inventory/catalog')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.products) setCatalog(d.products) })
      .catch(() => {})
  }, [phase, catalog.length])

  const catalogById = new Map(catalog.map(p => [p.id, p]))

  async function handleFile(file: File) {
    const ok = file.type === 'application/pdf' || ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    if (!ok) { setError('Please upload a PDF or image (JPG, PNG, WebP)'); return }
    setError(null)
    setFileName(file.name)
    setPhase('parsing')

    setCrops({})
    setSourceImage(null)

    const form = new FormData()
    // Shrink large photos so they fit the upload limit; PDFs pass through unchanged
    const isImage = file.type.startsWith('image/')
    const toSend = isImage ? await resizeImage(file, 2200, 0.9) : file
    form.append('file', toSend)

    // Keep the (resized) image so we can crop product photos out of it later.
    // Boxes from Claude are relative to exactly this image.
    let sourceDataUrl: string | null = null
    if (isImage) {
      sourceDataUrl = await new Promise<string>((resolve) => {
        const r = new FileReader()
        r.onload = () => resolve(r.result as string)
        r.readAsDataURL(toSend)
      })
      setSourceImage(sourceDataUrl)
    }

    try {
      const res = await fetch('/api/portal/inventory/parse', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const parsed: ParsedItem[] = data.items
      setItems(parsed)
      setPhase('review')

      // Crop each product photo out of the source image (best-effort)
      if (sourceDataUrl) {
        const next: Record<number, string> = {}
        await Promise.all(parsed.map(async (it, idx) => {
          if (it.photo_box) {
            const cropped = await cropImage(sourceDataUrl!, it.photo_box)
            if (cropped) next[idx] = cropped
          }
        }))
        setCrops(next)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to read the sheet')
      setPhase('upload')
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [])

  function updateItem(index: number, field: keyof ParsedItem, value: string | number | null) {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  function removeItem(index: number) {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  function addRow() {
    setItems(prev => [...prev, { item_id: '', name: '', color: '', color_hex: '', size: '0-3', quantity: 0, unit_price: null, status: 'stock' }])
  }

  // Assign a catalog product to a parsed row: fills item_id + name, and
  // auto-matches the color to an existing variant when one looks similar.
  function assignProduct(rowIndex: number, product: CatalogProduct) {
    setItems(prev => prev.map((item, i) => {
      if (i !== rowIndex) return item
      const next = { ...item, _origId: item._origId ?? item.item_id, item_id: product.id, name: product.name }
      // Try to match the parsed color to one of the product's existing colors
      const parsedColor = (item.color || '').trim().toLowerCase()
      const parsedHex = (item.color_hex || '').trim().toLowerCase()
      const match = product.variants.find(v =>
        (v.color && v.color.toLowerCase() === parsedColor) ||
        (v.color_hex && parsedHex && v.color_hex.toLowerCase() === parsedHex)
      )
      if (match) {
        next.color = match.color
        if (match.color_hex) next.color_hex = match.color_hex
        // (color preserved as detected when no match)
      }
      return next
    }))
  }

  // Undo a link: restore the originally-detected style number.
  function unlink(rowIndex: number) {
    setItems(prev => prev.map((item, i) =>
      i === rowIndex ? { ...item, item_id: item._origId ?? '', _origId: undefined } : item
    ))
  }

  // Create an unpublished draft product from an unmatched row and link it.
  const [draftingRow, setDraftingRow] = useState<number | null>(null)
  async function createDraft(rowIndex: number) {
    const item = items[rowIndex]
    setDraftingRow(rowIndex)
    try {
      // Start the draft at the recommended retail (≈3× cost), in cents
      const rec = recommendedRetail(item.unit_price)
      const priceCents = rec != null ? Math.round(rec * 100) : 0
      const res = await fetch('/api/portal/inventory/create-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: item.name || item.item_id, item_id: item.item_id, price: priceCents }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      const p = data.product

      // If we cropped a photo from the sheet, attach it as the draft's primary image
      let draftImage: string | null = null
      const crop = crops[rowIndex]
      if (crop) {
        try {
          const gForm = new FormData()
          gForm.append('file', dataUrlToFile(crop, `${p.id}.jpg`))
          gForm.append('primary', 'true')
          const up = await fetch(`/api/portal/products/${p.id}/gallery`, { method: 'POST', body: gForm })
          const upData = await up.json().catch(() => ({}))
          if (up.ok && upData.image?.image_url) draftImage = upData.image.image_url
        } catch { /* photo is best-effort */ }
      }

      // Add to the in-memory catalog so the row links + future rows can reuse it
      setCatalog(prev => [{ id: p.id, name: p.name, category: p.category, emoji: '📦', image: draftImage, price: p.price ?? priceCents, sold90: 0, variants: [] }, ...prev])
      setItems(prev => prev.map((it, i) => i === rowIndex ? { ...it, _origId: it._origId ?? it.item_id, item_id: p.id, name: p.name } : it))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to create draft product')
    } finally {
      setDraftingRow(null)
    }
  }

  async function confirm() {
    setPhase('saving')
    try {
      const res = await fetch('/api/portal/inventory/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
      setPhase('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
      setPhase('review')
    }
  }

  function reset() {
    setPhase('upload')
    setItems([])
    setResult(null)
    setError(null)
    setFileName('')
  }

  // ── Upload phase ────────────────────────────────────────────
  if (phase === 'upload') return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="font-serif text-3xl text-bark-700 mb-1">Inventory Upload</h1>
      <p className="font-sans text-sm text-bark-400 mb-8">Upload a PDF <strong>or a photo</strong> of an inventory / quotation sheet — Claude reads every style, color, size, and quantity. Then drag your existing products onto each row to link them, or create an unpublished draft for new items.</p>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-6 text-sm font-sans">
          <AlertTriangle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-colors ${dragOver ? 'border-gold-400 bg-gold-50' : 'border-cream-300 hover:border-gold-300 hover:bg-cream-50'}`}
      >
        <Upload size={36} className="mx-auto mb-4 text-gold-400" />
        <p className="font-sans text-bark-600 font-medium mb-1">Drop your PDF or photo here</p>
        <p className="font-sans text-sm text-bark-400">or click to browse — PDF or image (JPG/PNG), max 20 MB</p>
        <input ref={fileRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      </div>

      <div className="mt-6 bg-cream-50 rounded-xl border border-cream-200 p-4">
        <p className="font-sans text-xs font-semibold uppercase tracking-widest text-bark-400 mb-2">What your PDF should include</p>
        <ul className="font-sans text-sm text-bark-500 space-y-1 list-disc list-inside">
          <li>Item ID or product name (any language)</li>
          <li>Color (and hex swatch code, if shown)</li>
          <li>Size (e.g. 0-3m, 3-6m, NB, 12m)</li>
          <li>Quantity and unit price</li>
        </ul>
        <p className="font-sans text-xs text-bark-400 mt-3">If the sheet&rsquo;s names don&rsquo;t match your catalog (e.g. a different language), you&rsquo;ll link each row to the right product by dragging it from the product panel on the next screen.</p>
      </div>
    </div>
  )

  // ── Parsing phase ───────────────────────────────────────────
  if (phase === 'parsing') return (
    <div className="p-8 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
      <Loader2 size={40} className="text-gold-400 animate-spin mb-6" />
      <h2 className="font-serif text-2xl text-bark-700 mb-2">Reading your inventory sheet…</h2>
      <p className="font-sans text-sm text-bark-400">Claude is scanning <span className="font-medium">{fileName}</span></p>
    </div>
  )

  // ── Done phase ──────────────────────────────────────────────
  if (phase === 'done' && result) return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex flex-col items-center text-center py-16">
        <div className="w-16 h-16 rounded-full bg-sage-100 flex items-center justify-center mb-6">
          <CheckCircle2 size={32} className="text-sage-500" />
        </div>
        <h2 className="font-serif text-3xl text-bark-700 mb-2">Inventory updated</h2>
        <p className="font-sans text-bark-400 mb-1">
          <span className="font-semibold text-bark-700">{result.updated}</span> variants saved
          {result.failed > 0 && <>, <span className="text-red-600">{result.failed} skipped</span></>}
        </p>
        {result.errors.length > 0 && (
          <div className="mt-4 text-left w-full bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="font-sans text-xs font-semibold uppercase tracking-widest text-red-600 mb-2">Skipped rows</p>
            {result.errors.map((e, i) => <p key={i} className="font-sans text-xs text-red-600">{e}</p>)}
          </div>
        )}
        <Button variant="gold" size="md" className="mt-8" onClick={reset}>Upload another sheet</Button>
      </div>
    </div>
  )

  // ── Review phase ────────────────────────────────────────────
  const unknownIds = items.filter(item => item.item_id && !catalogById.has(item.item_id))
  const filteredCatalog = pickerSearch.trim()
    ? catalog.filter(p => `${p.name} ${p.id} ${p.category}`.toLowerCase().includes(pickerSearch.toLowerCase()))
    : catalog

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="font-serif text-3xl text-bark-700">Review Inventory</h1>
          <p className="font-sans text-sm text-bark-400 mt-0.5">
            <FileText size={13} className="inline mr-1 -mt-0.5" />{fileName} — {items.length} items found. Drag a product onto a row to link it, then confirm.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={reset}>Start over</Button>
          <Button
            variant="gold"
            size="sm"
            onClick={confirm}
            disabled={items.length === 0 || phase === 'saving'}
          >
            {phase === 'saving' ? <><Loader2 size={14} className="animate-spin mr-1.5" />Saving…</> : 'Confirm & Save to Website'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm font-sans">
          <AlertTriangle size={16} className="shrink-0" />{error}
        </div>
      )}

      {unknownIds.length > 0 && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 mb-4 text-sm font-sans">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>
            <strong>{unknownIds.length} row{unknownIds.length > 1 ? 's are' : ' is'} not linked to a product</strong> — drag the matching product from the right onto each highlighted row. Unlinked rows still save and will stack when that product is added later.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">

        {/* Parsed rows table */}
        <div className="bg-white rounded-2xl border border-cream-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cream-200 bg-cream-50">
                {['', 'Item ID', 'Name', 'Color', 'Hex', 'Size', 'Qty', 'Cost $', 'Rec. retail', 'Sell $', 'Margin', 'Profit', 'Sold 90d', 'In stock', ''].map((h, idx) => (
                  <th key={idx} className="px-3 py-3 text-left font-sans text-[10px] font-semibold uppercase tracking-widest text-bark-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const linked = item.item_id ? catalogById.get(item.item_id) : undefined
                const unknown = item.item_id && !linked
                // current stock for this exact product + color + size
                const existing = linked?.variants.find(v =>
                  v.color.toLowerCase() === (item.color || '').toLowerCase() && v.size === item.size
                )
                const productColors = linked
                  ? Array.from(new Map(linked.variants.map(v => [v.color, v.color_hex])).entries())
                  : []
                return (
                  <tr
                    key={i}
                    onDragOver={e => { e.preventDefault(); setDropRow(i) }}
                    onDragLeave={() => setDropRow(r => r === i ? null : r)}
                    onDrop={e => {
                      e.preventDefault()
                      setDropRow(null)
                      const pid = e.dataTransfer.getData('text/plain')
                      const prod = catalogById.get(pid)
                      if (prod) assignProduct(i, prod)
                    }}
                    className={`border-b border-cream-100 transition-colors ${
                      dropRow === i ? 'bg-gold-100/70 ring-1 ring-gold-300' : unknown ? 'bg-amber-50/40' : linked ? 'bg-sage-50/30' : 'hover:bg-cream-50/50'
                    }`}
                  >
                    {/* thumbnail: linked product photo, else the cropped photo from the sheet, else a drop target */}
                    <td className="px-2 py-1 w-12">
                      {linked?.image ? (
                        <div className="relative w-9 h-9 rounded overflow-hidden bg-cream-100 border border-cream-200">
                          <Image src={linked.image} alt={linked.name} fill className="object-cover" unoptimized />
                        </div>
                      ) : crops[i] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={crops[i]} alt="from sheet" className="w-9 h-9 rounded object-cover border border-cream-200" title="Cropped from your uploaded sheet" />
                      ) : linked ? (
                        <div className="w-9 h-9 rounded bg-cream-100 border border-cream-200 flex items-center justify-center text-base">{linked.emoji}</div>
                      ) : (
                        <div className="w-9 h-9 rounded border border-dashed border-cream-300 flex items-center justify-center text-bark-300" title="Drag a product here">
                          <Plus size={12} />
                        </div>
                      )}
                    </td>
                    <td className="px-1 py-1 min-w-[120px]">
                      <Cell value={item.item_id} onChange={v => updateItem(i, 'item_id', v)} />
                      {linked && (
                        <span className="px-2 text-[10px] text-sage-600 flex items-center gap-1.5">
                          <span className="flex items-center gap-0.5"><Check size={10} /> linked</span>
                          <button onClick={() => unlink(i)} className="text-bark-400 hover:text-red-500 underline" title="Unlink this product">unlink</button>
                        </span>
                      )}
                      {!linked && item.item_id && (
                        <button
                          onClick={() => createDraft(i)}
                          disabled={draftingRow === i}
                          className="ml-2 mt-0.5 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 text-blue-600 font-sans text-[10px] font-semibold hover:bg-blue-200 transition-colors disabled:opacity-50"
                          title="Create an unpublished draft product (hidden from customers until you edit & publish it)"
                        >
                          {draftingRow === i ? 'Creating…' : '+ Create draft'}
                        </button>
                      )}
                    </td>
                    <td className="px-1 py-1 min-w-[140px]">
                      <Cell value={item.name} onChange={v => updateItem(i, 'name', v)} />
                    </td>
                    <td className="px-1 py-1 min-w-[120px]">
                      <Cell value={item.color} onChange={v => updateItem(i, 'color', v)} />
                      {productColors.length > 0 && (
                        <div className="flex flex-wrap gap-1 px-2 pt-1">
                          {productColors.map(([cname, chex]) => {
                            const active = cname.toLowerCase() === (item.color || '').toLowerCase()
                            return (
                              <button
                                key={cname}
                                onClick={() => { updateItem(i, 'color', cname); if (chex) updateItem(i, 'color_hex', chex) }}
                                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border transition-colors ${active ? 'border-bark-600 bg-bark-600 text-white' : 'border-cream-300 text-bark-500 hover:border-bark-400'}`}
                                title="Use existing color"
                              >
                                {chex && <span className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ backgroundColor: chex }} />}
                                {cname}
                              </button>
                            )
                          })}
                        </div>
                      )}
                      {linked && item.color && (
                        productColors.some(([cname]) => cname.toLowerCase() === item.color.toLowerCase())
                          ? <p className="px-2 pt-1 font-sans text-[10px] text-sage-600">✓ adds to existing stock</p>
                          : <p className="px-2 pt-1 font-sans text-[10px] text-amber-600">⚠ new color — won&rsquo;t merge. Tap a chip above if it&rsquo;s the same color.</p>
                      )}
                    </td>
                    <td className="px-1 py-1 w-24">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block w-4 h-4 rounded border border-cream-300 shrink-0" style={{ backgroundColor: item.color_hex || 'transparent' }} />
                        <Cell value={item.color_hex ?? ''} onChange={v => updateItem(i, 'color_hex', v)} />
                      </div>
                    </td>
                    <td className="px-1 py-1 min-w-[100px]">
                      <SizeSelect value={item.size} onChange={v => updateItem(i, 'size', v)} />
                    </td>
                    <td className="px-1 py-1 w-16">
                      <Cell value={item.quantity} onChange={v => updateItem(i, 'quantity', parseInt(v) || 0)} type="number" />
                    </td>
                    <td className="px-1 py-1 w-20">
                      <Cell value={item.unit_price ?? ''} onChange={v => updateItem(i, 'unit_price', v === '' ? null : parseFloat(v))} type="number" />
                    </td>
                    {/* recommended retail (≈3x cost) */}
                    <td className="px-2 py-1 w-20 text-center">
                      {recommendedRetail(item.unit_price) != null
                        ? <span className="font-sans text-xs text-gold-600" title="Suggested retail ≈ 3× cost">${recommendedRetail(item.unit_price)!.toFixed(2)}</span>
                        : <span className="font-sans text-[10px] text-bark-300">—</span>}
                    </td>
                    {/* selling price (from linked product) */}
                    <td className="px-2 py-1 w-20 text-center">
                      {linked?.price ? <span className="font-sans text-xs text-bark-600">${(linked.price / 100).toFixed(2)}</span> : <span className="font-sans text-[10px] text-bark-300">—</span>}
                    </td>
                    {/* margin % */}
                    <td className="px-2 py-1 w-16 text-center">
                      {linked?.price && item.unit_price != null && item.unit_price > 0 ? (
                        <span className="font-sans text-xs text-sage-600">{Math.round(((linked.price / 100 - Number(item.unit_price)) / (linked.price / 100)) * 100)}%</span>
                      ) : <span className="font-sans text-[10px] text-bark-300">—</span>}
                    </td>
                    {/* profit on this purchase qty */}
                    <td className="px-2 py-1 w-20 text-center">
                      {linked?.price && item.unit_price != null ? (
                        <span className="font-sans text-xs text-bark-600">${(Math.max(0, (linked.price / 100 - Number(item.unit_price))) * (Number(item.quantity) || 0)).toFixed(2)}</span>
                      ) : <span className="font-sans text-[10px] text-bark-300">—</span>}
                    </td>
                    {/* selling score — units sold last 90 days */}
                    <td className="px-2 py-1 w-16 text-center">
                      {linked ? (
                        <span className={`font-sans text-xs ${(linked.sold90 ?? 0) > 0 ? 'text-gold-600 font-medium' : 'text-bark-300'}`}>{linked.sold90 ?? 0}</span>
                      ) : <span className="font-sans text-[10px] text-bark-300">—</span>}
                    </td>
                    {/* current stock for this color+size */}
                    <td className="px-2 py-1 w-20 text-center">
                      {linked ? (
                        <span className={`font-sans text-xs ${existing ? 'text-bark-600' : 'text-bark-300'}`}>
                          {existing ? `${existing.quantity} now` : 'new'}
                        </span>
                      ) : (
                        <span className="font-sans text-[10px] text-bark-300">—</span>
                      )}
                    </td>
                    <td className="px-2 py-1 w-10">
                      <button onClick={() => removeItem(i)} className="text-bark-300 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div className="px-4 py-3 border-t border-cream-100">
            <button onClick={addRow} className="flex items-center gap-1.5 text-sm font-sans text-gold-500 hover:text-gold-600 transition-colors">
              <Plus size={15} /> Add row manually
            </button>
          </div>
        </div>

        {/* Product picker — drag a card onto a row */}
        <div className="bg-white rounded-2xl border border-cream-200 p-4 xl:sticky xl:top-6">
          <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-1">Your Products</p>
          <p className="font-sans text-[11px] text-bark-400/80 mb-3 leading-snug">Drag a product onto a row to link it. Its photo, colors &amp; current stock will fill in.</p>
          <div className="relative mb-3">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-bark-300" />
            <input
              value={pickerSearch}
              onChange={e => setPickerSearch(e.target.value)}
              placeholder="Search products…"
              className="w-full pl-8 pr-2 py-1.5 border border-cream-300 rounded text-sm text-bark-600 focus:outline-none focus:border-bark-400"
            />
          </div>
          {catalog.length === 0 ? (
            <p className="font-sans text-xs text-bark-400 py-4 text-center">Loading products…</p>
          ) : (
            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
              {filteredCatalog.map(p => {
                const totalStock = p.variants.reduce((s, v) => s + (v.quantity || 0), 0)
                return (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={e => { e.dataTransfer.setData('text/plain', p.id); e.dataTransfer.effectAllowed = 'copy' }}
                    className="flex items-center gap-2 border border-cream-200 rounded-lg p-2 cursor-grab active:cursor-grabbing hover:border-gold-300 hover:bg-cream-50 transition-colors"
                    title="Drag onto a row to link"
                  >
                    {p.image ? (
                      <div className="relative w-10 h-10 rounded overflow-hidden bg-cream-100 shrink-0">
                        <Image src={p.image} alt={p.name} fill className="object-cover" unoptimized />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded bg-cream-100 flex items-center justify-center text-lg shrink-0">{p.emoji}</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-sans text-xs font-medium text-bark-600 truncate">{p.name}</p>
                      <p className="font-sans text-[10px] text-bark-400 truncate">{p.id}</p>
                      <p className="font-sans text-[10px] text-bark-400">
                        {p.variants.length > 0 ? `${p.variants.length} variant${p.variants.length > 1 ? 's' : ''} · ${totalStock} in stock` : 'no variants yet'}
                      </p>
                    </div>
                  </div>
                )
              })}
              {filteredCatalog.length === 0 && (
                <p className="font-sans text-xs text-bark-400 py-4 text-center">No products match &ldquo;{pickerSearch}&rdquo;</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-8 gap-y-2 mt-4">
        <p className="font-sans text-sm text-bark-600">
          <span className="text-bark-400">Total units:</span>{' '}
          <strong>{items.reduce((s, it) => s + (Number(it.quantity) || 0), 0)}</strong>
        </p>
        <p className="font-sans text-sm text-bark-600">
          <span className="text-bark-400">Total purchase cost:</span>{' '}
          <strong>
            ${items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0).toFixed(2)}
          </strong>
        </p>
      </div>

      <p className="font-sans text-xs text-bark-400 mt-3">
        Quantities are <strong>additive</strong> — if a variant already exists, the new amount is added to the current stock.
        The <strong>In stock</strong> column shows what that product currently has for the same color + size.
      </p>
    </div>
  )
}
