'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'

// Inline manual tracking entry for an order row. Add when there's no number,
// pencil-edit when there is. Saving a number on a not-yet-shipped order marks
// it shipped and sends the shipped email (server-side, same as Shippo).
export function ManualTracking({ orderId, current, onSaved }: {
  orderId: string
  current: string | null
  onSaved: (trackingNumber: string, trackingUrl: string | null, shipped: boolean) => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(current ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    if (!value.trim() || saving) return
    setSaving(true); setError('')
    try {
      const res = await fetch(`/api/orders/${orderId}/tracking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingNumber: value }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      onSaved(data.trackingNumber, data.trackingUrl ?? null, !!data.shipped)
      setEditing(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    return current ? (
      <button type="button" onClick={() => { setValue(current); setEditing(true) }} title="Edit tracking number"
        className="text-bark-300 hover:text-bark-500 transition-colors">
        <Pencil size={11} />
      </button>
    ) : (
      <button type="button" onClick={() => setEditing(true)}
        className="font-sans text-[10px] text-bark-400 underline underline-offset-2 hover:text-bark-600 transition-colors">
        add tracking
      </button>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <input
        autoFocus
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); save() } if (e.key === 'Escape') setEditing(false) }}
        placeholder="9400 1234 5678…"
        className="w-40 px-2 py-1 border border-cream-300 bg-white font-mono text-xs text-bark-600 focus:outline-none focus:border-bark-400"
      />
      <button type="button" onClick={save} disabled={saving}
        className="px-2 py-1 rounded bg-sage-100 text-sage-600 font-sans text-[10px] font-semibold hover:bg-sage-200 disabled:opacity-50">
        {saving ? '…' : 'Save'}
      </button>
      <button type="button" onClick={() => { setEditing(false); setError('') }}
        className="font-sans text-[10px] text-bark-400 hover:text-bark-600">cancel</button>
      {error && <span className="font-sans text-[10px] text-red-500">{error}</span>}
    </span>
  )
}
