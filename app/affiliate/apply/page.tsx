'use client'

import { useState } from 'react'
import Link from 'next/link'

const inputClass = "w-full px-4 py-3 border border-cream-300 bg-cream-50 font-sans text-sm text-bark-600 placeholder:text-bark-400/40 focus:outline-none focus:border-bark-400 transition-colors"

export default function AffiliateApplyPage() {
  const [form, setForm] = useState({ name: '', email: '', socialHandle: '', audienceSize: '', notes: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/affiliate/apply', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submission failed')
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto px-6 py-24 text-center">
        <p className="font-sans text-[10px] tracking-[0.35em] uppercase text-gold-400 mb-3">Application Received</p>
        <h1 className="font-serif text-4xl text-bark-600 mb-4">Thank you</h1>
        <p className="font-sans text-sm text-bark-400 leading-relaxed mb-8">
          We&rsquo;ll review your application within 2 business days and email you when you&rsquo;re approved. Once approved, sign in to your affiliate dashboard with the email you used.
        </p>
        <Link href="/" className="font-sans text-xs tracking-[0.2em] uppercase text-bark-600 underline">Back to home</Link>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <div className="text-center mb-10">
        <p className="font-sans text-[10px] tracking-[0.35em] uppercase text-gold-400 mb-3">Affiliate Program</p>
        <h1 className="font-serif text-4xl text-bark-600">Apply</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-2">Full Name</label>
          <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputClass} />
        </div>
        <div>
          <label className="block font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-2">Email</label>
          <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputClass} />
        </div>
        <div>
          <label className="block font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-2">Primary Social Handle</label>
          <input value={form.socialHandle} onChange={e => setForm(f => ({ ...f, socialHandle: e.target.value }))} placeholder="@yourhandle (Instagram, TikTok, etc.)" className={inputClass} />
        </div>
        <div>
          <label className="block font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-2">Audience Size</label>
          <select value={form.audienceSize} onChange={e => setForm(f => ({ ...f, audienceSize: e.target.value }))} className={inputClass}>
            <option value="">Select…</option>
            <option value="under_1k">Under 1k</option>
            <option value="1k_10k">1k – 10k</option>
            <option value="10k_50k">10k – 50k</option>
            <option value="50k_100k">50k – 100k</option>
            <option value="over_100k">Over 100k</option>
          </select>
        </div>
        <div>
          <label className="block font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-2">Tell us about your audience</label>
          <textarea rows={4} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Who follows you and why might they love Petite Lavande?" className={inputClass} />
        </div>
        {error && <p className="font-sans text-xs text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-bark-600 text-cream-50 font-sans text-[11px] tracking-[0.2em] uppercase py-4 hover:bg-bark-700 transition-colors disabled:opacity-40"
        >
          {loading ? 'Submitting…' : 'Submit Application'}
        </button>
      </form>
    </div>
  )
}
