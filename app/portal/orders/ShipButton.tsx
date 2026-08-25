'use client'

import { useState } from 'react'
import { Package } from 'lucide-react'
import { CARTONS, DEFAULT_WEIGHT_LB } from '@/lib/packaging'

// Carton and weight are chosen PER SHIPMENT, not derived from the box that was
// ordered: the same set goes out in a different carton when a piece is swapped,
// and USPS bills on the greater of declared and actual weight. The size is
// pre-set to M and the weight to the usual 2 lb, so the common case is still
// one click.
export function ShipButton({ orderId, onShipped }: { orderId: string; onShipped: (trackingNumber: string, labelUrl: string) => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cartonId, setCartonId] = useState('M')
  const [weight, setWeight] = useState(String(DEFAULT_WEIGHT_LB))

  async function handleShip() {
    const weightLb = Number(weight)
    // Checked here as well as server-side: a bad number should cost a keystroke,
    // not a round trip that ends in a failed label purchase.
    if (!Number.isFinite(weightLb) || weightLb <= 0 || weightLb > 70) {
      setError('Weight must be between 0 and 70 lb')
      return
    }
    if (!confirm(`Buy a label for carton ${cartonId} at ${weightLb} lb and mark as shipped?`)) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/orders/${orderId}/ship`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartonId, weightLb }),
      })
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
      <div className="flex flex-wrap items-center gap-1.5">
        <select
          value={cartonId}
          onChange={e => setCartonId(e.target.value)}
          disabled={loading}
          aria-label="Carton size"
          className="px-2 py-1.5 rounded-lg border border-cream-300 bg-white font-sans text-xs text-bark-600 disabled:opacity-50"
        >
          {CARTONS.map(c => (
            <option key={c.id} value={c.id}>
              {c.id} · {c.lengthCm}×{c.widthCm}×{c.heightCm} cm
            </option>
          ))}
        </select>

        <input
          type="number"
          min="0.1"
          max="70"
          step="0.1"
          value={weight}
          onChange={e => setWeight(e.target.value)}
          disabled={loading}
          aria-label="Weight in pounds"
          className="w-16 px-2 py-1.5 rounded-lg border border-cream-300 bg-white font-sans text-xs text-bark-600 disabled:opacity-50"
        />
        <span className="font-sans text-[10px] text-bark-400">lb</span>

        <button
          onClick={handleShip}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sage-100 text-sage-700 font-sans text-xs font-semibold hover:bg-sage-200 transition-colors disabled:opacity-50"
        >
          <Package size={12} />
          {loading ? 'Shipping...' : 'Ship'}
        </button>
      </div>
      {error && <p className="font-sans text-[10px] text-red-500 mt-1">{error}</p>}
    </div>
  )
}
