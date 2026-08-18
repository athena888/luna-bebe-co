'use client'

import { useState } from 'react'

// Phase 3 buy-panel widget — the buyer enters the occasion date (shower, due
// date, birthday) and gets a concrete order-by line. Hand-packed boxes ship
// within 3 days + transit ≈ 5 business days padding total.
const PAD_DAYS = 8

export function OccasionCountdown() {
  const [date, setDate] = useState('')
  let line: string | null = null
  let late = false
  if (date) {
    const target = new Date(`${date}T12:00:00`)
    const orderBy = new Date(target.getTime() - PAD_DAYS * 24 * 60 * 60 * 1000)
    late = orderBy.getTime() < Date.now()
    line = late
      ? 'That date is close — order today and add a note at checkout; we prioritize occasion orders.'
      : `Order by ${orderBy.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} to arrive before the big day.`
  }
  return (
    <div className="mt-5 border border-cream-300 bg-cream-100 p-4">
      <label className="block font-sans text-[11px] tracking-[0.14em] uppercase text-bark-400 mb-2">
        Gifting for a date?
      </label>
      <input
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
        className="font-sans text-sm text-bark-600 bg-white border border-cream-300 px-3 py-2 focus:outline-none focus:border-espresso-light"
      />
      {line && <p className={`font-sans text-xs mt-2.5 ${late ? 'text-terra-500' : 'text-sage-700'}`}>{line}</p>}
    </div>
  )
}
