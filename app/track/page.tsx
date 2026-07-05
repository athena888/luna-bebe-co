'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { SlotBackground } from '@/components/ui/SlotBackground'
import { CONTACT_EMAIL } from '@/lib/site-config'
import { Package, Truck, CheckCircle, Clock, ExternalLink } from 'lucide-react'

// Styled to match the account sign-in: serif espresso labels, white inputs,
// olive button, gold accents.
const inputClass = "w-full px-4 py-3 border border-cream-300 bg-white font-sans text-sm text-bark-600 placeholder:text-bark-400/40 focus:outline-none focus:border-gold-400 transition-colors"
const labelClass = "block font-serif text-lg text-espresso mb-2"

type Order = {
  id: string
  status: string
  created_at: string
  total_amount: number
  shipping_type: string
  recipient_name: string | null
  tracking_number: string | null
  tracking_url: string | null
  selected_items: Array<{ name: string; price: number }>
  shipping_address: { name: string; city: string; state: string }
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  pending:    { label: 'Order Received',   icon: <Clock size={16} />,       color: 'text-bark-400' },
  paid:       { label: 'Payment Confirmed',icon: <CheckCircle size={16} />, color: 'text-sage-500' },
  assembling: { label: 'Assembling Box',   icon: <Package size={16} />,     color: 'text-gold-400' },
  shipped:    { label: 'Shipped',          icon: <Truck size={16} />,       color: 'text-sage-600' },
  delivered:  { label: 'Delivered',        icon: <CheckCircle size={16} />, color: 'text-sage-600' },
}

function formatPrice(cents: number) { return `$${(cents / 100).toFixed(2)}` }
function formatDate(iso: string) { return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) }

export default function TrackPage() {
  const [email, setEmail] = useState('')
  const [reference, setReference] = useState('')
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setOrders(null)
    setLoading(true)
    try {
      const res = await fetch('/api/orders/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, reference }),
      })
      const data = await res.json()
      if (data.orders) {
        setOrders(data.orders)
        if (data.orders.length === 0) setError('No orders found for that email address.')
      } else {
        setError(data.error || 'Something went wrong.')
      }
    } catch {
      setError('Could not look up your order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Header />
      <main className="sm:min-h-[90vh] bg-cream-50">
        {/* Optional background photo — Portal → Pages & Content → Track Order */}
        <SlotBackground slotKey="track.bg" scrim="bg-cream-50/85" className="sm:min-h-[90vh]" attach="fixed">
        <div className="max-w-xl mx-auto px-6 py-14">
          <div className="text-center mb-10">
            <p className="font-sans text-[11px] tracking-[0.3em] uppercase text-gold-400 mb-3">Order Status</p>
            <h1 className="font-serif text-4xl text-espresso">Track an Order</h1>
          </div>
          <form onSubmit={handleLookup} className="space-y-4 mb-10">
            <div>
              <label className={labelClass}>Email Address</label>
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Order Reference (optional)</label>
              <input type="text" value={reference} onChange={e => setReference(e.target.value.toUpperCase())} placeholder="e.g. A1B2C3D4" className={inputClass} />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#7A8E7C] text-white font-serif text-lg tracking-[0.06em] uppercase py-3.5 hover:bg-[#6d8070] transition-colors disabled:opacity-40"
            >
              {loading ? 'Looking up...' : 'Find My Order'}
            </button>
          </form>

          {error && <p className="font-sans text-sm text-red-500 text-center mb-8">{error}</p>}

          {orders && orders.length > 0 && (
            <div className="space-y-6">
              {orders.map(order => {
                const statusCfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending
                return (
                  <div key={order.id} className="border border-cream-300 bg-white">
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-cream-200 flex items-start justify-between gap-4">
                      <div>
                        <p className="font-sans text-[11px] tracking-[0.2em] uppercase text-bark-400 mb-1">Order Reference</p>
                        <p className="font-sans text-sm font-medium text-bark-600">#{order.id.slice(-8).toUpperCase()}</p>
                        <p className="font-sans text-xs text-bark-400 mt-0.5">{formatDate(order.created_at)}</p>
                      </div>
                      <div className={`flex items-center gap-1.5 font-sans text-xs font-medium ${statusCfg.color}`}>
                        {statusCfg.icon}
                        {statusCfg.label}
                      </div>
                    </div>

                    {/* Items */}
                    <div className="px-6 py-4 border-b border-cream-200">
                      {order.recipient_name && (
                        <p className="font-sans text-xs text-bark-400 mb-3">Gift for <span className="text-bark-600">{order.recipient_name}</span></p>
                      )}
                      <div className="space-y-2">
                        {order.selected_items?.map((item, i) => (
                          <div key={i} className="flex justify-between font-sans text-xs text-bark-500">
                            <span>{item.name}</span>
                            <span>{formatPrice(item.price)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between font-sans text-sm text-bark-600 font-medium pt-3 mt-3 border-t border-cream-100">
                        <span>Total</span>
                        <span>{formatPrice(order.total_amount)}</span>
                      </div>
                    </div>

                    {/* Tracking */}
                    {order.tracking_number ? (
                      <div className="px-6 py-4 bg-sage-50/50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-sans text-[11px] tracking-[0.2em] uppercase text-bark-400 mb-1">Tracking Number</p>
                            <p className="font-sans text-sm text-bark-600">{order.tracking_number}</p>
                          </div>
                          {order.tracking_url && (
                            <a
                              href={order.tracking_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 font-sans text-xs text-gold-500 hover:text-gold-600 transition-colors"
                            >
                              Track Package <ExternalLink size={12} />
                            </a>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="px-6 py-4">
                        <p className="font-sans text-xs text-bark-400">
                          Tracking information will appear here once your box ships. Questions? Email{' '}
                          <a href={`mailto:${CONTACT_EMAIL}`} className="text-gold-500 underline underline-offset-2 hover:text-gold-600 transition-colors">{CONTACT_EMAIL}</a>
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
        </SlotBackground>
      </main>
      <Footer />
    </>
  )
}
