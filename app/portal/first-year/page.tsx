'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader, Check, Sparkles, Package, ArrowRight } from 'lucide-react'

export default function FirstYearAdminPage() {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/portal/first-year').then(r => r.json()).then(d => {
      if (d.product) { setName(d.product.name); setPrice((d.product.priceCents / 100).toFixed(2)); setDescription(d.product.description) }
    }).finally(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true); setSaved(false)
    try {
      const res = await fetch('/api/portal/first-year', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, priceCents: Math.round(Number(price) * 100) }),
      })
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500) }
    } finally { setSaving(false) }
  }

  const input = 'w-full px-3 py-2.5 border border-cream-300 bg-white rounded text-sm text-bark-700 focus:outline-none focus:border-bark-400'
  const label = 'block font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-1.5'

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-bark-600 flex items-center gap-2"><Sparkles size={22} className="text-[#9A80BD]" /> The First Year</h1>
        <p className="font-sans text-sm text-bark-400 mt-1">Manage the sub-line. The set is one purchasable product (one payment, three shipments).</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-8">
        <Link href="/portal/first-year/products" className="inline-flex items-center gap-2 bg-white border border-cream-300 rounded-lg px-4 py-3 hover:border-bark-400 transition-colors">
          <Package size={16} className="text-gold-400" />
          <span className="font-sans text-sm text-bark-600">Products — upload photos & video</span>
          <ArrowRight size={14} className="text-bark-400 ml-1" />
        </Link>
        <Link href="/portal/shipments" className="inline-flex items-center gap-2 bg-white border border-cream-300 rounded-lg px-4 py-3 hover:border-bark-400 transition-colors">
          <Package size={16} className="text-gold-400" />
          <span className="font-sans text-sm text-bark-600">Scheduled shipments</span>
          <ArrowRight size={14} className="text-bark-400 ml-1" />
        </Link>
      </div>

      <div className="bg-white border border-cream-200 rounded-xl p-5 space-y-4">
        <p className="font-sans text-sm font-medium text-bark-600">The set product</p>
        {loading ? (
          <div className="flex items-center gap-2 text-bark-400 text-sm"><Loader size={14} className="animate-spin" /> Loading…</div>
        ) : (
          <>
            <label className="block"><span className={label}>Name</span>
              <input value={name} onChange={e => setName(e.target.value)} className={input} /></label>
            <label className="block"><span className={label}>Price (USD)</span>
              <input type="number" min="0" step="1" value={price} onChange={e => setPrice(e.target.value)} className={input} />
              <span className="font-sans text-[11px] text-bark-400 mt-1 block">This is the one-time price for the whole set (all three shipments).</span>
            </label>
            <label className="block"><span className={label}>Description (shown at Stripe checkout)</span>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className={`${input} leading-relaxed`} /></label>
            <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 bg-bark-600 text-cream-50 font-sans text-[11px] tracking-[0.2em] uppercase px-6 py-2.5 rounded hover:bg-bark-700 disabled:opacity-50">
              {saving ? <Loader size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null} {saving ? 'Saving…' : saved ? 'Saved' : 'Save'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
