'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser as supabase } from '@/lib/supabase-browser'
import { Copy, LogOut } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

type Stats = {
  affiliate: {
    id: string
    name: string
    code: string
    status: string
    tier: string
    commission_rate: number
    stripe_onboarded: boolean
    stripe_account_id: string | null
  }
  clicks30d: number
  conversions: number
  earningsPending: number
  earningsEligible: number
  earningsPaid: number
  recent: Array<{
    id: string
    created_at: string
    order_total: number
    commission_amount: number
    status: string
  }>
}

function formatPrice(cents: number) { return `$${(cents / 100).toFixed(2)}` }

export default function AffiliateDashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [email, setEmail] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [magicSent, setMagicSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [onboardLoading, setOnboardLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) loadStats()
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      if (session?.user) loadStats()
      else { setStats(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function loadStats() {
    setLoading(true)
    setError('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }
    const res = await fetch('/api/affiliate/stats', {
      headers: { authorization: `Bearer ${session.access_token}` },
    })
    const data = await res.json()
    if (res.ok) setStats(data)
    else setError(data.error || 'Failed to load')
    setLoading(false)
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setAuthLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/affiliate/dashboard` },
    })
    if (error) setError(error.message)
    else setMagicSent(true)
    setAuthLoading(false)
  }

  async function handleOnboard() {
    setOnboardLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/affiliate/onboard', {
      method: 'POST',
      headers: { authorization: `Bearer ${session?.access_token ?? ''}` },
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else { setError(data.error || 'Failed to start onboarding'); setOnboardLoading(false) }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    setUser(null)
    setStats(null)
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-6 py-20">
        <div className="text-center mb-10">
          <p className="font-sans text-[10px] tracking-[0.35em] uppercase text-gold-400 mb-3">Affiliate</p>
          <h1 className="font-serif text-4xl text-bark-600">Sign In</h1>
        </div>
        {magicSent ? (
          <div className="bg-sage-50 border border-sage-200 rounded-xl p-6 text-center">
            <p className="font-serif text-lg text-bark-600 mb-2">Check your email</p>
            <p className="font-sans text-sm text-bark-400">Sign-in link sent to <strong>{email}</strong>.</p>
          </div>
        ) : (
          <form onSubmit={handleMagicLink} className="space-y-4">
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com"
              className="w-full px-4 py-3 border border-cream-300 bg-cream-50 font-sans text-sm focus:outline-none focus:border-bark-400" />
            {error && <p className="font-sans text-xs text-red-500">{error}</p>}
            <button type="submit" disabled={authLoading}
              className="w-full bg-bark-600 text-cream-50 font-sans text-[11px] tracking-[0.2em] uppercase py-4 hover:bg-bark-700 disabled:opacity-40">
              {authLoading ? 'Sending…' : 'Send Sign-In Link'}
            </button>
          </form>
        )}
      </div>
    )
  }

  if (loading) {
    return <div className="max-w-3xl mx-auto px-6 py-20 font-sans text-sm text-bark-400">Loading…</div>
  }

  if (!stats) {
    return (
      <div className="max-w-md mx-auto px-6 py-20 text-center">
        <p className="font-sans text-[10px] tracking-[0.35em] uppercase text-gold-400 mb-3">Not an Affiliate Yet</p>
        <h1 className="font-serif text-3xl text-bark-600 mb-4">No application found</h1>
        <p className="font-sans text-sm text-bark-400 mb-6">{error || 'No affiliate account is linked to this email.'}</p>
        <a href="/affiliate/apply" className="font-sans text-xs tracking-[0.2em] uppercase text-bark-600 underline">Apply now</a>
        <div className="mt-8">
          <button onClick={handleSignOut} className="flex items-center gap-1.5 font-sans text-xs text-bark-400 mx-auto">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </div>
    )
  }

  const a = stats.affiliate
  const referralUrl = typeof window !== 'undefined' ? `${window.location.origin}/?ref=${a.code}` : ''

  return (
    <div className="max-w-3xl mx-auto px-6 py-14">
      <div className="flex items-start justify-between mb-10">
        <div>
          <p className="font-sans text-[10px] tracking-[0.35em] uppercase text-gold-400 mb-1">Affiliate Dashboard</p>
          <h1 className="font-serif text-3xl text-bark-600">{a.name}</h1>
          <p className="font-sans text-xs text-bark-400 mt-1">{a.tier.toUpperCase()} tier · {Math.round(a.commission_rate * 100)}% commission</p>
        </div>
        <button onClick={handleSignOut} className="flex items-center gap-1.5 font-sans text-xs text-bark-400 hover:text-bark-600">
          <LogOut size={14} /> Sign out
        </button>
      </div>

      {a.status !== 'approved' && (
        <div className="bg-cream-100 border border-cream-300 p-5 mb-8">
          <p className="font-sans text-sm text-bark-600">Status: <strong>{a.status}</strong></p>
          {a.status === 'pending' && <p className="font-sans text-xs text-bark-400 mt-1">We&rsquo;ll email you when your application is reviewed.</p>}
        </div>
      )}

      {a.status === 'approved' && !a.stripe_onboarded && (
        <div className="bg-gold-100 border border-gold-300 p-5 mb-8">
          <p className="font-serif text-lg text-bark-600 mb-1">Set up payouts</p>
          <p className="font-sans text-xs text-bark-500 mb-3">Connect a bank account through Stripe to receive monthly commission payouts.</p>
          <button onClick={handleOnboard} disabled={onboardLoading}
            className="bg-bark-600 text-cream-50 font-sans text-[11px] tracking-[0.2em] uppercase px-5 py-3 hover:bg-bark-700 disabled:opacity-40">
            {onboardLoading ? 'Loading…' : 'Connect Stripe'}
          </button>
        </div>
      )}

      <div className="border border-cream-300 bg-cream-50 p-6 mb-10">
        <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark-400 mb-3">Your Referral Link</p>
        <div className="flex gap-2">
          <input readOnly value={referralUrl} className="flex-1 px-3 py-2 bg-white border border-cream-300 font-mono text-xs text-bark-600" />
          <button onClick={() => navigator.clipboard.writeText(referralUrl)}
            className="px-4 bg-bark-600 text-cream-50 hover:bg-bark-700" title="Copy">
            <Copy size={14} />
          </button>
        </div>
        <p className="font-sans text-[10px] text-bark-400 mt-3">Code: <strong className="font-mono">{a.code}</strong></p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Clicks (30d)', value: stats.clicks30d.toString() },
          { label: 'Conversions', value: stats.conversions.toString() },
          { label: 'Pending', value: formatPrice(stats.earningsPending) },
          { label: 'Paid', value: formatPrice(stats.earningsPaid) },
        ].map(s => (
          <div key={s.label} className="border border-cream-300 bg-white p-4">
            <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-1">{s.label}</p>
            <p className="font-serif text-2xl text-bark-600">{s.value}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark-400 mb-4 pb-3 border-b border-cream-300">Recent Conversions</p>
        {stats.recent.length === 0 ? (
          <p className="font-sans text-sm text-bark-400">No conversions yet. Share your link to start earning.</p>
        ) : (
          <div className="space-y-2">
            {stats.recent.map(c => (
              <div key={c.id} className="border border-cream-300 bg-white p-4 flex items-center justify-between">
                <div>
                  <p className="font-sans text-xs text-bark-600">{new Date(c.created_at).toLocaleDateString()}</p>
                  <p className="font-sans text-[10px] text-bark-400">Order {formatPrice(c.order_total)}</p>
                </div>
                <div className="text-right">
                  <p className="font-sans text-sm text-bark-600">{formatPrice(c.commission_amount)}</p>
                  <span className="font-sans text-[9px] tracking-[0.15em] uppercase bg-cream-200 text-bark-500 px-2 py-0.5">{c.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
