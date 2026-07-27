'use client'

import { useState } from 'react'
import { useIsEs } from '@/lib/use-is-es'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Gift, Lock } from 'lucide-react'
import { SlotImage } from '@/components/ui/SlotImage'
import { SlotBackground } from '@/components/ui/SlotBackground'
import { storeCheckoutEnabled } from '@/lib/store-flags'

const AMOUNTS = [
  { value: 5000,  label: '$50',  popular: false },
  { value: 10000, label: '$100', popular: true  },
  { value: 15000, label: '$150', popular: false },
  { value: 20000, label: '$200', popular: false },
]

// Same field styling as the Track an Order / Sign In pages: serif labels,
// white inputs with a gold focus ring, olive section headings.
const inputClass = "w-full px-4 py-3 border border-cream-300 bg-white font-sans text-sm text-bark-600 placeholder:text-bark-400/40 focus:outline-none focus:border-gold-400 transition-colors"
const labelClass = "block font-serif text-lg text-espresso mb-2"
const sectionClass = "font-sans text-[12px] tracking-[0.3em] uppercase font-bold text-[#7A8E7C] mb-5 pb-3 border-b border-cream-300"

export default function GiftCardsPage() {
  const isEs = useIsEs()
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
        body: JSON.stringify({ amount, recipientEmail, recipientName, senderName, senderEmail, message, locale: isEs ? 'es' : 'en' }),
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
        <SlotBackground slotKey="giftcards.header_bg" scrim="bg-cream-50/55" className="px-6 pt-16 pb-14 sm:pt-20">
          <div className="max-w-4xl mx-auto">
            <div className="text-center">
              <p className="font-sans text-[11px] tracking-[0.3em] uppercase text-gold-400 mb-3">{isEs ? 'El regalo perfecto' : 'The Perfect Gift'}</p>
              <h1 className="font-serif text-4xl sm:text-5xl text-espresso mb-2">{isEs ? 'Tarjetas de regalo' : 'Gift Cards'}</h1>
              <p className="font-sans text-sm text-bark-500 max-w-md mx-auto leading-relaxed">
                {isEs ? '¿No te decides? Regala la posibilidad de elegir. Quien lo recibe arma su propia canastilla Petite Lavande con tu cariño.' : <>Can't decide? Give the gift of choice. Your recipient builds their own Petite Lavande box with your love.</>}
              </p>
            </div>
            {/* single divider between the intro and the form — one panel, no second band */}
            <div className="my-10 border-t border-cream-300" />
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-14">

            {/* Form */}
            <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-8">

              {/* Amount */}
              <div>
                <p className={sectionClass}>{isEs ? 'Elige un monto' : 'Choose an Amount'}</p>
                <div className="grid grid-cols-2 gap-3">
                  {AMOUNTS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAmount(opt.value)}
                      className={`relative py-5 border font-serif text-2xl transition-colors ${amount === opt.value ? 'border-gold-400 bg-[#FBF3EC] text-espresso' : 'border-cream-300 text-bark-400 hover:border-gold-300'}`}
                    >
                      {opt.label}
                      {opt.popular && (
                        <span className="absolute top-2 right-2 font-sans text-[11px] tracking-[0.15em] uppercase bg-gold-400 text-white px-1.5 py-0.5">{isEs ? 'Popular' : 'Popular'}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recipient */}
              <div>
                <p className={sectionClass}>{isEs ? 'Para' : 'Send To'}</p>
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>{isEs ? 'Nombre de quien lo recibe' : 'Recipient Name'}</label>
                    <input required type="text" value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder={isEs ? '¿Para quién es?' : 'Who is this for?'} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>{isEs ? 'Correo de quien lo recibe' : 'Recipient Email'}</label>
                    <input required type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} placeholder={isEs ? 'su@correo.com' : 'their@email.com'} className={inputClass} />
                  </div>
                </div>
              </div>

              {/* Sender */}
              <div>
                <p className={sectionClass}>{isEs ? 'De parte de' : 'From'}</p>
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>{isEs ? 'Tu nombre' : 'Your Name'}</label>
                    <input required type="text" value={senderName} onChange={e => setSenderName(e.target.value)} placeholder={isEs ? 'Tu nombre' : 'Your name'} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>{isEs ? 'Tu correo (para la confirmación)' : 'Your Email (for confirmation)'}</label>
                    <input required type="email" value={senderEmail} onChange={e => setSenderEmail(e.target.value)} placeholder={isEs ? 'tu@correo.com' : 'you@email.com'} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>{isEs ? 'Mensaje personal (opcional)' : 'Personal Message (optional)'}</label>
                    <textarea rows={3} value={message} onChange={e => setMessage(e.target.value)} placeholder={isEs ? 'Escribe una notita con cariño…' : 'Add a heartfelt note...'} className={`${inputClass} resize-none`} />
                  </div>
                </div>
              </div>

              {error && <p className="font-sans text-xs text-red-500">{error}</p>}

              {storeCheckoutEnabled() ? (
                <>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#7A8E7C] text-white font-serif text-lg tracking-[0.06em] uppercase py-3.5 hover:bg-[#6d8070] transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    <Lock size={14} />
                    {loading ? (isEs ? 'Procesando…' : 'Processing...') : (isEs ? `Comprar tarjeta de $${(amount / 100).toFixed(0)}` : `Purchase $${(amount / 100).toFixed(0)} Gift Card`)}
                  </button>
                  <p className="text-center font-sans text-[11px] text-bark-400/50">Powered by Stripe · 256-bit SSL</p>
                </>
              ) : (
                <div className="text-center border border-cream-300 bg-cream-50 py-4 px-4">
                  <p className="font-sans text-[11px] tracking-[0.1em] text-bark-500 leading-relaxed">Gift cards open soon — this page is here to preview; purchases are paused for now.</p>
                </div>
              )}
            </form>

            {/* Preview */}
            <div className="lg:col-span-2">
              <div className="sticky top-24 bg-espresso text-center overflow-hidden">
                <SlotImage slotKey="giftcard.visual" className="w-full aspect-[3/2] overflow-hidden" />
                <div className="p-8 pt-6">
                  <Gift size={32} className="text-gold-300 mx-auto mb-4" />
                <p className="font-sans text-[11px] tracking-[0.3em] uppercase text-gold-400 mb-2">Petite Lavande</p>
                <p className="font-serif text-4xl text-cream-100 mb-1">${(amount / 100).toFixed(0)}</p>
                <p className="font-sans text-sm text-cream-50 mb-6">Gift Card</p>
                {recipientName && (
                  <p className="font-sans text-xs text-cream-300 mb-1">For: <span className="text-cream-100">{recipientName}</span></p>
                )}
                {senderName && (
                  <p className="font-sans text-xs text-cream-300 mb-4">From: <span className="text-cream-100">{senderName}</span></p>
                )}
                {message && (
                  <p className="font-serif italic text-cream-300/70 text-sm leading-relaxed border-t border-bark-600 pt-4 mt-4">&ldquo;{message}&rdquo;</p>
                )}
                <div className="mt-6 pt-6 border-t border-bark-600/60">
                  <p className="font-sans text-[11px] text-cream-200/90 leading-relaxed tracking-wide">
                    Delivered instantly by email · Valid forever · Redeemable at checkout
                  </p>
                </div>
                </div>
              </div>
            </div>
            </div>
          </div>
        </SlotBackground>
      </main>
      <Footer />
    </>
  )
}
