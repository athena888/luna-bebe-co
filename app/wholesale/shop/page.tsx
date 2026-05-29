'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser as supabase } from '@/lib/supabase-browser'
import { getAllProducts, CATEGORY_LABELS, CATEGORY_ORDER } from '@/lib/products'
import { applyTierPrice, TIER_LABELS, TIER_MIN_ORDER_CENTS, TIER_DISCOUNTS, meetsMinimumOrder } from '@/lib/wholesale'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import type { WholesaleTier } from '@/types'

type Account = { id: string; business_name: string; tier: WholesaleTier; payment_terms: 'prepay' | 'net30'; status: string }

function formatPrice(cents: number) { return `$${(cents / 100).toFixed(2)}` }

export default function WholesaleShopPage() {
  const [user, setUser] = useState<User | null>(null)
  const [account, setAccount] = useState<Account | null>(null)
  const [cart, setCart] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user)
      if (!data.user) { setLoading(false); return }
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/wholesale/invoices', { headers: { authorization: `Bearer ${session?.access_token}` } })
      const json = await res.json()
      if (res.ok) setAccount(json.account)
      else setError(json.error || 'Failed to load')
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="max-w-4xl mx-auto px-6 py-20 font-sans text-sm text-bark-400">Loading…</div>
  if (!user) return (
    <div className="max-w-md mx-auto px-6 py-20 text-center">
      <p className="font-sans text-sm text-bark-400 mb-4">Please sign in to your wholesale account.</p>
      <Link href="/wholesale/dashboard" className="font-sans text-xs tracking-[0.2em] uppercase underline text-bark-600">Sign in</Link>
    </div>
  )
  if (!account || account.status !== 'approved') return (
    <div className="max-w-md mx-auto px-6 py-20 text-center">
      <p className="font-sans text-sm text-bark-400 mb-4">{error || 'Your wholesale account is not yet approved.'}</p>
      <Link href="/wholesale/dashboard" className="font-sans text-xs tracking-[0.2em] uppercase underline text-bark-600">Back to dashboard</Link>
    </div>
  )

  const products = getAllProducts()
  const tier = account.tier
  const subtotal = Object.entries(cart).reduce((sum, [pid, qty]) => {
    const p = products.find(x => x.id === pid)
    return sum + (p ? applyTierPrice(p.price, tier) * qty : 0)
  }, 0)
  const minimum = TIER_MIN_ORDER_CENTS[tier]
  const meetsMin = meetsMinimumOrder(subtotal, tier)

  function updateQty(pid: string, delta: number) {
    setCart(c => {
      const next = { ...c }
      const cur = next[pid] ?? 0
      const newQty = Math.max(0, cur + delta)
      if (newQty === 0) delete next[pid]
      else next[pid] = newQty
      return next
    })
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-14 pb-32">
      <div className="mb-10">
        <p className="font-sans text-[10px] tracking-[0.35em] uppercase text-gold-400 mb-2">{account.business_name}</p>
        <h1 className="font-serif text-4xl text-bark-600">Wholesale Catalog</h1>
        <p className="font-sans text-xs text-bark-400 mt-2">
          {TIER_LABELS[tier]} pricing · {Math.round(TIER_DISCOUNTS[tier] * 100)}% off MSRP · Min order {formatPrice(minimum)}
        </p>
      </div>

      {CATEGORY_ORDER.map(cat => (
        <section key={cat} className="mb-14">
          <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark-400 mb-5 pb-3 border-b border-cream-300">
            {CATEGORY_LABELS[cat]}
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.filter(p => p.category === cat).map(p => {
              const wholesalePrice = applyTierPrice(p.price, tier)
              const qty = cart[p.id] ?? 0
              return (
                <div key={p.id} className="border border-cream-300 bg-white p-5">
                  <p className="font-serif text-lg text-bark-600">{p.name}</p>
                  <p className="font-sans text-xs text-bark-400 mt-1 mb-3 line-clamp-2">{p.description}</p>
                  <div className="flex items-baseline gap-2 mb-3">
                    <p className="font-sans text-lg text-bark-600">{formatPrice(wholesalePrice)}</p>
                    <p className="font-sans text-xs text-bark-400 line-through">{formatPrice(p.price)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => updateQty(p.id, -1)} disabled={qty === 0}
                      className="w-8 h-8 border border-cream-300 font-sans text-bark-600 disabled:opacity-30">−</button>
                    <span className="font-sans text-sm text-bark-600 w-8 text-center">{qty}</span>
                    <button onClick={() => updateQty(p.id, 1)}
                      className="w-8 h-8 border border-cream-300 font-sans text-bark-600">+</button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}

      {/* Sticky checkout bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-cream-300 px-6 py-4 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div>
            <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400">Subtotal</p>
            <p className="font-serif text-xl text-bark-600">{formatPrice(subtotal)}</p>
            {!meetsMin && (
              <p className="font-sans text-[10px] text-red-500 mt-0.5">
                {formatPrice(minimum - subtotal)} below {TIER_LABELS[tier]} minimum
              </p>
            )}
          </div>
          <Link
            href={meetsMin ? `/wholesale/checkout?cart=${encodeURIComponent(JSON.stringify(cart))}` : '#'}
            className={`font-sans text-[11px] tracking-[0.2em] uppercase px-8 py-4 transition-colors ${meetsMin ? 'bg-bark-600 text-cream-50 hover:bg-bark-700' : 'bg-cream-200 text-bark-400 cursor-not-allowed'}`}
            onClick={e => { if (!meetsMin) e.preventDefault() }}
          >
            Checkout
          </Link>
        </div>
      </div>
    </div>
  )
}
