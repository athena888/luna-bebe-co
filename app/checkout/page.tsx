'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { SHIPPING, BOX_BASE_PRICE } from '@/lib/products'
import type { BoxSelection, ShippingType } from '@/types'
import { Lock } from 'lucide-react'
import Image from 'next/image'

function formatPrice(cents: number) { return `$${(cents / 100).toFixed(2)}` }
function boxItemTotal(selection: BoxSelection) { return Object.values(selection).reduce((sum, p) => sum + (p?.price ?? 0) * ((p as { qty?: number })?.qty ?? 1), 0) }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
function productImage(p: { id: string; image?: string | null }): string | null {
  return p.image ?? (SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/product-images/${p.id}.jpg` : null)
}

const inputClass = "w-full px-4 py-3 border border-cream-300 bg-cream-50 font-sans text-sm text-bark-600 placeholder:text-bark-400/40 focus:outline-none focus:border-bark-400 transition-colors"
const labelClass = "block font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-2"

export default function CheckoutPage() {
  const router = useRouter()
  const [selection, setSelection] = useState<BoxSelection | null>(null)
  const [letter, setLetter] = useState('')
  const [shippingType, setShippingType] = useState<ShippingType>('standard')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [contact, setContact] = useState({ name: '', email: '', phone: '' })
  const [address, setAddress] = useState({ line1: '', line2: '', city: '', state: '', zip: '' })
  const [recipientName, setRecipientName] = useState('')
  const [specialNote, setSpecialNote] = useState('')
  const [letterVersion, setLetterVersion] = useState<1 | 2>(1)
  const [cardStyle, setCardStyle] = useState('')

  const [promoCode, setPromoCode] = useState('')
  const [promoState, setPromoState] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle')
  const [promoId, setPromoId] = useState<string | null>(null)
  const [promoLabel, setPromoLabel] = useState('')

  useEffect(() => {
    const storedBox = sessionStorage.getItem('pl_box_selection')
    const storedLetter = sessionStorage.getItem('pl_letter')
    const storedRecipient = sessionStorage.getItem('pl_recipient_name')
    const storedVersion = sessionStorage.getItem('pl_letter_version')

    if (storedBox) {
      try {
        const parsed = JSON.parse(storedBox)
        setSelection(parsed)
      } catch { router.push('/build') }
    } else {
      router.push('/build')
    }
    if (storedLetter) setLetter(storedLetter)
    if (storedRecipient) setRecipientName(storedRecipient)
    if (storedVersion) setLetterVersion(parseInt(storedVersion) as 1 | 2)
    const storedCardStyle = sessionStorage.getItem('pl_card_style')
    if (storedCardStyle) setCardStyle(storedCardStyle)
  }, [router])

  async function applyPromo() {
    if (!promoCode.trim()) return
    setPromoState('checking')
    try {
      const res = await fetch('/api/checkout/validate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode }),
      })
      const data = await res.json()
      if (data.valid) {
        setPromoId(data.promoId)
        setPromoLabel(data.discount)
        setPromoState('valid')
      } else {
        setPromoId(null)
        setPromoLabel('')
        setPromoState('invalid')
      }
    } catch {
      setPromoState('invalid')
    }
  }

  if (!selection) return null

  const itemTotal = boxItemTotal(selection)
  const shippingCost = SHIPPING[shippingType].price
  const total = itemTotal + BOX_BASE_PRICE + shippingCost

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const selectedItems = Object.values(selection!).filter(Boolean)
      // Read first-touch UTM attribution stored at landing
      let utm: Record<string, string | null> = {}
      try {
        const raw = sessionStorage.getItem('pl_utm')
        if (raw) utm = JSON.parse(raw)
      } catch { /* ignore */ }

      const res = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedItems,
          letterContent: letter,
          letterVersion: letter ? letterVersion : undefined,
          cardStyle: cardStyle || undefined,
          shippingType,
          promoId: promoId || undefined,
          preferredAssemblyImage: null,
          preferredAssemblyStyle: null,
          recipientName: recipientName || undefined,
          specialNote: specialNote || undefined,
          shippingAddress: {
            name: contact.name,
            email: contact.email,
            phone: contact.phone,
            line1: address.line1,
            line2: address.line2,
            city: address.city,
            state: address.state,
            zip: address.zip,
          },

          totalAmount: total,
          utmSource:   utm.source   || null,
          utmMedium:   utm.medium   || null,
          utmCampaign: utm.campaign || null,
          utmContent:  utm.content  || null,
        }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Something went wrong. Please try again.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream-50">

        {/* Header */}
        <div className="border-b border-cream-300 px-6 py-12 text-center bg-cream-50">
          <p className="font-sans text-[10px] tracking-[0.35em] uppercase text-gold-400 mb-3">Almost There</p>
          <h1 className="font-serif text-4xl sm:text-5xl text-bark-600 mb-2">Checkout</h1>
          <p className="font-sans text-xs text-bark-400 tracking-wide">Secure checkout powered by Stripe.</p>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-14">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-14">

              {/* Left — form */}
              <div className="lg:col-span-3 space-y-10">

                {/* Contact */}
                <div>
                  <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark-400 mb-6 pb-3 border-b border-cream-300">Contact Information</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className={labelClass}>Full Name</label>
                      <input required type="text" value={contact.name} onChange={e => setContact(c => ({ ...c, name: e.target.value }))} placeholder="Your full name" className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Email</label>
                      <input required type="email" value={contact.email} onChange={e => setContact(c => ({ ...c, email: e.target.value }))} placeholder="you@email.com" className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Phone (optional)</label>
                      <input type="tel" value={contact.phone} onChange={e => setContact(c => ({ ...c, phone: e.target.value }))} placeholder="+1 (555) 000-0000" className={inputClass} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass}>Gift Recipient Name (optional)</label>
                      <input type="text" value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="Who is this gift for?" className={inputClass} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass}>Special requests / notes (optional)</label>
                      <textarea value={specialNote} onChange={e => setSpecialNote(e.target.value)} rows={3} placeholder="Allergies, delivery timing, gift message, anything we should know…" className={inputClass + ' resize-none'} />
                    </div>
                  </div>
                </div>

                {/* Shipping address */}
                <div>
                  <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark-400 mb-6 pb-3 border-b border-cream-300">Shipping Address</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className={labelClass}>Street Address</label>
                      <input required type="text" value={address.line1} onChange={e => setAddress(a => ({ ...a, line1: e.target.value }))} placeholder="123 Main St" className={inputClass} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass}>Apt / Suite (optional)</label>
                      <input type="text" value={address.line2} onChange={e => setAddress(a => ({ ...a, line2: e.target.value }))} placeholder="Apt 4B" className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>City</label>
                      <input required type="text" value={address.city} onChange={e => setAddress(a => ({ ...a, city: e.target.value }))} placeholder="New York" className={inputClass} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>State</label>
                        <input required type="text" value={address.state} onChange={e => setAddress(a => ({ ...a, state: e.target.value }))} placeholder="NY" maxLength={2} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>ZIP</label>
                        <input required type="text" value={address.zip} onChange={e => setAddress(a => ({ ...a, zip: e.target.value }))} placeholder="10001" className={inputClass} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Shipping method */}
                <div>
                  <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark-400 mb-6 pb-3 border-b border-cream-300">Shipping Method</p>
                  <div className="space-y-3">
                    {(Object.entries(SHIPPING) as [ShippingType, typeof SHIPPING[ShippingType]][]).map(([key, option]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setShippingType(key)}
                        className={`w-full text-left px-5 py-4 border transition-colors ${shippingType === key ? 'border-bark-600 bg-cream-100' : 'border-cream-300 hover:border-bark-400'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-sans text-sm text-bark-600">{option.label}</p>
                            <p className="font-sans text-xs text-bark-400 mt-0.5">{option.days}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-sans text-sm text-bark-600">{formatPrice(option.price)}</p>
                            {'badge' in option && option.badge && (
                              <span className="font-sans text-[10px] tracking-wide uppercase text-gold-400">{option.badge}</span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right — order summary */}
              <div className="lg:col-span-2">
                <div className="sticky top-24 border border-cream-300">

                  {/* Box contents preview — real product photos */}
                  <div className="border-b border-cream-300 p-4">
                    {(() => {
                      const items = Object.values(selection).filter(Boolean) as Array<NonNullable<typeof selection.swaddle>>
                      if (items.length === 0) {
                        return (
                          <div className="aspect-square w-full bg-cream-100 relative flex flex-col items-center justify-center gap-3 rounded-lg">
                            <div className="w-8 h-px bg-gold-400" />
                            <p className="font-script text-2xl text-bark-400">Petite Lavande</p>
                            <div className="w-8 h-px bg-gold-400" />
                          </div>
                        )
                      }
                      return (
                        <>
                          <p className="font-sans text-[9px] tracking-[0.3em] uppercase text-bark-400 mb-3 text-center">Inside your box</p>
                          <div className="grid grid-cols-3 gap-2">
                            {items.map((item, idx) => {
                              const src = productImage(item)
                              return (
                                <div key={`${item.id}-${idx}`} className="relative aspect-square overflow-hidden rounded-md bg-cream-100 border border-cream-200">
                                  {src
                                    ? <Image src={src} alt={item.name} fill className="object-cover" unoptimized sizes="120px" />
                                    : <span className="absolute inset-0 flex items-center justify-center text-2xl">{item.imageEmoji}</span>}
                                </div>
                              )
                            })}
                          </div>
                          <p className="font-sans text-[9px] text-bark-400/60 text-center mt-2">Hand-assembled, wrapped &amp; wax-sealed before it ships</p>
                        </>
                      )
                    })()}
                  </div>

                  {/* Items */}
                  <div className="px-6 py-5 border-b border-cream-300">
                    <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark-400 mb-4">Your Selection</p>
                    <div className="space-y-3">
                      {(Object.values(selection).filter(Boolean) as Array<NonNullable<typeof selection.swaddle> & { selectedColor?: string; selectedSize?: string; qty?: number }>).map((item, idx) => item && (
                        <div key={`${item.id}-${idx}`} className="flex justify-between items-start">
                          <p className="font-sans text-xs text-bark-600 leading-snug pr-3">
                            {item.name}{(item.qty ?? 1) > 1 && <span className="text-bark-400"> × {item.qty}</span>}
                            {item.selectedColor && item.selectedSize && (
                              <span className="block text-[10px] text-bark-400 capitalize">{item.selectedColor} · {item.selectedSize}</span>
                            )}
                          </p>
                          <span className="font-sans text-xs text-bark-400 shrink-0">{formatPrice(item.price * (item.qty ?? 1))}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="px-6 py-5 border-b border-cream-300 space-y-2">
                    <div className="flex justify-between font-sans text-xs text-bark-400">
                      <span>Box & Experience</span><span>{formatPrice(BOX_BASE_PRICE)}</span>
                    </div>
                    <div className="flex justify-between font-sans text-xs text-bark-400">
                      <span>{SHIPPING[shippingType].label}</span><span>{formatPrice(shippingCost)}</span>
                    </div>
                    {letter && (
                      <div className="flex justify-between font-sans text-xs text-bark-400">
                        <span>{cardStyle ? `Card — ${cardStyle}` : 'Personalized Card'}</span><span>Included</span>
                      </div>
                    )}
                    <div className="flex justify-between font-sans text-sm text-bark-600 pt-2 border-t border-cream-200">
                      <span>Total</span><span>{formatPrice(total)}</span>
                    </div>
                  </div>

                  {/* Promo code */}
                  <div className="px-6 py-4 border-b border-cream-300">
                    <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-2">Promo Code</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoCode}
                        onChange={e => { setPromoCode(e.target.value); setPromoState('idle') }}
                        placeholder="WELCOME10"
                        className={`flex-1 px-3 py-2 border font-sans text-sm text-bark-600 placeholder:text-bark-400/40 focus:outline-none transition-colors ${promoState === 'valid' ? 'border-sage-400 bg-sage-50' : promoState === 'invalid' ? 'border-red-300' : 'border-cream-300 bg-cream-50'}`}
                      />
                      <button
                        type="button"
                        onClick={applyPromo}
                        disabled={!promoCode.trim() || promoState === 'checking'}
                        className="px-4 py-2 bg-bark-600 text-cream-50 font-sans text-[10px] tracking-[0.15em] uppercase hover:bg-bark-700 transition-colors disabled:opacity-40"
                      >
                        {promoState === 'checking' ? '…' : 'Apply'}
                      </button>
                    </div>
                    {promoState === 'valid' && (
                      <p className="font-sans text-[10px] text-sage-600 mt-1.5">✓ {promoLabel} applied — discount shown at payment</p>
                    )}
                    {promoState === 'invalid' && (
                      <p className="font-sans text-[10px] text-red-500 mt-1.5">Invalid or expired code</p>
                    )}
                  </div>

                  {/* Pay button */}
                  <div className="px-6 py-6">
                    {error && <p className="font-sans text-xs text-red-500 mb-4">{error}</p>}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-bark-600 text-cream-50 font-sans text-[11px] tracking-[0.2em] uppercase py-4 hover:bg-bark-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      <Lock size={12} />
                      {isSubmitting ? 'Processing...' : 'Pay Securely'}
                    </button>
                    <p className="text-center font-sans text-[10px] text-bark-400/50 mt-3">Powered by Stripe · 256-bit SSL</p>
                  </div>

                </div>
              </div>

            </div>
          </form>
        </div>
      </main>
      <Footer />
    </>
  )
}
