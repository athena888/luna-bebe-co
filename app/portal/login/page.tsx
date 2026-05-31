'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader } from 'lucide-react'
import { Suspense } from 'react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from') ?? '/portal'

  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/portal/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    setLoading(false)

    if (res.ok) {
      router.replace(from)
    } else {
      setError('Incorrect password.')
      setPassword('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="Portal password"
        autoFocus
        required
        className="w-full px-4 py-3 border border-cream-300 bg-white font-sans text-sm text-bark-600 placeholder:text-bark-400/40 focus:outline-none focus:border-bark-400 transition-colors"
      />
      {error && (
        <p className="font-sans text-xs text-red-500">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading || !password}
        className="w-full bg-bark-600 text-cream-50 font-sans text-[11px] tracking-[0.2em] uppercase py-3.5 hover:bg-bark-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {loading && <Loader size={13} className="animate-spin" />}
        Enter Portal
      </button>
    </form>
  )
}

export default function PortalLoginPage() {
  return (
    <div className="min-h-screen bg-bark-800 flex flex-col items-center justify-center px-6">
      <div className="mb-10 text-center">
        <div className="font-serif text-2xl tracking-[0.2em] uppercase text-gold-300 mb-1">Petite Lavande</div>
        <div className="font-sans text-[10px] uppercase tracking-[0.35em] text-gold-400/60">& Co. — Internal Portal</div>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  )
}
