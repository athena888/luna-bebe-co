'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/Button'
import { CheckCircle, Mail } from 'lucide-react'
import { CONTACT_EMAIL } from '@/lib/site-config'

function GiftCardConfirmationInner() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const ref = sessionId ? sessionId.slice(-8).toUpperCase() : null

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream-100 py-16 px-4 sm:px-6">
        <div className="max-w-lg mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-sage-100 mb-6">
            <CheckCircle size={40} className="text-sage-500" />
          </div>

          <p className="text-xs font-sans font-semibold uppercase tracking-widest text-gold-400 mb-3">Gift Card Sent</p>
          <h1 className="font-serif text-4xl sm:text-5xl text-bark-600 mb-4">
            Your gift is on its way.
          </h1>
          <p className="font-sans text-bark-400 mb-3 leading-relaxed">
            The recipient will receive an email with their gift code shortly. They can use it to build their own Petite Lavande box.
          </p>
          {ref && (
            <p className="font-sans text-xs text-bark-400 mb-10">
              Reference: <span className="font-medium text-bark-600">#{ref}</span>
            </p>
          )}

          <div className="bg-cream-50 rounded-2xl border border-cream-200 p-6 mb-8 flex items-center gap-4 text-left">
            <div className="shrink-0 w-10 h-10 rounded-full bg-gold-100 flex items-center justify-center">
              <Mail size={18} className="text-gold-400" />
            </div>
            <p className="font-sans text-sm text-bark-400 leading-relaxed">
              Did not receive an email? Check your spam folder or contact us at {CONTACT_EMAIL}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/"><Button variant="outline" size="md">Back to Home</Button></Link>
            <Link href="/gift-cards"><Button variant="gold" size="md">Send Another Gift</Button></Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

export default function GiftCardConfirmationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream-100" />}>
      <GiftCardConfirmationInner />
    </Suspense>
  )
}
