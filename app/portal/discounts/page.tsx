'use client'

import { useState, useEffect } from 'react'
import { Loader, Check, Tag, Copy } from 'lucide-react'

interface DiscountRow {
  id: string; code: string; active: boolean; times_redeemed: number
  max_redemptions: number | null; expires_at: number | null; livemode: boolean
  percent_off: number | null; amount_off: number | null
}

function discountLabel(d: DiscountRow): string {
  if (d.percent_off != null) return `${d.percent_off}% off`
  if (d.amount_off != null) return `$${(d.amount_off / 100).toFixed(0)} off`
  return '—'
}

export default function DiscountsPage() {
  const [codes, setCodes] = useState<DiscountRow[]>([])
  const [loading, setLoading] = useState(true)

  // Form state
  const [code, setCode] = useState('')
  const [type, setType] = useState<'percent' | 'amount'>('percent')
  const [value, setValue] = useState('')
  const [duration, setDuration] = useState<'once' | 'forever'>('once')
  const [maxRedemptions, setMaxRedemptions] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [firstTimeOnly, setFirstTimeOnly] = useState(false)
  const [creating, setCreating] = useState(false)
  const [msg, setMsg] = useState('')
  const [copied, setCopied] = useState('')

  async function load() {
    setLoading(true)
    try { const d = await (await fetch('/api/portal/discounts')).json(); setCodes(d.codes ?? []) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function create() {
    if (!code.trim() || !(Number(value) > 0) || creating) return
    setCreating(true); setMsg('')
    try {
      const res = await fetch('/api/portal/discounts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code, type, value: Number(value), duration,
          maxRedemptions: maxRedemptions ? Number(maxRedemptions) : null,
          expiresAt: expiresAt ? Math.floor(new Date(expiresAt).getTime() / 1000) : null,
          minAmountDollars: minAmount ? Number(minAmount) : null,
          firstTimeOnly,
        }),
      })
      const d = await res.json()
      if (!res.ok) { setMsg(d.error || 'Failed'); return }
      setMsg(`✓ Created code ${d.code}`)
      setCode(''); setValue(''); setMaxRedemptions(''); setExpiresAt(''); setMinAmount(''); setFirstTimeOnly(false)
      load()
    } catch { setMsg('Failed — try again') } finally { setCreating(false) }
  }

  async function toggle(d: DiscountRow) {
    setCodes(cs => cs.map(x => x.id === d.id ? { ...x, active: !x.active } : x))
    await fetch('/api/portal/discounts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: d.id, active: !d.active }) })
  }
  function copy(c: string) { navigator.clipboard?.writeText(c); setCopied(c); setTimeout(() => setCopied(''), 1500) }

  const input = 'w-full px-3 py-2 border border-cream-300 bg-white rounded text-sm text-bark-700 focus:outline-none focus:border-bark-400'
  const label = 'block font-sans text-[10px] tracking-[0.15em] uppercase text-bark-400 mb-1'

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-bark-600 flex items-center gap-2"><Tag size={24} className="text-gold-400" /> Discount Codes</h1>
        <p className="font-sans text-sm text-bark-400 mt-1">Create a code customers type at checkout. These are separate from the automatic outreach codes.</p>
      </div>

      {/* Create form */}
      <div className="bg-white border border-cream-200 rounded-xl p-5 mb-8">
        <p className="font-sans text-sm font-medium text-bark-600 mb-4">New code</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className={label}>Code (what customers type)</span>
            <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="e.g. DOULA20" className={input} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={label}>Discount</span>
              <select value={type} onChange={e => setType(e.target.value as 'percent' | 'amount')} className={input}>
                <option value="percent">Percent (%)</option>
                <option value="amount">Amount ($)</option>
              </select>
            </label>
            <label className="block">
              <span className={label}>{type === 'percent' ? 'Percent off' : 'Dollars off'}</span>
              <input type="number" min="1" value={value} onChange={e => setValue(e.target.value)} placeholder={type === 'percent' ? '20' : '15'} className={input} />
            </label>
          </div>
          <label className="block">
            <span className={label}>Applies</span>
            <select value={duration} onChange={e => setDuration(e.target.value as 'once' | 'forever')} className={input}>
              <option value="once">Once per order</option>
              <option value="forever">Every order (forever)</option>
            </select>
          </label>
          <label className="block">
            <span className={label}>Max total uses (blank = unlimited)</span>
            <input type="number" min="1" value={maxRedemptions} onChange={e => setMaxRedemptions(e.target.value)} placeholder="unlimited" className={input} />
          </label>
          <label className="block">
            <span className={label}>Expires (optional)</span>
            <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className={input} />
          </label>
          <label className="block">
            <span className={label}>Minimum order $ (optional)</span>
            <input type="number" min="0" value={minAmount} onChange={e => setMinAmount(e.target.value)} placeholder="none" className={input} />
          </label>
        </div>
        <label className="flex items-center gap-2 mt-4 cursor-pointer">
          <input type="checkbox" checked={firstTimeOnly} onChange={e => setFirstTimeOnly(e.target.checked)} className="w-4 h-4 accent-bark-600" />
          <span className="font-sans text-xs text-bark-500">First-time customers only</span>
        </label>
        <div className="flex items-center gap-3 mt-4">
          <button onClick={create} disabled={creating || !code.trim() || !(Number(value) > 0)}
            className="inline-flex items-center gap-2 bg-bark-600 text-cream-50 font-sans text-[11px] tracking-[0.2em] uppercase px-6 py-2.5 rounded hover:bg-bark-700 disabled:opacity-50">
            {creating ? <Loader size={14} className="animate-spin" /> : <Tag size={14} />} Create code
          </button>
          {msg && <span className="font-sans text-xs text-bark-600">{msg}</span>}
        </div>
        <p className="font-sans text-[11px] text-bark-400 mt-3">Codes are created in your current Stripe mode (test or live).</p>
      </div>

      {/* Existing codes */}
      <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-2">Your codes</p>
      {loading ? (
        <div className="flex items-center gap-2 text-bark-400 text-sm py-6"><Loader size={14} className="animate-spin" /> Loading…</div>
      ) : codes.length === 0 ? (
        <p className="font-sans text-sm text-bark-400 py-4">No codes yet — create one above.</p>
      ) : (
        <div className="bg-white border border-cream-300 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-cream-200 bg-cream-100">
                {['Code', 'Discount', 'Used', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-sans text-[10px] font-semibold uppercase tracking-wider text-bark-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {codes.map(d => (
                <tr key={d.id} className="border-b border-cream-200 last:border-0">
                  <td className="px-4 py-3">
                    <button onClick={() => copy(d.code)} className="font-mono text-sm text-bark-700 inline-flex items-center gap-1.5 hover:text-bark-900" title="Copy">
                      {d.code} {copied === d.code ? <Check size={12} className="text-sage-500" /> : <Copy size={12} className="text-bark-300" />}
                    </button>
                    {!d.livemode && <span className="ml-2 font-sans text-[9px] uppercase tracking-[0.1em] text-gold-500">test</span>}
                  </td>
                  <td className="px-4 py-3 font-sans text-sm text-bark-600">{discountLabel(d)}</td>
                  <td className="px-4 py-3 font-sans text-xs text-bark-400">{d.times_redeemed}{d.max_redemptions ? ` / ${d.max_redemptions}` : ''}</td>
                  <td className="px-4 py-3">
                    <span className={`font-sans text-[10px] tracking-[0.1em] uppercase px-2 py-0.5 rounded-full ${d.active ? 'bg-sage-100 text-sage-600' : 'bg-cream-200 text-bark-400'}`}>{d.active ? 'Active' : 'Off'}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => toggle(d)} className="font-sans text-[10px] tracking-[0.15em] uppercase text-bark-400 hover:text-bark-700">
                      {d.active ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
