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
function boxItemTotal(selection: BoxSelection) { return Object.values(selection).reduce((sum, p) => sum + (p?.price ?? 0), 0) }

const inputClass = "w-full px-4 py-3 border border-cream-300 bg-cream-50 font-sans text-sm text-bark-600 placeholder:text-bark-400/40 focus:outline-none focus:border-bark-400 transition-colors"
const labelClass = "block font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-2"

export default function CheckoutPage() {
  const router = useRouter()
  const [selection, setSelection] = useState<BoxSelection | null>(null)
  const [letter, setLetter] = useState('')
  const [shippingType, setShippingType] = useState<ShippingType>('standard')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [boxImageUrl, setBoxImageUrl] = useState<string | null>(null)
  const [imageLoading, setImageLoading] = useState(false)

  const [contact, setContact] = useState({ name: '', email: '', phone: '' })
  const [address, setAddress] = useState({ line1: '', line2: '', city: '', state: '', zip: '' })

  const [promoCode, setPromoCode] = useState('')
  const [promoState, setPromoState] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle')
  const [promoId, setPromoId] = useState<string | null>(null)
  const [promoLabel, setPromoLabel] = useState('')

  interface StyleOption { style: string; label: string; url: string }
  const [styleOptions, setStyleOptions] = useState<StyleOption[]>([])
  const [stylesLoading, setStylesLoading] = useState(false)
  const [chosenStyle, setChosenStyle] = useState<StyleOption | null>(null)

  useEffect(() => {
    const storedBox = sessionStorage.getItem('pl_box_selection')
    const storedLetter = sessionStorage.getItem('pl_letter')
    if (storedBox) {
      try {
        const parsed = JSON.parse(storedBox)
        setSelection(parsed)
        generateBoxPreview(parsed)
      } catch { router.push('/build') }
    } else {
      router.push('/build')
    }
    if (storedLetter) setLetter(storedLetter)
  }, [router])

  async function generateBoxPreview(sel: BoxSelection) {
    const items = Object.values(sel).filter(Boolean)
    if (items.length === 0) return
    const itemNames = items.map(p => p!.name)
    const itemIds = items.map(p => p!.id)

    // Generate 3 style options for customer to choose
    setStylesLoading(true)
    try {
      const res = await fetch('/api/ai/box-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemNames, itemIds }),
      })
      const data = await res.json()
      if (data.options?.length) {
        setStyleOptions(data.options)
        setChosenStyle(data.options[0]) // default to first
        setBoxImageUrl(data.options[0].url)
      }
    } catch {
      // silently fail — checkout still works without image
    } finally {
      setStylesLoading(false)
      setImageLoading(false)
    }
  }

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
          shippingType,
          promoId: promoId || undefined,
          preferredAssemblyImage: chosenStyle?.url || null,
          preferredAssemblyStyle: chosenStyle?.label || null,
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

                  {/* Assembly style picker */}
                  <div className="border-b border-cream-300">
                    {stylesLoading && (
                      <div className="flex flex-col items-center justify-center gap-3 py-10 bg-cream-100">
                        <div className="w-6 h-6 border border-gold-400 border-t-transparent rounded-full animate-spin" />
                        <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400">Crafting your previews…</p>
                      </div>
                    )}
                    {!stylesLoading && styleOptions.length === 0 && (
                      <div className="aspect-square w-full bg-cream-100 relative flex flex-col items-center justify-center gap-3">
                        <div className="w-8 h-px bg-gold-400" />
                        <p className="font-script text-2xl text-bark-400">Petite Lavande</p>
                        <div className="w-8 h-px bg-gold-400" />
                      </div>
                    )}
                    {!stylesLoading && styleOptions.length > 0 && (
                      <div className="p-4">
                        <p className="font-sans text-[9px] tracking-[0.3em] uppercase text-bark-400 mb-3 text-center">Choose your assembly style</p>
                        <div className="grid grid-cols-3 gap-2">
                          {styleOptions.map(opt => (
                            <button
                              key={opt.style}
                              type="button"
                              onClick={() => { setChosenStyle(opt); setBoxImageUrl(opt.url) }}
                              className={`relative overflow-hidden transition-all ${chosenStyle?.style === opt.style ? 'ring-2 ring-bark-600' : 'ring-1 ring-cream-300 hover:ring-bark-400'}`}
                              style={{ aspectRatio: '1' }}
                            >
                              <Image src={opt.url} alt={opt.label} fill className="object-cover" unoptimized />
                              {chosenStyle?.style === opt.style && (
                                <div className="absolute inset-0 bg-bark-600/10" />
                              )}
                              <div className="absolute bottom-0 inset-x-0 bg-black/40 py-1 px-1">
                                <p className="font-sans text-[8px] text-white/90 text-center leading-tight">{opt.label}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                        <p className="font-sans text-[9px] text-bark-400/60 text-center mt-2">We'll assemble your box to match</p>
                      </div>
                    )}
                  </div>

                  {/* Items */}
                  <div className="px-6 py-5 border-b border-cream-300">
                    <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark-400 mb-4">Your Selection</p>
                    <div className="space-y-3">
                      {Object.values(selection).filter(Boolean).map(item => item && (
                        <div key={item.id} className="flex justify-between items-start">
                          <p className="font-sans text-xs text-bark-600 leading-snug pr-3">{item.name}</p>
                          <span className="font-sans text-xs text-bark-400 shrink-0">{formatPrice(item.price)}</span>
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
                        <span>Handwritten Letter</span><span>Included</span>
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
