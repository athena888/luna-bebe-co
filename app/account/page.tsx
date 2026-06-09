'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabaseBrowser as supabase } from '@/lib/supabase-browser'
import { Button } from '@/components/ui/Button'
import { Package, LogOut, MapPin } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

type Order = {
  id: string
  status: string
  created_at: string
  total_amount: number
  recipient_name: string | null
  tracking_number: string | null
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Received', paid: 'Confirmed', assembling: 'Assembling', shipped: 'Shipped', delivered: 'Delivered',
}

function formatPrice(cents: number) { return `$${(cents / 100).toFixed(2)}` }
function formatDate(iso: string) { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [magicSent, setMagicSent] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) loadOrders(data.user.email!)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) loadOrders(session.user.email!)
      else setLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function loadOrders(email: string) {
    setLoading(true)
    const { data } = await supabase
      .from('orders')
      .select('id, status, created_at, total_amount, recipient_name, tracking_number')
      .ilike('customer_email', email)
      .order('created_at', { ascending: false })
      .limit(10)
    setOrders(data || [])
    setLoading(false)
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setAuthError('')
    setAuthLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/account` } })
    if (error) setAuthError(error.message)
    else setMagicSent(true)
    setAuthLoading(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    setUser(null)
    setOrders([])
  }

  const inputClass = "w-full px-4 py-3 border border-cream-300 bg-cream-50 font-sans text-sm text-bark-600 placeholder:text-bark-400/40 focus:outline-none focus:border-bark-400 transition-colors"

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-6 py-20">
        <div className="text-center mb-10">
          <p className="font-sans text-[10px] tracking-[0.35em] uppercase text-gold-400 mb-3">My Account</p>
          <h1 className="font-serif text-4xl text-bark-600">Sign In</h1>
          <p className="font-sans text-sm text-bark-400 mt-2">View your orders and saved items.</p>
        </div>

        {magicSent ? (
          <div className="bg-sage-50 border border-sage-200 rounded-xl p-6 text-center">
            <p className="font-serif text-lg text-bark-600 mb-2">Check your email</p>
            <p className="font-sans text-sm text-bark-400">We sent a sign-in link to <strong>{email}</strong>. Click it to access your account.</p>
          </div>
        ) : (
          <form onSubmit={handleMagicLink} className="space-y-4">
            <div>
              <label className="block font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-2">Email Address</label>
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" className={inputClass} />
            </div>
            {authError && <p className="font-sans text-xs text-red-500">{authError}</p>}
            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-bark-600 text-cream-50 font-sans text-[11px] tracking-[0.2em] uppercase py-4 hover:bg-bark-700 transition-colors disabled:opacity-40"
            >
              {authLoading ? 'Sending...' : 'Send Sign-In Link'}
            </button>
            <p className="font-sans text-[10px] text-bark-400 text-center">No password needed — we email you a secure sign-in link.</p>
          </form>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-14">
      {/* Account header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <p className="font-sans text-[10px] tracking-[0.35em] uppercase text-gold-400 mb-1">Welcome back</p>
          <h1 className="font-serif text-3xl text-bark-600">{user.email}</h1>
        </div>
        <button onClick={handleSignOut} className="flex items-center gap-1.5 font-sans text-xs text-bark-400 hover:text-bark-600 transition-colors">
          <LogOut size={14} /> Sign out
        </button>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-4 mb-12">
        {[
          { icon: <Package size={18} />, label: 'Orders', href: '#orders' },
          { icon: <MapPin size={18} />, label: 'Track Order', href: '/track' },
        ].map(({ icon, label, href }) => (
          <a
            key={label}
            href={href}
            className="flex flex-col items-center gap-2 py-5 border border-cream-300 hover:border-bark-400 transition-colors text-bark-400 hover:text-bark-600"
          >
            {icon}
            <span className="font-sans text-[10px] tracking-[0.2em] uppercase">{label}</span>
          </a>
        ))}
      </div>

      {/* Orders */}
      <div id="orders">
        <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark-400 mb-6 pb-3 border-b border-cream-300">Order History</p>
        {loading ? (
          <p className="font-sans text-sm text-bark-400">Loading orders...</p>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <Package size={28} className="text-cream-300 mx-auto mb-3" />
            <p className="font-sans text-sm text-bark-400 mb-6">No orders yet.</p>
            <Link href="/build"><Button variant="gold" size="md">Build Your First Box</Button></Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <div key={order.id} className="border border-cream-300 bg-white p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="font-sans text-xs font-medium text-bark-600 mb-0.5">#{order.id.slice(-8).toUpperCase()}</p>
                  <p className="font-sans text-[10px] text-bark-400">{formatDate(order.created_at)}</p>
                  {order.recipient_name && <p className="font-sans text-[10px] text-bark-400 mt-0.5">For {order.recipient_name}</p>}
                </div>
                <div className="text-right">
                  <p className="font-sans text-sm text-bark-600 mb-0.5">{formatPrice(order.total_amount)}</p>
                  <span className="inline-block font-sans text-[9px] tracking-[0.15em] uppercase bg-cream-200 text-bark-500 px-2 py-0.5">
                    {STATUS_LABEL[order.status] ?? order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
