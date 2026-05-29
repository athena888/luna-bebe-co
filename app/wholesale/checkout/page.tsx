'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabaseBrowser as supabase } from '@/lib/supabase-browser'
import { getAllProducts } from '@/lib/products'
import { applyTierPrice, TIER_LABELS, calculateDueDate } from '@/lib/wholesale'
import type { WholesaleTier, WholesaleLineItem } from '@/types'

const inputClass = "w-full px-4 py-3 border border-cream-300 bg-cream-50 font-sans text-sm text-bark-600 focus:outline-none focus:border-bark-400"

type Account = {
  id: string
  business_name: string
  tier: WholesaleTier
  payment_terms: 'prepay' | 'net30'
  status: string
  billing_address: { name?: string; line1?: string; city?: string; state?: string; zip?: string } | null
}

function formatPrice(cents: number) { return `$${(cents / 100).toFixed(2)}` }

function CheckoutInner() {
  const params = useSearchParams()
  const [account, setAccount] = useState<Account | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'net30'>('card')
  const [poNumber, setPoNumber] = useState('')
  const [shipping, setShipping] = useState({ name: '', line1: '', city: '', state: '', zip: '' })

  let cart: Record<string, number> = {}
  try { cart = JSON.parse(params.get('cart') || '{}') } catch {}

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { setLoading(false); return }
      const res = await fetch('/api/wholesale/invoices', { headers: { authorization: `Bearer ${data.session.access_token}` } })
      const json = await res.json()
      if (res.ok) {
        setAccount(json.account)
        if (json.account?.billing_address) {
          setShipping({
            name: json.account.business_name,
            line1: json.account.billing_address.line1 || '',
            city: json.account.billing_address.city || '',
            state: json.account.billing_address.state || '',
            zip: json.account.billing_address.zip || '',
          })
        }
      }
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="max-w-2xl mx-auto px-6 py-20 font-sans text-sm text-bark-400">Loading…</div>
  if (!account || account.status !== 'approved') return (
    <div className="max-w-md mx-auto px-6 py-20 text-center">
      <p className="font-sans text-sm text-bark-400 mb-4">Account not approved.</p>
      <Link href="/wholesale/dashboard" className="font-sans text-xs tracking-[0.2em] uppercase underline">Back</Link>
    </div>
  )

  const products = getAllProducts()
  const lineItems: WholesaleLineItem[] = Object.entries(cart).map(([pid, qty]) => {
    const p = products.find(x => x.id === pid)!
    const unit = applyTierPrice(p.price, account.tier)
    return { product_id: pid, product_name: p.name, quantity: qty, unit_price: unit, line_total: unit * qty }
  })
  const subtotal = lineItems.reduce((s, l) => s + l.line_total, 0)
  const total = subtotal // shipping/tax computed server-side or zero for trade

  async function submitOrder() {
    setSubmitting(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/wholesale/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          lineItems,
          subtotal,
          total,
          paymentMethod,
          poNumber: poNumber || null,
          shippingAddress: { ...shipping, email: '', phone: '' },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Checkout failed')
      if (data.url) window.location.href = data.url
      else window.location.href = '/wholesale/dashboard'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed')
      setSubmitting(false)
    }
  }

  const canNet30 = account.payment_terms === 'net30'
  const dueDate = calculateDueDate()

  return (
    <div className="max-w-2xl mx-auto px-6 py-14">
      <p className="font-sans text-[10px] tracking-[0.35em] uppercase text-gold-400 mb-2">Wholesale Checkout</p>
      <h1 className="font-serif text-3xl text-bark-600 mb-8">{account.business_name}</h1>

      <div className="border border-cream-300 bg-cream-50 p-5 mb-6">
        <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-3">Order Summary</p>
        <div className="space-y-2">
          {lineItems.map(l => (
            <div key={l.product_id} className="flex justify-between font-sans text-sm">
              <span className="text-bark-600">{l.product_name} × {l.quantity}</span>
              <span className="text-bark-600">{formatPrice(l.line_total)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-cream-300 mt-3 pt-3 flex justify-between">
          <span className="font-sans text-sm text-bark-600">Total ({TIER_LABELS[account.tier]} pricing)</span>
          <span className="font-serif text-xl text-bark-600">{formatPrice(total)}</span>
        </div>
      </div>

      <div className="mb-6">
        <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-3">PO Number (optional)</p>
        <input value={poNumber} onChange={e => setPoNumber(e.target.value)} placeholder="Your purchase order #" className={inputClass} />
      </div>

      <div className="mb-6">
        <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-3">Ship To</p>
        <div className="space-y-3">
          <input value={shipping.name} onChange={e => setShipping(s => ({ ...s, name: e.target.value }))} placeholder="Business name" className={inputClass} />
          <input value={shipping.line1} onChange={e => setShipping(s => ({ ...s, line1: e.target.value }))} placeholder="Street" className={inputClass} />
          <div className="grid grid-cols-3 gap-3">
            <input value={shipping.city} onChange={e => setShipping(s => ({ ...s, city: e.target.value }))} placeholder="City" className={inputClass} />
            <input value={shipping.state} onChange={e => setShipping(s => ({ ...s, state: e.target.value }))} placeholder="State" className={inputClass} />
            <input value={shipping.zip} onChange={e => setShipping(s => ({ ...s, zip: e.target.value }))} placeholder="ZIP" className={inputClass} />
          </div>
        </div>
      </div>

      <div className="mb-8">
        <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-3">Payment Method</p>
        <div className="space-y-2">
          <label className="flex items-center gap-3 p-4 border border-cream-300 bg-white cursor-pointer">
            <input type="radio" checked={paymentMethod === 'card'} onChange={() => setPaymentMethod('card')} />
            <span className="font-sans text-sm text-bark-600">Pay now with card</span>
          </label>
          {canNet30 && (
            <label className="flex items-center gap-3 p-4 border border-cream-300 bg-white cursor-pointer">
              <input type="radio" checked={paymentMethod === 'net30'} onChange={() => setPaymentMethod('net30')} />
              <span className="font-sans text-sm text-bark-600">NET-30 invoice (due {dueDate.toLocaleDateString()})</span>
            </label>
          )}
        </div>
        {!canNet30 && (
          <p className="font-sans text-[10px] text-bark-400 mt-2">NET-30 terms not enabled. Contact us to request invoice billing.</p>
        )}
      </div>

      {error && <p className="font-sans text-xs text-red-500 mb-4">{error}</p>}
      <button onClick={submitOrder} disabled={submitting || !shipping.line1}
        className="w-full bg-bark-600 text-cream-50 font-sans text-[11px] tracking-[0.2em] uppercase py-4 hover:bg-bark-700 disabled:opacity-40">
        {submitting ? 'Processing…' : paymentMethod === 'card' ? 'Continue to Payment' : 'Place Order on NET-30'}
      </button>
    </div>
  )
}

export default function WholesaleCheckoutPage() {
  return <Suspense fallback={<div className="max-w-2xl mx-auto px-6 py-20 font-sans text-sm text-bark-400">Loading…</div>}><CheckoutInner /></Suspense>
}
