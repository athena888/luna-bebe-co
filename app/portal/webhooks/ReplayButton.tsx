'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function ReplayButton({ eventId }: { eventId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function replay() {
    setLoading(true)
    setError('')
    const res = await fetch('/api/portal/webhooks/replay', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ eventId }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Replay failed')
      setLoading(false)
      return
    }
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={replay}
        disabled={loading}
        className="bg-bark-600 text-cream-50 font-sans text-[10px] tracking-[0.15em] uppercase px-3 py-1.5 hover:bg-bark-700 disabled:opacity-40"
      >
        {loading ? 'Replaying…' : 'Replay'}
      </button>
      {error && <span className="font-sans text-[10px] text-red-500">{error}</span>}
    </div>
  )
}
