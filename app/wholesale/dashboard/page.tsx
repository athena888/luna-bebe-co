'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser as supabase } from '@/lib/supabase-browser'
import { LogOut, ShoppingBag } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { TIER_LABELS, TIER_DISCOUNTS, TIER_MIN_ORDER_CENTS } from '@/lib/wholesale'

type Account = {
  id: string
  business_name: string
  status: string
  tier: 'silver' | 'gold' | 'platinum'
  payment_terms: 'prepay' | 'net30'
  credit_limit: number
}

type Order = {
  id: string
  created_at: string
  po_number: string | null
  total: number
  payment_method: string
  payment_status: string
  status: string
  due_at: string | null
}

function formatPrice(cents: number) { return `$${(cents / 100).toFixed(2)}` }

export default function WholesaleDashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [account, setAccount] = useState<Account | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [email, setEmail] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [magicSent, setMagicSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) load()
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      if (session?.user) load()
      else { setAccount(null); setOrders([]); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function load() {
    setLoading(true)
    setError('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }
    const res = await fetch('/api/wholesale/invoices', {
      headers: { authorization: `Bearer ${session.access_token}` },
    })
    const data = await res.json()
    if (res.ok) {
      setAccount(data.account)
      setOrders(data.orders ?? [])
    } else {
      setError(data.error || 'Failed to load')
    }
    setLoading(false)
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setAuthLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/wholesale/dashboard` },
    })
    if (error) setError(error.message)
    else setMagicSent(true)
    setAuthLoading(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    setUser(null)
    setAccount(null)
    setOrders([])
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-6 py-20">
        <div className="text-center mb-10">
          <p className="font-sans text-[10px] tracking-[0.35em] uppercase text-gold-400 mb-3">Wholesale</p>
          <h1 className="font-serif text-4xl text-bark-600">Sign In</h1>
        </div>
        {magicSent ? (
          <div className="bg-sage-50 border border-sage-200 rounded-xl p-6 text-center">
            <p className="font-serif text-lg text-bark-600 mb-2">Check your email</p>
            <p className="font-sans text-sm text-bark-400">Sign-in link sent to <strong>{email}</strong>.</p>
          </div>
        ) : (
          <form onSubmit={handleMagicLink} className="space-y-4">
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@business.com"
              className="w-full px-4 py-3 border border-cream-300 bg-cream-50 font-sans text-sm focus:outline-none focus:border-bark-400" />
            {error && <p className="font-sans text-xs text-red-500">{error}</p>}
            <button type="submit" disabled={authLoading}
              className="w-full bg-bark-600 text-cream-50 font-sans text-[11px] tracking-[0.2em] uppercase py-4 hover:bg-bark-700 disabled:opacity-40">
              {authLoading ? 'Sending…' : 'Send Sign-In Link'}
            </button>
            <p className="font-sans text-[10px] text-center text-bark-400">
              No account yet? <Link href="/wholesale/apply" className="underline">Apply for one</Link>
            </p>
          </form>
        )}
      </div>
    )
  }

  if (loading) return <div className="max-w-3xl mx-auto px-6 py-20 font-sans text-sm text-bark-400">Loading…</div>

  if (!account) {
    return (
      <div className="max-w-md mx-auto px-6 py-20 text-center">
        <p className="font-sans text-[10px] tracking-[0.35em] uppercase text-gold-400 mb-3">No Account Found</p>
        <h1 className="font-serif text-3xl text-bark-600 mb-4">We couldn&rsquo;t match your email</h1>
        <p className="font-sans text-sm text-bark-400 mb-6">{error || 'No wholesale account is linked to this email.'}</p>
        <Link href="/wholesale/apply" className="font-sans text-xs tracking-[0.2em] uppercase text-bark-600 underline">Apply for an account</Link>
        <div className="mt-8">
          <button onClick={handleSignOut} className="flex items-center gap-1.5 font-sans text-xs text-bark-400 mx-auto">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </div>
    )
  }

  const minOrder = TIER_MIN_ORDER_CENTS[account.tier]
  const discount = TIER_DISCOUNTS[account.tier]

  return (
    <div className="max-w-4xl mx-auto px-6 py-14">
      <div className="flex items-start justify-between mb-10">
        <div>
          <p className="font-sans text-[10px] tracking-[0.35em] uppercase text-gold-400 mb-1">Wholesale Account</p>
          <h1 className="font-serif text-3xl text-bark-600">{account.business_name}</h1>
          <p className="font-sans text-xs text-bark-400 mt-1">
            {TIER_LABELS[account.tier]} tier · {Math.round(discount * 100)}% off MSRP · Min order {formatPrice(minOrder)} · Payment: {account.payment_terms === 'net30' ? 'NET-30' : 'Prepay'}
          </p>
        </div>
        <button onClick={handleSignOut} className="flex items-center gap-1.5 font-sans text-xs text-bark-400 hover:text-bark-600">
          <LogOut size={14} /> Sign out
        </button>
      </div>

      {account.status !== 'approved' && (
        <div className="bg-cream-100 border border-cream-300 p-5 mb-8">
          <p className="font-sans text-sm text-bark-600">Status: <strong>{account.status}</strong></p>
          {account.status === 'pending' && <p className="font-sans text-xs text-bark-400 mt-1">We&rsquo;re reviewing your application. We&rsquo;ll email when approved.</p>}
          {account.status === 'rejected' && <p className="font-sans text-xs text-bark-400 mt-1">Your application was not approved at this time.</p>}
        </div>
      )}

      {account.status === 'approved' && (
        <Link href="/wholesale/shop" className="block bg-bark-600 text-cream-50 text-center py-6 mb-8 hover:bg-bark-700 transition-colors">
          <ShoppingBag size={20} className="mx-auto mb-2" />
          <p className="font-sans text-sm tracking-[0.15em] uppercase">Shop Wholesale Catalog</p>
        </Link>
      )}

      <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark-400 mb-4 pb-3 border-b border-cream-300">Order History</p>
      {orders.length === 0 ? (
        <p className="font-sans text-sm text-bark-400">No orders yet.</p>
      ) : (
        <div className="space-y-2">
          {orders.map(o => (
            <div key={o.id} className="border border-cream-300 bg-white p-4 flex items-center justify-between">
              <div>
                <p className="font-sans text-xs text-bark-600">#{o.id.slice(-8).toUpperCase()}{o.po_number ? ` · PO ${o.po_number}` : ''}</p>
                <p className="font-sans text-[10px] text-bark-400">{new Date(o.created_at).toLocaleDateString()}</p>
                {o.due_at && o.payment_status === 'pending' && (
                  <p className="font-sans text-[10px] text-bark-400">Due {new Date(o.due_at).toLocaleDateString()}</p>
                )}
              </div>
              <div className="text-right">
                <p className="font-sans text-sm text-bark-600">{formatPrice(o.total)}</p>
                <div className="flex gap-2 mt-1 justify-end">
                  <span className="font-sans text-[9px] tracking-[0.15em] uppercase bg-cream-200 text-bark-500 px-2 py-0.5">{o.status}</span>
                  <span className={`font-sans text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 ${o.payment_status === 'overdue' ? 'bg-red-100 text-red-700' : o.payment_status === 'paid' ? 'bg-sage-100 text-sage-700' : 'bg-cream-200 text-bark-500'}`}>
                    {o.payment_status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
