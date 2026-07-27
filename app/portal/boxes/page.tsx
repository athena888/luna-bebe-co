'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Loader, Settings, Package, Eye, EyeOff, Trash2, Plus } from 'lucide-react'
import type { ResolvedBox } from '@/lib/prebuilt-boxes-db'
import BoxEditorPage from './[slug]/page'

function fmt(cents?: number) { return cents != null ? `$${(cents / 100).toFixed(0)}` : '—' }

export default function BoxesPortalPage() {
  const [boxes, setBoxes] = useState<ResolvedBox[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null) // edit inline (keeps the sidebar)
  const [adding, setAdding] = useState(false)
  const [newBox, setNewBox] = useState({ name: '', audience: 'bundle', style: '', variant: 'neutral', price: '' })
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/portal/boxes')
      const data = await res.json()
      setBoxes(data.boxes ?? [])
    } catch { setBoxes([]) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function removeBox(slug: string, name: string) {
    if (!window.confirm(`Permanently delete "${name}"? This cannot be undone — use Hide instead if you might want it back.`)) return
    setBusy(slug)
    try {
      const res = await fetch(`/api/portal/boxes/${slug}`, { method: 'DELETE' })
      if (res.ok) setBoxes(prev => prev.filter(b => b.slug !== slug))
      else window.alert('Could not delete the box — try again.')
    } finally { setBusy(null) }
  }

  async function toggleActive(slug: string, next: boolean) {
    setBusy(slug)
    // optimistic
    setBoxes(prev => prev.map(b => b.slug === slug ? { ...b, active: next } : b))
    try {
      await fetch(`/api/portal/boxes/${slug}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: next }),
      })
    } finally { setBusy(null) }
  }

  // Group by audience (For Baby / Wellness / Baby & Wellness Bundle); season is
  // a per-box label. The 'mama' DB value keeps its name — only labels changed.
  const AUDIENCE_GROUPS = [
    { key: 'baby', label: 'For Baby' },
    { key: 'mama', label: 'Wellness' },
    { key: 'bundle', label: 'Baby & Wellness Bundle' },
  ] as const
  const groups = AUDIENCE_GROUPS
    .map(g => ({ style: g.label, items: boxes.filter(b => b.audience === g.key) }))
    .filter(g => g.items.length > 0)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newBox.name.trim() || creating) return
    setCreating(true)
    try {
      const res = await fetch('/api/portal/boxes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newBox.name, audience: newBox.audience, style: newBox.style, variant: newBox.variant,
          customPrice: newBox.price ? Math.round(parseFloat(newBox.price) * 100) : null,
        }),
      })
      const data = await res.json()
      if (data.slug) {
        setAdding(false)
        setNewBox({ name: '', audience: 'bundle', style: '', variant: 'neutral', price: '' })
        setEditing(data.slug) // straight into the editor to pick products
      } else {
        window.alert(data.error || 'Could not create the box — try again.')
      }
    } catch {
      window.alert('Could not create the box — try again.')
    } finally { setCreating(false) }
  }

  // Edit a box inline so the Pages & Content sidebar never disappears.
  if (editing) return <BoxEditorPage slugProp={editing} onBack={() => { setEditing(null); load() }} />

  const fieldClass = "w-full px-3 py-2 border border-cream-300 bg-white rounded-lg font-sans text-sm text-bark-600 focus:outline-none focus:border-bark-400"
  const labelClass = "block font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-1.5"

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-bark-600">Prebuilt Boxes</h1>
          <p className="font-sans text-sm text-bark-400 mt-1">Edit a box&apos;s details, swap products, and toggle whether each box shows on the site.</p>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="shrink-0 flex items-center gap-2 bg-bark-600 text-white rounded-lg font-sans text-[10px] tracking-[0.15em] uppercase px-4 py-2.5 hover:bg-bark-700 transition-colors"
          >
            <Plus size={13} /> Add Box
          </button>
        )}
      </div>

      {adding && (
        <form onSubmit={handleCreate} className="bg-white border border-cream-300 rounded-xl p-5 mb-8 max-w-2xl">
          <p className="font-serif text-lg text-bark-600 mb-4">New box</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelClass}>Name</label>
              <input autoFocus required value={newBox.name} onChange={e => setNewBox(v => ({ ...v, name: e.target.value }))} placeholder="e.g. Champ de Lavande" className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Group</label>
              <select value={newBox.audience} onChange={e => setNewBox(v => ({ ...v, audience: e.target.value }))} className={fieldClass}>
                <option value="baby">For Baby</option>
                <option value="mama">Wellness</option>
                <option value="bundle">Baby &amp; Wellness Bundle</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Variant</label>
              <select value={newBox.variant} onChange={e => setNewBox(v => ({ ...v, variant: e.target.value }))} className={fieldClass}>
                <option value="neutral">Neutral</option>
                <option value="girl">Girl</option>
                <option value="boy">Boy</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Season label</label>
              <input value={newBox.style} onChange={e => setNewBox(v => ({ ...v, style: e.target.value }))} placeholder="e.g. Summer, All-Season" className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Price (USD, optional)</label>
              <input type="number" min="1" step="1" value={newBox.price} onChange={e => setNewBox(v => ({ ...v, price: e.target.value }))} placeholder="e.g. 160" className={fieldClass} />
            </div>
          </div>
          <p className="font-sans text-xs text-bark-400 mt-4">The box starts hidden. You&apos;ll pick its products next, then use &quot;Hidden — show&quot; when it&apos;s ready for the site.</p>
          <div className="flex gap-3 mt-4">
            <button type="submit" disabled={creating || !newBox.name.trim()} className="flex items-center gap-2 bg-bark-600 text-white rounded-lg font-sans text-[10px] tracking-[0.15em] uppercase px-5 py-2.5 hover:bg-bark-700 transition-colors disabled:opacity-50">
              {creating ? <Loader size={12} className="animate-spin" /> : <Plus size={13} />} Create &amp; pick products
            </button>
            <button type="button" onClick={() => setAdding(false)} className="font-sans text-xs text-bark-400 hover:text-bark-600 px-3 py-2.5">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center gap-3 font-sans text-sm text-bark-400 py-12">
          <Loader size={16} className="animate-spin" /> Loading boxes…
        </div>
      ) : (
        <div className="space-y-10">
          {groups.map(({ style, items }) => (
            <div key={style}>
              <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark-400 mb-4 pb-2 border-b border-cream-300">{style}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {items.map(box => {
                  const itemCount = box.items.length
                  return (
                    <div key={box.slug} className={`bg-white border rounded-xl overflow-hidden transition-colors ${box.active ? 'border-cream-300' : 'border-cream-300 opacity-70'}`}>
                      <button type="button" onClick={() => setEditing(box.slug)} className="block group w-full text-left">
                        <div className="relative aspect-[4/3] bg-cream-200">
                          {box.image
                            ? <Image src={box.image} alt={box.name} fill className="object-cover" unoptimized />
                            : <div className="absolute inset-0 flex items-center justify-center text-bark-300"><Package size={28} /></div>}
                          {!box.active && <span className="absolute top-2 left-2 bg-bark-600/85 text-white text-[9px] tracking-[0.1em] uppercase px-2 py-0.5 rounded">Hidden</span>}
                        </div>
                        <div className="p-4 pb-2">
                          <div className="flex items-center justify-between mb-1">
                            <h2 className="font-serif text-lg text-bark-600">{box.name}</h2>
                            <Settings size={14} className="text-bark-400 group-hover:text-bark-600 transition-colors" />
                          </div>
                          <p className="font-sans text-[10px] tracking-[0.15em] uppercase text-bark-400 capitalize">{box.variant}{box.style ? ` · ${box.style}` : ''}</p>
                          <p className="font-sans text-xs text-bark-400 mt-2">{itemCount}/7 items · {fmt(box.customPrice)}</p>
                        </div>
                      </button>
                      <div className="px-4 pb-4 flex gap-2">
                        <button
                          onClick={() => toggleActive(box.slug, !box.active)}
                          disabled={busy === box.slug}
                          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-sans text-[10px] tracking-[0.15em] uppercase transition-colors disabled:opacity-50 ${
                            box.active ? 'border border-cream-300 text-bark-500 hover:border-bark-400' : 'bg-bark-600 text-white hover:bg-bark-700'
                          }`}
                        >
                          {busy === box.slug ? <Loader size={12} className="animate-spin" /> : box.active ? <EyeOff size={12} /> : <Eye size={12} />}
                          {box.active ? 'Shown — hide' : 'Hidden — show'}
                        </button>
                        <button
                          onClick={() => removeBox(box.slug, box.name)}
                          disabled={busy === box.slug}
                          title="Delete permanently"
                          aria-label={`Delete ${box.name}`}
                          className="shrink-0 w-9 flex items-center justify-center py-2 rounded-lg border border-cream-300 text-bark-400 hover:border-red-400 hover:text-red-500 transition-colors disabled:opacity-50"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
