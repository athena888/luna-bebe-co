'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, FileText, Trash2, Plus, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { getAllProducts } from '@/lib/products'

const SIZES = ['0-3', '3-6', '6-9', '9-12', '12-18', '18-24', 'one-size']
const KNOWN_IDS = new Set(getAllProducts().map(p => p.id))

interface ParsedItem {
  item_id: string
  name: string
  color: string
  size: string
  quantity: number
}

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
  const [result, setResult] = useState<{ updated: number; failed: number; errors: string[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (file.type !== 'application/pdf') { setError('Please upload a PDF file'); return }
    setError(null)
    setFileName(file.name)
    setPhase('parsing')

    const form = new FormData()
    form.append('file', file)

    try {
      const res = await fetch('/api/portal/inventory/parse', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setItems(data.items)
      setPhase('review')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse PDF')
      setPhase('upload')
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [])

  function updateItem(index: number, field: keyof ParsedItem, value: string | number) {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  function removeItem(index: number) {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  function addRow() {
    setItems(prev => [...prev, { item_id: '', name: '', color: '', size: '0-3', quantity: 0 }])
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
      <p className="font-sans text-sm text-bark-400 mb-8">Upload a PDF inventory sheet — Claude will extract every item, color, size, and quantity for you to review before saving.</p>

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
        <p className="font-sans text-bark-600 font-medium mb-1">Drop your PDF here</p>
        <p className="font-sans text-sm text-bark-400">or click to browse — max 20 MB</p>
        <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      </div>

      <div className="mt-6 bg-cream-50 rounded-xl border border-cream-200 p-4">
        <p className="font-sans text-xs font-semibold uppercase tracking-widest text-bark-400 mb-2">What your PDF should include</p>
        <ul className="font-sans text-sm text-bark-500 space-y-1 list-disc list-inside">
          <li>Item ID or product name</li>
          <li>Color per row</li>
          <li>Size (e.g. 0-3m, 3-6m, NB, 12m)</li>
          <li>Quantity</li>
        </ul>
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
  const unknownIds = items.filter(item => item.item_id && !KNOWN_IDS.has(item.item_id))

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="font-serif text-3xl text-bark-700">Review Inventory</h1>
          <p className="font-sans text-sm text-bark-400 mt-0.5">
            <FileText size={13} className="inline mr-1 -mt-0.5" />{fileName} — {items.length} items found. Edit any cell before confirming.
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
            <strong>{unknownIds.length} item ID{unknownIds.length > 1 ? 's' : ''} not in your product catalog</strong> —&nbsp;
            {unknownIds.map(i => i.item_id).join(', ')}. These will still be saved; quantities will stack when the product is added later.
          </span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-cream-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cream-200 bg-cream-50">
              {['Item ID', 'Name', 'Color', 'Size', 'Qty', ''].map(h => (
                <th key={h} className="px-3 py-3 text-left font-sans text-[10px] font-semibold uppercase tracking-widest text-bark-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const unknown = item.item_id && !KNOWN_IDS.has(item.item_id)
              return (
                <tr key={i} className={`border-b border-cream-100 hover:bg-cream-50/50 ${unknown ? 'bg-amber-50/40' : ''}`}>
                  <td className="px-1 py-1 min-w-[130px]">
                    <Cell value={item.item_id} onChange={v => updateItem(i, 'item_id', v)} />
                  </td>
                  <td className="px-1 py-1 min-w-[140px]">
                    <Cell value={item.name} onChange={v => updateItem(i, 'name', v)} />
                  </td>
                  <td className="px-1 py-1 min-w-[120px]">
                    <Cell value={item.color} onChange={v => updateItem(i, 'color', v)} />
                  </td>
                  <td className="px-1 py-1 min-w-[100px]">
                    <SizeSelect value={item.size} onChange={v => updateItem(i, 'size', v)} />
                  </td>
                  <td className="px-1 py-1 w-20">
                    <Cell value={item.quantity} onChange={v => updateItem(i, 'quantity', parseInt(v) || 0)} type="number" />
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

      <p className="font-sans text-xs text-bark-400 mt-4">
        Quantities are <strong>additive</strong> — if a variant already exists, the new amount is added to the current stock.
      </p>
    </div>
  )
}
