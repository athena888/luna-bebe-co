'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { resolveLocale, marketFor, LOCALE_COOKIE, type MarketConfig } from '@/lib/markets'
import { joinWaitlist } from '@/app/actions/waitlist'

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return m ? decodeURIComponent(m[1]) : null
}

// Thin top banner shown ONLY when the visitor's market isn't live yet — invites
// an email to the waitlist. Resolves the market client-side after mount (so
// there's no SSR/CSR mismatch); renders nothing for enabled markets (US).
export function MarketGate() {
  const [market, setMarket] = useState<MarketConfig | null>(null)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [closed, setClosed] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const loc = resolveLocale({
      host: window.location.host,
      cookie: readCookie(LOCALE_COOKIE),
      acceptLanguage: navigator.language,
    })
    const m = marketFor(loc)
    if (!m.enabled) setMarket(m)
  }, [])

  if (!market || closed) return null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy || !market) return
    setBusy(true); setError('')
    const res = await joinWaitlist(email, market.locale)
    setBusy(false)
    if ('ok' in res) setDone(true); else setError(res.error)
  }

  return (
    <div className="relative bg-bark-700 text-cream-50 px-4 py-2.5">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 text-center">
        {done ? (
          <p className="font-sans text-xs sm:text-[13px]">Thank you — we&rsquo;ll let you know the moment we ship to {market.country}.</p>
        ) : (
          <>
            <p className="font-sans text-xs sm:text-[13px]">
              We hope to ship to <strong>{market.country}</strong> soon — leave your email and be first to know.
            </p>
            <form onSubmit={submit} className="flex items-center gap-2">
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="px-3 py-1.5 rounded bg-cream-50 text-bark-700 font-sans text-xs w-44 focus:outline-none"
              />
              <button type="submit" disabled={busy} className="px-3 py-1.5 rounded bg-gold-400 text-bark-800 font-sans text-[11px] tracking-[0.1em] uppercase font-semibold hover:bg-gold-300 transition-colors disabled:opacity-50">
                {busy ? '…' : 'Notify me'}
              </button>
            </form>
            {error && <span className="font-sans text-[11px] text-red-200">{error}</span>}
          </>
        )}
      </div>
      <button onClick={() => setClosed(true)} aria-label="Dismiss" className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-50/70 hover:text-cream-50">
        <X size={15} />
      </button>
    </div>
  )
}
