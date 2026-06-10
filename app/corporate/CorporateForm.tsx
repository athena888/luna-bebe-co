'use client'

import { useState } from 'react'
import { submitB2bLead } from '@/app/actions/b2b'

const TEAM_SIZES = ['<50', '50-200', '200-1000', '1000+']

const labelCls = 'block font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-1.5'
const inputCls = 'w-full px-4 py-3 border border-cream-300 bg-cream-50 font-sans text-sm text-bark-700 focus:outline-none focus:border-bark-400 transition-colors'

export function CorporateForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [teamSize, setTeamSize] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setLoading(true); setError('')
    const res = await submitB2bLead({ email, name, company, team_size: teamSize, message })
    setLoading(false)
    if ('ok' in res) {
      setDone(true)
      try { (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.('event', 'b2b_lead') } catch { /* no GA */ }
    } else {
      setError(res.error)
    }
  }

  if (done) {
    return (
      <div className="border border-cream-300 bg-cream-50 px-6 py-12 text-center">
        <p className="font-cormorant text-2xl text-bark-600 leading-relaxed">Merci — we&rsquo;ll reply within one business day.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="font-serif text-2xl text-bark-600 mb-6">Tell us about your team</h2>

      <div>
        <label htmlFor="b2b-name" className={labelCls}>Name</label>
        <input id="b2b-name" type="text" value={name} onChange={e => setName(e.target.value)} required className={inputCls} />
      </div>
      <div>
        <label htmlFor="b2b-email" className={labelCls}>Work email</label>
        <input id="b2b-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@company.com" className={inputCls} />
      </div>
      <div>
        <label htmlFor="b2b-company" className={labelCls}>Company</label>
        <input id="b2b-company" type="text" value={company} onChange={e => setCompany(e.target.value)} className={inputCls} />
      </div>
      <div>
        <label htmlFor="b2b-team" className={labelCls}>Team size</label>
        <select id="b2b-team" value={teamSize} onChange={e => setTeamSize(e.target.value)} className={inputCls}>
          <option value="">Select…</option>
          {TEAM_SIZES.map(s => <option key={s} value={s}>{s} people</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="b2b-message" className={labelCls}>Message <span className="normal-case tracking-normal text-bark-300">(optional)</span></label>
        <textarea id="b2b-message" rows={4} value={message} onChange={e => setMessage(e.target.value)} className={`${inputCls} resize-none`} />
      </div>

      {error && <p className="font-sans text-xs text-red-500">{error}</p>}

      <button type="submit" disabled={loading} className="w-full bg-bark-600 text-cream-50 font-sans text-[11px] tracking-[0.25em] uppercase py-4 hover:bg-bark-700 transition-colors disabled:opacity-50">
        {loading ? 'Sending…' : 'Start the conversation'}
      </button>
    </form>
  )
}
