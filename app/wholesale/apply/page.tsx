'use client'

import { useState } from 'react'
import Link from 'next/link'

const inputClass = "w-full px-4 py-3 border border-cream-300 bg-cream-50 font-sans text-sm text-bark-600 placeholder:text-bark-400/40 focus:outline-none focus:border-bark-400 transition-colors"

const BLANK_FORM = {
  businessName: '',
  businessType: '',
  ein: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  website: '',
  expectedVolume: '',
  storefrontStreet: '',
  storefrontCity: '',
  storefrontState: '',
  storefrontZip: '',
  resaleCertUrl: '',
  notes: '',
}

export default function WholesaleApplyPage() {
  const [form, setForm] = useState(BLANK_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function field<K extends keyof typeof BLANK_FORM>(k: K) {
    return {
      value: form[k],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setForm(f => ({ ...f, [k]: e.target.value })),
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/wholesale/apply', {
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
          We&rsquo;ll review your wholesale application within 3–5 business days. When approved, sign in to your dashboard at the email you provided.
        </p>
        <Link href="/" className="font-sans text-xs tracking-[0.2em] uppercase text-bark-600 underline">Back to home</Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <div className="text-center mb-10">
        <p className="font-sans text-[10px] tracking-[0.35em] uppercase text-gold-400 mb-3">Wholesale</p>
        <h1 className="font-serif text-4xl text-bark-600">Apply for an Account</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <label className="block font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-2">Business Name</label>
            <input required {...field('businessName')} className={inputClass} />
          </div>
          <div>
            <label className="block font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-2">Business Type</label>
            <select {...field('businessType')} className={inputClass}>
              <option value="">Select…</option>
              <option value="boutique">Boutique / Retail</option>
              <option value="online_only">Online Only</option>
              <option value="hotel_spa">Hotel / Spa</option>
              <option value="hospital">Hospital / Birth Center</option>
              <option value="corporate_gifting">Corporate Gifting</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-2">EIN / Tax ID</label>
            <input {...field('ein')} placeholder="XX-XXXXXXX" className={inputClass} />
          </div>
          <div>
            <label className="block font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-2">Website</label>
            <input type="url" {...field('website')} placeholder="https://" className={inputClass} />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <label className="block font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-2">Contact Name</label>
            <input required {...field('contactName')} className={inputClass} />
          </div>
          <div>
            <label className="block font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-2">Contact Email</label>
            <input required type="email" {...field('contactEmail')} className={inputClass} />
          </div>
          <div>
            <label className="block font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-2">Phone</label>
            <input type="tel" {...field('contactPhone')} className={inputClass} />
          </div>
          <div>
            <label className="block font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-2">Expected Monthly Volume ($)</label>
            <input type="number" {...field('expectedVolume')} placeholder="2000" className={inputClass} />
          </div>
        </div>

        <div>
          <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-3">Storefront Address</p>
          <div className="space-y-3">
            <input {...field('storefrontStreet')} placeholder="Street address" className={inputClass} />
            <div className="grid grid-cols-3 gap-3">
              <input {...field('storefrontCity')} placeholder="City" className={inputClass} />
              <input {...field('storefrontState')} placeholder="State" className={inputClass} />
              <input {...field('storefrontZip')} placeholder="ZIP" className={inputClass} />
            </div>
          </div>
        </div>

        <div>
          <label className="block font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-2">Resale Certificate URL</label>
          <input type="url" {...field('resaleCertUrl')} placeholder="Link to your reseller permit (Google Drive, Dropbox, etc.)" className={inputClass} />
        </div>

        <div>
          <label className="block font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-2">Tell us about your business</label>
          <textarea rows={4} {...field('notes')} className={inputClass} />
        </div>

        {error && <p className="font-sans text-xs text-red-500">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full bg-bark-600 text-cream-50 font-sans text-[11px] tracking-[0.2em] uppercase py-4 hover:bg-bark-700 transition-colors disabled:opacity-40">
          {loading ? 'Submitting…' : 'Submit Application'}
        </button>
      </form>
    </div>
  )
}
