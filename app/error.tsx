'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/Button'
import { CONTACT_EMAIL } from '@/lib/site-config'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surface the error for monitoring (replace with Sentry later)
    console.error('App error boundary:', error)
  }, [error])

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream-50 flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <p className="font-script text-8xl text-gold-200 mb-2 leading-none">Oops</p>
          <h1 className="font-serif text-3xl text-espresso mb-4">Something went wrong</h1>
          <p className="font-sans text-sm text-bark-400 mb-10 leading-relaxed">
            A little hiccup on our end. Please try again — if it keeps happening, reach us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-gold-500 underline">{CONTACT_EMAIL}</a>.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="gold" size="md" onClick={reset}>Try again</Button>
            <Link href="/"><Button variant="outline" size="md">Back to Home</Button></Link>
          </div>
          {error.digest && (
            <p className="font-sans text-[11px] text-bark-300 mt-8">Reference: {error.digest}</p>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
