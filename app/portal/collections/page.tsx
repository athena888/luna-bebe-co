'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Trash2, Check } from 'lucide-react'
import Link from 'next/link'
import type { CollectionDef } from '@/lib/collections-db'
import type { Product } from '@/types'

const inputCls = "w-full px-3 py-2.5 border border-cream-300 bg-white font-sans text-sm text-bark-600 focus:outline-none focus:border-bark-400 transition-colors rounded"
const labelCls = "block font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-1.5"

export default function CollectionsPage() {
  const [collections, setCollections] = useState<CollectionDef[]>([])
  const [catalog, setCatalog] = useState<Product[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<CollectionDef>>({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [colRes, catRes] = await Promise.all([
          fetch('/api/collections'),
          fetch('/api/portal/products'),
        ])
        if (colRes.ok) {
          const data = await colRes.json()
          setCollections(data.collections)
        }
        if (catRes.ok) {
          const data = await catRes.json()
          setCatalog(data.products ?? [])
        }
      } catch (err) {
        console.error('Load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleSave(id: string) {
    setSaving(true)
    try {
      const res = await fetch(`/api/portal/collections/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      })
      if (res.ok) {
        const { collection } = await res.json()
        setCollections(prev => prev.map(c => c.id === id ? collection : c))
        setEditingId(null)
        setEditData({})
      }
    } catch (err) {
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  function startEdit(col: CollectionDef) {
    setEditingId(col.id)
    setEditData({ ...col })
  }

  function toggleProduct(productId: string) {
    const ids = editData.product_ids ?? []
    const updated = ids.includes(productId)
      ? ids.filter(id => id !== productId)
      : [...ids, productId]
    setEditData({ ...editData, product_ids: updated })
  }

  if (loading) return <div className="p-8 text-center text-bark-400">Loading…</div>

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/portal" className="text-bark-400 hover:text-bark-600 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="font-serif text-2xl text-bark-600">Collections</h1>
      </div>

      <div className="space-y-6">
        {collections.map(col => (
          <div key={col.id} className="bg-white border border-cream-300 rounded-xl p-6">
            {editingId === col.id ? (
              <>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className={labelCls}>Label</label>
                    <input
                      type="text"
                      value={editData.label ?? ''}
                      onChange={e => setEditData({ ...editData, label: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Subtitle</label>
                    <input
                      type="text"
                      value={editData.sub ?? ''}
                      onChange={e => setEditData({ ...editData, sub: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Products ({(editData.product_ids ?? []).length})</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto p-3 bg-cream-50 rounded border border-cream-300">
                      {catalog.map(p => (
                        <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(editData.product_ids ?? []).includes(p.id)}
                            onChange={() => toggleProduct(p.id)}
                            className="w-4 h-4 accent-bark-600"
                          />
                          <span className="font-sans text-sm text-bark-600">{p.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleSave(col.id)}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-bark-600 text-white font-sans text-[11px] tracking-[0.2em] uppercase rounded hover:bg-bark-700 transition-colors disabled:opacity-50"
                  >
                    <Check size={14} /> Save
                  </button>
                  <button
                    onClick={() => { setEditingId(null); setEditData({}) }}
                    className="px-4 py-2 border border-cream-300 text-bark-600 font-sans text-[11px] tracking-[0.2em] uppercase rounded hover:bg-cream-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-1">{col.id}</p>
                    <h2 className="font-serif text-xl text-bark-600">{col.label}</h2>
                    <p className="font-sans text-sm text-bark-400 mt-1">{col.sub}</p>
                  </div>
                  <button
                    onClick={() => startEdit(col)}
                    className="px-4 py-2 bg-bark-600 text-white font-sans text-[11px] tracking-[0.2em] uppercase rounded hover:bg-bark-700 transition-colors"
                  >
                    Edit
                  </button>
                </div>
                <div className="text-sm text-bark-500 font-sans">
                  {col.product_ids.length} product{col.product_ids.length !== 1 ? 's' : ''} in this collection
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
