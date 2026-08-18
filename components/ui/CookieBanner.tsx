'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('cookie_consent')) setVisible(true)
  }, [])

  function accept() {
    localStorage.setItem('cookie_consent', 'accepted')
    setVisible(false)
  }

  function decline() {
    localStorage.setItem('cookie_consent', 'declined')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-bark-700 border-t border-bark-600 px-6 py-4">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="font-sans text-xs text-cream-300 leading-relaxed flex-1">
          We use cookies to improve your experience and support analytics.{' '}
          <Link href="/legal/privacy" className="underline underline-offset-2 hover:text-cream-100">
            Privacy Policy
          </Link>
        </p>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={decline}
            className="font-sans text-[11px] tracking-[0.11em] uppercase text-bark-400 hover:text-cream-300 transition-colors px-4 py-2"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="font-sans text-[11px] tracking-[0.11em] uppercase bg-gold-400 text-bark-700 hover:bg-gold-300 transition-colors px-5 py-2"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
