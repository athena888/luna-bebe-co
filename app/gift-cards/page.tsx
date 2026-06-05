'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Gift, Lock } from 'lucide-react'
import { SlotImage } from '@/components/ui/SlotImage'

const AMOUNTS = [
  { value: 5000,  label: '$50',  popular: false },
  { value: 10000, label: '$100', popular: true  },
  { value: 15000, label: '$150', popular: false },
  { value: 20000, label: '$200', popular: false },
]

const inputClass = "w-full px-4 py-3 border border-cream-300 bg-cream-50 font-sans text-sm text-bark-600 placeholder:text-bark-400/40 focus:outline-none focus:border-bark-400 transition-colors"
const labelClass = "block font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-2"

export default function GiftCardsPage() {
  const [amount, setAmount] = useState(10000)
  const [recipientEmail, setRecipientEmail] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [senderName, setSenderName] = useState('')
  const [message, setMessage] = useState('')
  const [senderEmail, setSenderEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/gift-cards/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, recipientEmail, recipientName, senderName, senderEmail, message }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Something went wrong.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream-50">
        <div className="border-b border-cream-300 px-6 py-12 text-center">
          <p className="font-sans text-[10px] tracking-[0.35em] uppercase text-gold-400 mb-3">The Perfect Gift</p>
          <h1 className="font-serif text-4xl sm:text-5xl text-bark-600 mb-2">Gift Cards</h1>
          <p className="font-sans text-sm text-bark-400 max-w-md mx-auto leading-relaxed">
            Can't decide? Give the gift of choice. Your recipient builds their own Petite Lavande box with your love.
          </p>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-14">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-14">

            {/* Form */}
            <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-8">

              {/* Amount */}
              <div>
                <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark-400 mb-5 pb-3 border-b border-cream-300">Choose an Amount</p>
                <div className="grid grid-cols-2 gap-3">
                  {AMOUNTS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAmount(opt.value)}
                      className={`relative py-5 border font-serif text-2xl transition-colors ${amount === opt.value ? 'border-bark-600 bg-cream-100 text-bark-600' : 'border-cream-300 text-bark-400 hover:border-bark-400'}`}
                    >
                      {opt.label}
                      {opt.popular && (
                        <span className="absolute top-2 right-2 font-sans text-[9px] tracking-[0.15em] uppercase bg-gold-100 text-gold-500 px-1.5 py-0.5">Popular</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recipient */}
              <div>
                <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark-400 mb-5 pb-3 border-b border-cream-300">Send To</p>
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Recipient Name</label>
                    <input required type="text" value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="Who is this for?" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Recipient Email</label>
                    <input required type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} placeholder="their@email.com" className={inputClass} />
                  </div>
                </div>
              </div>

              {/* Sender */}
              <div>
                <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark-400 mb-5 pb-3 border-b border-cream-300">From</p>
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Your Name</label>
                    <input required type="text" value={senderName} onChange={e => setSenderName(e.target.value)} placeholder="Your name" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Your Email (for confirmation)</label>
                    <input required type="email" value={senderEmail} onChange={e => setSenderEmail(e.target.value)} placeholder="you@email.com" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Personal Message (optional)</label>
                    <textarea rows={3} value={message} onChange={e => setMessage(e.target.value)} placeholder="Add a heartfelt note..." className={`${inputClass} resize-none`} />
                  </div>
                </div>
              </div>

              {error && <p className="font-sans text-xs text-red-500">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-bark-600 text-cream-50 font-sans text-[11px] tracking-[0.2em] uppercase py-4 hover:bg-bark-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <Lock size={12} />
                {loading ? 'Processing...' : `Purchase $${(amount / 100).toFixed(0)} Gift Card`}
              </button>
              <p className="text-center font-sans text-[10px] text-bark-400/50">Powered by Stripe · 256-bit SSL</p>
            </form>

            {/* Preview */}
            <div className="lg:col-span-2">
              <div className="sticky top-24 bg-bark-700 text-center overflow-hidden">
                <SlotImage slotKey="giftcard.visual" className="w-full aspect-[3/2] overflow-hidden" />
                <div className="p-8 pt-6">
                  <Gift size={32} className="text-gold-300 mx-auto mb-4" />
                <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-gold-400 mb-2">Petite Lavande</p>
                <p className="font-serif text-4xl text-cream-100 mb-1">${(amount / 100).toFixed(0)}</p>
                <p className="font-sans text-sm text-cream-400 mb-6">Gift Card</p>
                {recipientName && (
                  <p className="font-sans text-xs text-cream-300 mb-1">For: <span className="text-cream-100">{recipientName}</span></p>
                )}
                {senderName && (
                  <p className="font-sans text-xs text-cream-300 mb-4">From: <span className="text-cream-100">{senderName}</span></p>
                )}
                {message && (
                  <p className="font-serif italic text-cream-300/70 text-sm leading-relaxed border-t border-bark-600 pt-4 mt-4">&ldquo;{message}&rdquo;</p>
                )}
                <div className="mt-6 pt-6 border-t border-bark-600">
                  <p className="font-sans text-[10px] text-cream-400/60 leading-relaxed">
                    Delivered instantly by email · Valid forever · Redeemable at checkout
                  </p>
                </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
