'use client'

import { useState } from 'react'

const SIZES = ['Newborn', '0–3 mo', '3–6 mo', '6–9 mo', '9–12 mo', '12–18 mo', '18–24 mo']

export function ConfirmForm({ token, initialSize }: { token: string; initialSize: string | null }) {
  const [size, setSize] = useState(initialSize || '')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')

  async function submit() {
    if (!size || busy) return
    setBusy(true); setErr('')
    try {
      const res = await fetch('/api/first-year/confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, size }),
      })
      const d = await res.json()
      if (res.ok) setDone(true)
      else setErr(d.error || 'Something went wrong')
    } catch { setErr('Something went wrong') } finally { setBusy(false) }
  }

  if (done) {
    return (
      <div className="text-center">
        <p className="font-serif text-2xl text-espresso mb-2">Thank you — all set.</p>
        <p className="font-cormorant text-lg text-[#6F5B4D]">We&rsquo;ll send size <strong>{size}</strong>. Watch the mail. 💛</p>
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto">
      <div className="grid grid-cols-2 gap-2.5 mb-6">
        {SIZES.map(s => (
          <button key={s} type="button" onClick={() => setSize(s)}
            className={`font-sans text-sm py-3 border transition-colors ${size === s ? 'bg-espresso text-[#FBF4EA] border-espresso' : 'bg-white text-espresso border-[#d8c7a8] hover:border-espresso'}`}>
            {s}
          </button>
        ))}
      </div>
      <button onClick={submit} disabled={!size || busy}
        className="w-full bg-espresso text-[#FBF4EA] font-sans text-[11px] tracking-[0.25em] uppercase py-4 hover:opacity-90 transition-opacity disabled:opacity-50">
        {busy ? 'Saving…' : 'Confirm this size'}
      </button>
      {err && <p className="font-sans text-xs text-rose-500 mt-3 text-center">{err}</p>}
    </div>
  )
}
