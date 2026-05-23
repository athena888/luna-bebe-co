'use client'

import { useState } from 'react'
import { Package } from 'lucide-react'

export function ShipButton({ orderId, onShipped }: { orderId: string; onShipped: (trackingNumber: string, labelUrl: string) => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleShip() {
    if (!confirm('Generate shipping label and mark as shipped?')) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/orders/${orderId}/ship`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      onShipped(data.trackingNumber, data.labelUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleShip}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sage-100 text-sage-700 font-sans text-xs font-semibold hover:bg-sage-200 transition-colors disabled:opacity-50"
      >
        <Package size={12} />
        {loading ? 'Shipping...' : 'Ship'}
      </button>
      {error && <p className="font-sans text-[10px] text-red-500 mt-1">{error}</p>}
    </div>
  )
}
