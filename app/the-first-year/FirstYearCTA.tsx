'use client'

import { useState } from 'react'

// Add-to-cart for the set → starts the existing Stripe checkout (one payment).
export function FirstYearCTA() {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  async function buy() {
    setBusy(true); setErr('')
    try {
      const res = await fetch('/api/first-year/checkout', { method: 'POST' })
      const d = await res.json()
      if (d.url) { window.location.href = d.url; return }
      setErr(d.error || 'Could not start checkout'); setBusy(false)
    } catch { setErr('Could not start checkout'); setBusy(false) }
  }
  return (
    <div>
      <button onClick={buy} disabled={busy}
        className="inline-block bg-espresso text-[#FBF4EA] font-sans text-[11px] tracking-[0.28em] uppercase px-12 py-4 hover:opacity-90 transition-opacity disabled:opacity-60">
        {busy ? 'One moment…' : 'Reserve The First Year'}
      </button>
      {err && <p className="font-sans text-xs text-rose-500 mt-3">{err}</p>}
    </div>
  )
}
