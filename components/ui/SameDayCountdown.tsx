'use client'

import { useEffect, useState } from 'react'

// Live countdown to the 1:00 PM America/Los_Angeles same-day cutoff.
// Before cutoff: "Order within Xh Ym for delivery this evening."
// After: "Order now for delivery tomorrow evening." Ticks every 30s.
function minutesToCutoff(): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles', hour12: false, hour: 'numeric', minute: 'numeric',
  }).formatToParts(new Date())
  const h = Number(parts.find(p => p.type === 'hour')?.value ?? 0) % 24
  const m = Number(parts.find(p => p.type === 'minute')?.value ?? 0)
  return 13 * 60 - (h * 60 + m)
}

export function SameDayCountdown() {
  const [mins, setMins] = useState<number | null>(null)
  useEffect(() => {
    const tick = () => setMins(minutesToCutoff())
    tick()
    const t = setInterval(tick, 30_000)
    return () => clearInterval(t)
  }, [])

  if (mins === null) return <p className="font-sans text-sm text-bark-500 h-5" aria-hidden="true" />
  return (
    <p className="font-sans text-sm text-bark-600" role="status" aria-live="polite">
      {mins > 0 ? (
        <>
          <span className="inline-block w-2 h-2 rounded-full bg-[#7A8E7C] mr-2 align-middle" aria-hidden="true" />
          Order within <strong>{Math.floor(mins / 60)}h {mins % 60}m</strong> for delivery this evening.
        </>
      ) : (
        <>
          <span className="inline-block w-2 h-2 rounded-full bg-gold-400 mr-2 align-middle" aria-hidden="true" />
          Order now for delivery <strong>tomorrow evening</strong>.
        </>
      )}
    </p>
  )
}
