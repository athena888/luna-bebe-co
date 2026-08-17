'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/Button'
import { VatNotice } from '@/components/ui/VatNotice'
import { CheckCircle, Package, Pen, Truck, Phone } from 'lucide-react'
import { trackPurchase } from '@/lib/analytics-events'
import { GcrOptIn } from '@/components/ui/GcrOptIn'

const NEXT_STEPS = [
  { icon: <Package size={20} className="text-gold-400" />, title: 'Box Assembly', body: 'Our team begins handpicking and assembling your items within 24 hours of your order.' },
  { icon: <Pen size={20} className="text-gold-400" />, title: 'Your Card', body: 'Your personal message is printed on the card design you chose and tucked into the box.' },
  { icon: <Truck size={20} className="text-gold-400" />, title: 'Shipped with Care', body: 'Your box is packed with dried lavender, sealed by hand, and sent via your chosen shipping method.' },
]

function ConfirmationInner() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [orderId, setOrderId] = useState<string | null>(null)
  // Google Customer Reviews opt-in data — set only for a verified-paid session.
  const [gcr, setGcr] = useState<{ orderId: string; email: string; createdAt?: string | null } | null>(null)

  useEffect(() => {
    // Clear session storage after successful order
    sessionStorage.removeItem('pl_box_selection')
    sessionStorage.removeItem('pl_letter')
    sessionStorage.removeItem('pl_recommended')

    // NOTE: the reference shown below is the last 8 of the ORDER id, resolved
    // from the session just below. It must never be derived from the Stripe
    // session id — /track and the confirmation email both key off the order
    // id, so a session-derived code looks official but matches nothing.

    // Meta Pixel Purchase — fetch the real value/currency for this session and
    // fire once per order (a refresh re-fires, but the shared eventID lets Meta
    // dedupe against both this and the server-side CAPI purchase).
    if (!sessionId) return
    fetch(`/api/checkout/order-summary?session_id=${encodeURIComponent(sessionId)}`)
      .then(r => (r.ok ? r.json() : null))
      .then((s: { paid?: boolean; orderId?: string | null; value?: number; currency?: string; contentIds?: string[]; email?: string | null; createdAt?: string | null } | null) => {
        if (!s?.orderId) return
        // Same code the customer gets by email and types into /track.
        setOrderId(s.orderId.slice(-8).toUpperCase())
        if (!s.paid) return
        if (s.email) setGcr({ orderId: s.orderId, email: s.email, createdAt: s.createdAt })
        const flag = `pl_purchase_fired_${s.orderId}`
        try { if (sessionStorage.getItem(flag)) return } catch { /* ignore */ }
        trackPurchase({ orderId: s.orderId, value: s.value ?? 0, currency: s.currency ?? 'USD', contentIds: s.contentIds })
        try { sessionStorage.setItem(flag, '1') } catch { /* ignore */ }
      })
      .catch(() => {})
  }, [sessionId])

  return (
    <>
      {/* Google Customer Reviews survey opt-in — only once real order data exists */}
      {gcr && <GcrOptIn orderId={gcr.orderId} email={gcr.email} orderDateIso={gcr.createdAt} />}
      <Header />
      <main className="min-h-screen bg-cream-100 py-16 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-sage-100 mb-6">
            <CheckCircle size={40} className="text-sage-500" />
          </div>

          <p className="text-xs font-sans font-semibold uppercase tracking-widest text-gold-400 mb-3">Order Confirmed</p>
          <h1 className="font-serif text-4xl sm:text-5xl text-espresso mb-4">
            Your box is on its way to being <span className="font-script text-gold-400" style={{ fontSize: '1.1em' }}>unforgettable.</span>
          </h1>
          <p className="font-sans text-bark-400 mb-3 leading-relaxed">
            Thank you for your order! You&apos;ll receive a confirmation email shortly with tracking information once your box ships.
          </p>
          {orderId && (
            <p className="font-sans text-xs text-bark-400 mb-10">
              Order reference: <span className="font-medium text-bark-600">#{orderId}</span>
            </p>
          )}
          <VatNotice className="max-w-md mx-auto mb-8 -mt-4" />

          <div className="bg-cream-50 rounded-2xl border border-cream-200 p-6 sm:p-8 text-left mb-8">
            <h2 className="font-serif text-xl text-bark-600 mb-6 text-center">What Happens Next</h2>
            <div className="space-y-6">
              {NEXT_STEPS.map(({ icon, title, body }, i) => (
                <div key={title} className="flex gap-4">
                  <div className="shrink-0 w-10 h-10 rounded-full bg-gold-100 flex items-center justify-center">
                    {icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-sans text-[11px] font-semibold uppercase tracking-widest text-bark-400">Step {i + 1}</span>
                    </div>
                    <h3 className="font-serif text-lg text-bark-600 mb-1">{title}</h3>
                    <p className="font-sans text-sm text-bark-400 leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* A Note to the New Mother — the note tucked inside every box */}
          <div className="rounded-2xl border border-[#d8c7a8] bg-[#f3ecdc] p-7 sm:p-10 text-left mb-8">
            <p className="font-sans text-[11px] tracking-[0.3em] uppercase text-bark-400 mb-4 text-center">Tucked inside your box</p>
            <p className="font-serif italic text-2xl text-espresso text-center mb-6">We see you.</p>
            <div className="space-y-4 font-sans text-sm text-bark-600 leading-relaxed">
              <p>You are doing one of the hardest, most loving things a person can do. You are running on broken sleep and feeding schedules and a love so big it doesn&rsquo;t fit in your chest.</p>
              <p>You deserve warm tea. You deserve ten minutes in a bath. You deserve a few hours of dark, quiet sleep with silk against your eyes. You deserve scent and softness and the small luxury of being thought of.</p>
              <p>This box is here to remind you: <span className="font-medium">you are not invisible in your own story.</span></p>
              <p>Welcome to this new chapter. We hope it starts well.</p>
            </div>
            <p className="font-serif italic text-bark-500 mt-6">— Petite Lavande</p>
          </div>

          <div className="bg-bark-600 rounded-2xl p-6 sm:p-8 mb-8 text-left flex flex-col sm:flex-row items-center gap-4">
            <div className="shrink-0 w-12 h-12 rounded-full bg-gold-400/20 flex items-center justify-center">
              <Phone size={22} className="text-gold-300" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <p className="font-serif text-lg text-cream-100">Questions about your order?</p>
              <p className="font-sans text-sm text-cream-300/80 mt-1">Our AI phone assistant is available 24/7. Call us anytime and we&apos;ll make it right.</p>
            </div>
            <a href="tel:+18005862269" className="shrink-0">
              <Button variant="gold" size="sm">Call Us</Button>
            </a>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/"><Button variant="outline" size="md">Back to Home</Button></Link>
            <Link href="/track"><Button variant="outline" size="md">Track Order</Button></Link>
            <Link href="/build"><Button variant="gold" size="md">Build Another Box</Button></Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream-100" />}>
      <ConfirmationInner />
    </Suspense>
  )
}
