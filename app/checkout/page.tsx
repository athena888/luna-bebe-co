'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { OccasionCountdown } from '@/components/ui/OccasionCountdown'
import { Footer } from '@/components/layout/Footer'
import { VatNotice } from '@/components/ui/VatNotice'
import { SHIPPING, BOX_BASE_PRICE, freeShippingApplies, sameDayEligible } from '@/lib/products'
import { readBoxRef, clearBoxRef, type BoxRef as BoxRefType } from '@/lib/cart'
import type { BoxSelection, ShippingType } from '@/types'
import Image from 'next/image'
import Link from 'next/link'
import { storeCheckoutEnabled } from '@/lib/store-flags'
import { trackBeginCheckout } from '@/lib/analytics-events'
import { AddonRow } from '@/components/ui/AddonRow'
import { useIsEs } from '@/lib/use-is-es'

function formatPrice(cents: number) { return `$${(cents / 100).toFixed(2)}` }
function boxItemTotal(selection: BoxSelection) { return Object.values(selection).reduce((sum, p) => sum + (p?.price ?? 0) * ((p as { qty?: number })?.qty ?? 1), 0) }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
function productImage(p: { id: string; image?: string | null }): string | null {
  return p.image ?? (SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/product-images/${p.id}.jpg` : null)
}

const inputClass = "w-full px-4 py-3 border border-cream-300 bg-cream-50 font-sans text-sm text-bark-600 placeholder:text-bark-400/40 focus:outline-none focus:border-bark-400 transition-colors"
const labelClass = "block font-sans text-[11px] tracking-[0.2em] uppercase text-bark-400 mb-2"

// Garments quick-added from the homepage default to the first box size; the
// bag line lets buyers flip it — guarded against variant stock below.
const BOX_GARMENT_SIZES = ['0–3 mo', '3–6 mo']
type VariantRow = { color: string | null; size: string; quantity: number }

export default function CheckoutPage() {
  const isEs = useIsEs()
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
  const [shipToRecipient, setShipToRecipient] = useState(false)
  const [recipientEmail, setRecipientEmail] = useState('')
  const [occasionLabel, setOccasionLabel] = useState('')
  const [letterVersion, setLetterVersion] = useState<1 | 2>(1)
  const [cardStyle, setCardStyle] = useState('')
  const [letterZone, setLetterZone] = useState<{ x: number; y: number; w: number; align: string } | null>(null)
  // Unmodified prebuilt box in the bag → the whole bag sells at the box price.
  const [boxRef, setBoxRef] = useState<BoxRefType | null>(null)

  const [promoCode, setPromoCode] = useState('')
  const [promoState, setPromoState] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle')
  const [promoId, setPromoId] = useState<string | null>(null)
  const [promoLabel, setPromoLabel] = useState('')

  // Per-variant stock for the size pills on garment lines (product id → rows).
  const [variantStock, setVariantStock] = useState<Record<string, VariantRow[]>>({})
  const [sizeNote, setSizeNote] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!selection) return
    const garmentIds = Object.values(selection)
      .filter((it): it is NonNullable<typeof it> => !!it)
      .filter(it => (it as { selectedSize?: string }).selectedSize && BOX_GARMENT_SIZES.includes((it as { selectedSize?: string }).selectedSize!))
      .map(it => it.id)
    for (const id of Array.from(new Set(garmentIds))) {
      if (variantStock[id]) continue
      fetch(`/api/products/${id}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d && Array.isArray(d.variants)) setVariantStock(v => ({ ...v, [id]: d.variants }))
        })
        .catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection])

  useEffect(() => {
    const storedBox = sessionStorage.getItem('pl_box_selection')
    const storedLetter = sessionStorage.getItem('pl_letter')
    const storedRecipient = sessionStorage.getItem('pl_recipient_name')
    const storedVersion = sessionStorage.getItem('pl_letter_version')

    if (storedBox) {
      try {
        const parsed = JSON.parse(storedBox)
        setSelection(parsed)
        if (Array.isArray(parsed)) trackBeginCheckout(parsed)
      } catch { router.push('/build') }
    } else {
      router.push('/build')
    }
    setBoxRef(readBoxRef())
    if (storedLetter) setLetter(storedLetter)
    if (storedRecipient) setRecipientName(storedRecipient)
    if (storedVersion) setLetterVersion(parseInt(storedVersion) as 1 | 2)
    const storedCardStyle = sessionStorage.getItem('pl_card_style')
    if (storedCardStyle) setCardStyle(storedCardStyle)
    const storedZone = sessionStorage.getItem('pl_letter_zone')
    if (storedZone) { try { setLetterZone(JSON.parse(storedZone)) } catch { /* ignore */ } }

    // Referral redeem page stashed a code — prefill and validate it once.
    // Invalid/spent codes fall back to an empty idle input, never an error.
    const referral = localStorage.getItem('pl_referral_code')
    if (referral) {
      setPromoCode(referral)
      setPromoState('checking')
      fetch('/api/checkout/validate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: referral }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.valid) {
            setPromoId(data.promoId)
            setPromoLabel(data.discount)
            setPromoState('valid')
          } else {
            localStorage.removeItem('pl_referral_code')
            setPromoCode('')
            setPromoState('idle')
          }
        })
        .catch(() => setPromoState('idle'))
    }
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

  const itemTotal = boxRef ? boxRef.price : boxItemTotal(selection)
  const shipFree = freeShippingApplies(itemTotal + BOX_BASE_PRICE, shippingType)
  const shippingCost = shipFree ? 0 : SHIPPING[shippingType].price
  const total = itemTotal + BOX_BASE_PRICE + shippingCost

  // Bag editing — quantity steppers + remove, persisted back to the session
  // so the build page and a refresh both see the same bag.
  type CartItem = NonNullable<BoxSelection['swaddle']> & { qty?: number; selectedColor?: string; selectedSize?: string }
  const entries = Object.entries(selection).filter(([, v]) => v) as Array<[string, CartItem]>

  function updateSelection(next: BoxSelection) {
    setSelection(next)
    sessionStorage.setItem('pl_box_selection', JSON.stringify(next))
  }
  // Editing quantities or removing pieces makes the bag CUSTOM — box pricing
  // no longer applies and every line reverts to its own price. (Choosing a
  // size does not: sizes are part of the box offer.)
  function dropBoxPricing() {
    if (!boxRef) return
    clearBoxRef()
    setBoxRef(null)
  }
  function setQty(key: string, qty: number) {
    const item = (selection as unknown as Record<string, CartItem | null>)[key]
    if (!item || qty < 1) return
    dropBoxPricing()
    updateSelection({ ...(selection as object), [key]: { ...item, qty } } as unknown as BoxSelection)
  }
  function removeItem(key: string) {
    dropBoxPricing()
    updateSelection({ ...(selection as object), [key]: null } as unknown as BoxSelection)
  }
  // Is `size` in stock for this line? Uses the per-variant rows when the
  // product has them; products without variant rows stay permissive.
  function sizeAvailability(item: CartItem, size: string): { ok: boolean; msg?: string } {
    const variants = variantStock[item.id]
    if (!variants || variants.length === 0) return { ok: true }
    const rows = variants.filter(v => v.size === size && (!item.selectedColor || !v.color || v.color.toLowerCase() === item.selectedColor!.toLowerCase()))
    if (rows.length === 0) return { ok: false, msg: `${size} is unavailable` }
    const q = rows.reduce((s, v) => s + (v.quantity ?? 0), 0)
    if (q <= 0) return { ok: false, msg: `${size} is sold out` }
    if (q < (item.qty ?? 1)) return { ok: false, msg: `Only ${q} left in ${size}` }
    return { ok: true }
  }
  function setSizeFor(key: string, size: string) {
    const item = (selection as unknown as Record<string, CartItem | null>)[key]
    if (!item) return
    const avail = sizeAvailability(item, size)
    if (!avail.ok) { setSizeNote(n => ({ ...n, [key]: avail.msg! })); return }
    setSizeNote(n => ({ ...n, [key]: '' }))
    updateSelection({ ...(selection as object), [key]: { ...item, selectedSize: size } } as unknown as BoxSelection)
  }

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
          boxRef: boxRef ? { slug: boxRef.slug, variantKey: boxRef.variantKey } : undefined,
          letterContent: letter,
          letterVersion: letter ? letterVersion : undefined,
          cardStyle: cardStyle || undefined,
          letterZone: letter && letterZone ? letterZone : undefined,
          shippingType,
          promoId: promoId || undefined,
          locale: isEs ? 'es' : 'en',
          preferredAssemblyImage: null,
          preferredAssemblyStyle: null,
          recipientName: recipientName || undefined,
          specialNote: specialNote || undefined,
          shipToRecipient,
          recipientEmail: recipientEmail.trim() || undefined,
          occasionLabel: occasionLabel.trim() || undefined,
          shippingAddress: {
            // Gift mode: the label carries the recipient's name; the buyer
            // stays on the order as customer_* via the session route.
            name: shipToRecipient && recipientName ? recipientName : contact.name,
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

        <div className="max-w-6xl mx-auto px-6 py-12 sm:py-16">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-14">

              {/* Left — shopping bag + details */}
              <div className="lg:col-span-3 space-y-10">

                {/* Shopping bag — one white card per item, qty stepper + remove */}
                <div>
                  <h1 className="font-playfair text-3xl sm:text-4xl text-espresso mb-6">{isEs ? 'Tu bolsa' : 'Shopping Bag'}</h1>
                  <div className="space-y-4">
                    {entries.map(([key, item]) => {
                      const src = productImage(item)
                      const qty = item.qty ?? 1
                      return (
                        // Phones: photo + info on the top row, qty/remove on a
                        // full-width row beneath (three columns squeeze the
                        // name and distort the photo on small screens).
                        <div key={key} className="bg-white p-4 sm:p-6 flex flex-wrap sm:flex-nowrap gap-4 sm:gap-5">
                          <div className="relative w-20 sm:w-24 aspect-[3/4] shrink-0 bg-cream-100 overflow-hidden">
                            {src
                              ? <Image src={src} alt={item.name} fill className="object-cover" unoptimized sizes="96px" />
                              : <span className="absolute inset-0 flex items-center justify-center text-2xl">{item.imageEmoji}</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-sans text-[11px] tracking-[0.3em] uppercase text-bark-400 mb-1.5">Petite Lavande</p>
                            <p className="font-sans text-[15px] text-espresso leading-snug">{item.name}</p>
                            {/* Box pricing: pieces are included in the box price — no per-line price */}
                            <p className="font-sans text-sm text-bark-500 mt-1.5">{boxRef ? (isEs ? 'Incluido' : 'Included') : formatPrice(item.price)}</p>
                            {item.selectedSize && BOX_GARMENT_SIZES.includes(item.selectedSize) ? (
                              <>
                              <div className="flex items-center gap-2 mt-2">
                                {item.selectedColor && <span className="font-sans text-[12px] text-bark-400 capitalize">{item.selectedColor} ·</span>}
                                <span className="font-sans text-[11px] tracking-[0.15em] uppercase text-bark-400">Size</span>
                                <div className="flex gap-1.5">
                                  {BOX_GARMENT_SIZES.map(s => {
                                    const avail = sizeAvailability(item, s).ok
                                    return (
                                      <button key={s} type="button" onClick={() => setSizeFor(key, s)}
                                        title={avail ? undefined : 'Not available'}
                                        className={`border px-2.5 py-1 font-sans text-[11px] transition-colors ${
                                          item.selectedSize === s ? 'border-bark-600 bg-bark-600 text-cream-50'
                                          : avail ? 'border-cream-300 text-bark-600 hover:border-bark-400'
                                          : 'border-cream-200 text-bark-300 line-through cursor-not-allowed'
                                        }`}>
                                        {s}
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                              {sizeNote[key] && <p className="font-sans text-[11px] text-red-600 mt-1">{sizeNote[key]}</p>}
                              </>
                            ) : (item.selectedColor || item.selectedSize) && (
                              <p className="font-sans text-[12px] text-bark-400 mt-1 capitalize">
                                {[item.selectedColor, item.selectedSize].filter(Boolean).join(' · ')}
                              </p>
                            )}
                          </div>
                          <div className="w-full sm:w-auto flex sm:flex-col flex-row items-center sm:items-end justify-between shrink-0 gap-3 border-t border-cream-200 pt-3 sm:border-0 sm:pt-0">
                            <div className="flex items-center border border-cream-300">
                              <button type="button" onClick={() => setQty(key, qty - 1)} disabled={qty <= 1} aria-label="Decrease quantity"
                                className="w-9 h-9 flex items-center justify-center text-bark-500 hover:text-espresso disabled:opacity-30 transition-colors">−</button>
                              <span className="w-8 text-center font-sans text-sm text-espresso">{qty}</span>
                              <button type="button" onClick={() => setQty(key, qty + 1)} aria-label="Increase quantity"
                                className="w-9 h-9 flex items-center justify-center text-bark-500 hover:text-espresso transition-colors">+</button>
                            </div>
                            <button type="button" onClick={() => removeItem(key)}
                              className="font-sans text-[12px] tracking-[0.06em] text-bark-500 hover:text-espresso underline underline-offset-4 transition-colors">
                              Remove
                            </button>
                          </div>
                        </div>
                      )
                    })}
                    {entries.length === 0 && (
                      <div className="bg-white p-8 text-center">
                        <p className="font-sans text-sm text-bark-400 mb-3">Your bag is empty.</p>
                        <Link href="/build" className="font-sans text-[11px] tracking-[0.2em] uppercase text-espresso underline underline-offset-4">Build your box</Link>
                      </div>
                    )}
                    {/* Last-chance add-ons — adds into this page's own selection state */}
                    {entries.length > 0 && (
                      <div className="bg-white px-0 sm:px-2">
                        <AddonRow
                          inCartIds={entries.map(([, i]) => i.id)}
                          onAdd={p => {
                            const item = { ...p, qty: 1, lineKey: p.id }
                            const next = Array.isArray(selection)
                              ? ([...(selection as unknown as CartItem[]), item] as unknown as BoxSelection)
                              : ({ ...(selection as object), [p.id]: item } as unknown as BoxSelection)
                            updateSelection(next)
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact */}
                <div className="bg-white p-6 sm:p-7">
                  <h2 className="font-playfair text-xl text-espresso mb-6 pb-3 border-b border-cream-200">{isEs ? 'Información de contacto' : 'Contact Information'}</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className={labelClass}>{isEs ? 'Nombre completo' : 'Full Name'}</label>
                      <input required type="text" value={contact.name} onChange={e => setContact(c => ({ ...c, name: e.target.value }))} placeholder={isEs ? 'Tu nombre completo' : 'Your full name'} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>{isEs ? 'Correo electrónico' : 'Email'}</label>
                      <input required type="email" value={contact.email} onChange={e => setContact(c => ({ ...c, email: e.target.value }))} placeholder={isEs ? 'tu@correo.com' : 'you@email.com'} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>{isEs ? 'Teléfono (opcional)' : 'Phone (optional)'}</label>
                      <input type="tel" value={contact.phone} onChange={e => setContact(c => ({ ...c, phone: e.target.value }))} placeholder="+1 (555) 000-0000" className={inputClass} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass}>{isEs ? 'Nombre de quien lo recibe (opcional)' : 'Gift Recipient Name (optional)'}</label>
                      <input type="text" value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder={isEs ? '¿Para quién es el regalo?' : 'Who is this gift for?'} className={inputClass} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass}>{isEs ? 'Notas o pedidos especiales (opcional)' : 'Special requests / notes (optional)'}</label>
                      <textarea value={specialNote} onChange={e => setSpecialNote(e.target.value)} rows={3} placeholder={isEs ? 'Alergias, tiempos de entrega, mensaje del regalo, lo que debamos saber…' : 'Allergies, delivery timing, gift message, anything we should know…'} className={inputClass + ' resize-none'} />
                    </div>
                  </div>
                </div>

                {/* Shipping address */}
                <div className="bg-white p-6 sm:p-7">
                  <h2 className="font-playfair text-xl text-espresso mb-2 pb-3 border-b border-cream-200">
                    {shipToRecipient ? (isEs ? 'Dirección de envío de quien lo recibe' : 'Recipient’s Shipping Address') : (isEs ? 'Dirección de envío' : 'Shipping Address')}
                  </h2>
                  <label className="flex items-start gap-2.5 cursor-pointer py-3 mb-3">
                    <input
                      type="checkbox"
                      checked={shipToRecipient}
                      onChange={e => setShipToRecipient(e.target.checked)}
                      className="accent-gold-500 w-4 h-4 mt-0.5"
                    />
                    <span className="font-sans text-sm text-bark-600">
                      {isEs ? '🎁 Es un regalo — enviar directamente a quien lo recibe' : '🎁 This is a gift — ship directly to the recipient'}
                      <span className="block font-sans text-xs text-bark-400 mt-0.5">
                        {isEs ? 'Escribe su dirección abajo. Los recibos y confirmaciones te llegan a ti, y la canastilla no lleva precios.' : 'Enter their address below. Receipts and confirmations still go to you, and no prices appear in the box.'}
                      </span>
                    </span>
                  </label>
                  {shipToRecipient && (
                    <div className="mb-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-1.5">
                        <div>
                          <label className={labelClass}>{isEs ? 'Correo de quien lo recibe (opcional)' : <>Recipient&rsquo;s Email (optional)</>}</label>
                          <input type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} placeholder="sarah@example.com" className={inputClass} />
                        </div>
                        <div>
                          <label className={labelClass}>{isEs ? 'Ocasión (opcional)' : 'Occasion (optional)'}</label>
                          <input type="text" value={occasionLabel} onChange={e => setOccasionLabel(e.target.value)} placeholder={isEs ? 'Baby shower — para Sarah' : 'Baby shower — for Sarah'} className={inputClass} />
                        </div>
                      </div>
                      <p className="font-sans text-xs text-bark-400">{isEs ? 'Le enviaremos por correo una copia digital de tu nota cuando la canastilla salga — nada más, nunca, a menos que se suscriban.' : <>We&rsquo;ll email them a digital copy of your gift note when the box ships — nothing else, ever, unless they subscribe themselves.</>}</p>
                    </div>
                  )}
                  {shipToRecipient && !recipientName.trim() && (
                    <p className="font-sans text-xs text-rose-400 mb-3">Add the recipient&rsquo;s name under Contact Information so the shipping label carries it.</p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className={labelClass}>{isEs ? 'Dirección' : 'Street Address'}</label>
                      <input required type="text" value={address.line1} onChange={e => setAddress(a => ({ ...a, line1: e.target.value }))} placeholder="123 Main St" className={inputClass} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass}>{isEs ? 'Apto / Suite (opcional)' : 'Apt / Suite (optional)'}</label>
                      <input type="text" value={address.line2} onChange={e => setAddress(a => ({ ...a, line2: e.target.value }))} placeholder="Apt 4B" className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>{isEs ? 'Ciudad' : 'City'}</label>
                      <input required type="text" value={address.city} onChange={e => setAddress(a => ({ ...a, city: e.target.value }))} placeholder="New York" className={inputClass} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>{isEs ? 'Estado' : 'State'}</label>
                        <input required type="text" value={address.state} onChange={e => setAddress(a => ({ ...a, state: e.target.value }))} placeholder="NY" maxLength={2} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>{isEs ? 'Código postal' : 'ZIP'}</label>
                        <input required type="text" value={address.zip} onChange={e => setAddress(a => ({ ...a, zip: e.target.value }))} placeholder="10001" className={inputClass} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Shipping method */}
                <div className="bg-white p-6 sm:p-7">
                  <h2 className="font-playfair text-xl text-espresso mb-6 pb-3 border-b border-cream-200">{isEs ? 'Método de envío' : 'Shipping Method'}</h2>
                  <OccasionCountdown />
                  <div className="mb-4" />
                  <div className="space-y-3">
                    {(Object.entries(SHIPPING) as [ShippingType, typeof SHIPPING[ShippingType]][])
                      .filter(([key]) => key !== 'sameday' || sameDayEligible(address.zip))
                      .map(([key, option]) => (
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
                            <p className="font-sans text-sm text-bark-600">
                              {freeShippingApplies(itemTotal + BOX_BASE_PRICE, key) ? (isEs ? 'Gratis' : 'Free') : formatPrice(option.price)}
                            </p>
                            {'badge' in option && option.badge && (
                              <span className="font-sans text-[11px] tracking-wide uppercase text-gold-400">{option.badge}</span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right — order summary card */}
              <div className="lg:col-span-2">
                <div className="sticky top-24 bg-white rounded-xl shadow-sm p-6 sm:p-7">
                  <h2 className="font-playfair text-2xl text-espresso mb-6">{isEs ? 'Resumen del pedido' : 'Order Summary'}</h2>

                  <div className="space-y-3 font-sans text-sm">
                    <div className="flex justify-between">
                      <span className="text-bark-600">{boxRef ? boxRef.name : 'Subtotal'}</span>
                      <span className="text-espresso">{formatPrice(itemTotal)}</span>
                    </div>
                    {BOX_BASE_PRICE > 0 && (
                      <div className="flex justify-between">
                        <span className="text-bark-600">Keepsake Box, Ribbon &amp; Card</span>
                        <span className="text-espresso">{formatPrice(BOX_BASE_PRICE)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-bark-600">Shipping · {SHIPPING[shippingType].label}</span>
                      <span className="text-espresso">{shipFree ? (isEs ? 'Gratis' : 'Free') : formatPrice(shippingCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-bark-600">Taxes (estimated)</span>
                      <span className="text-bark-400">Calculated at payment</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-baseline border-t border-cream-300 mt-5 pt-5">
                    <span className="font-playfair text-lg text-espresso">{isEs ? 'Total del pedido' : 'Order Total'}</span>
                    <span className="font-playfair text-lg text-espresso">{formatPrice(total)}</span>
                  </div>
                  <VatNotice className="mt-3" />

                  {/* Promo code */}
                  <div className="mt-6">
                <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoCode}
                        onChange={e => { setPromoCode(e.target.value); setPromoState('idle') }}
                        placeholder={isEs ? 'Código de descuento' : 'Discount code'}
                        className={`flex-1 min-w-0 px-3 py-2.5 border font-sans text-sm text-bark-600 placeholder:text-bark-400/50 focus:outline-none transition-colors ${promoState === 'valid' ? 'border-sage-400 bg-sage-50' : promoState === 'invalid' ? 'border-red-300' : 'border-cream-300 bg-cream-50'}`}
                      />
                      <button
                        type="button"
                        onClick={applyPromo}
                        disabled={!promoCode.trim() || promoState === 'checking'}
                        className="px-4 py-2.5 bg-cream-200 text-bark-600 font-sans text-[11px] tracking-[0.12em] uppercase hover:bg-cream-300 transition-colors disabled:opacity-40"
                      >
                        {promoState === 'checking' ? '…' : (isEs ? 'Aplicar' : 'Apply')}
                      </button>
                    </div>
                    {promoState === 'valid' && (
                      <p className="font-sans text-[11px] text-sage-600 mt-1.5">✓ {promoLabel} {isEs ? 'aplicado — el descuento se ve al pagar' : 'applied — discount shown at payment'}</p>
                    )}
                    {promoState === 'invalid' && (
                      <p className="font-sans text-[11px] text-red-500 mt-1.5">{isEs ? 'Código inválido o vencido' : 'Invalid or expired code'}</p>
                    )}
                  </div>

                  {/* Checkout button — hidden while the shop is paused (page stays viewable) */}
                  <div className="mt-6">
                    {error && <p className="font-sans text-xs text-red-500 mb-4">{error}</p>}
                    {storeCheckoutEnabled() ? (
                      <>
                        <button
                          type="submit"
                          disabled={isSubmitting || entries.length === 0}
                          className="w-full bg-[#7A8E7C] text-white font-sans text-[13px] tracking-[0.2em] uppercase py-4 hover:bg-[#6d8070] transition-colors disabled:opacity-40"
                        >
                          {isSubmitting ? (isEs ? 'Procesando…' : 'Processing…') : (isEs ? 'Finalizar compra' : 'Checkout')}
                        </button>
                        <p className="text-center font-sans text-[11px] text-bark-500 mt-3">
                          {isEs ? <>Al hacer tu pedido aceptas nuestros <Link href="/legal/terms" className="underline underline-offset-2 hover:text-espresso">Términos y condiciones</Link>.</> : <>By placing this order, you agree to our <Link href="/legal/terms" className="underline underline-offset-2 hover:text-espresso">Terms &amp; Conditions</Link>.</>}
                        </p>
                        <p className="text-center font-sans text-[11px] text-bark-400/60 mt-1.5">{isEs ? 'Pago seguro con Stripe' : 'Secure payment powered by Stripe'}</p>
                      </>
                    ) : (
                      <div className="text-center border border-cream-300 bg-cream-50 py-4 px-4">
                        <p className="font-sans text-[11px] tracking-[0.1em] text-bark-500 leading-relaxed">{isEs ? 'Muy pronto abrimos — puedes armar y ver tu canastilla, pero las compras están en pausa por ahora.' : 'Checkout opens soon — you can build and preview, but purchases are paused for now.'}</p>
                      </div>
                    )}
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
