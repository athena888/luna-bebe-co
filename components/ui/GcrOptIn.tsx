'use client'

import { useEffect, useRef } from 'react'
import Script from 'next/script'

// Google Customer Reviews survey opt-in — confirmation page only, after a paid
// Stripe session. Renders Google's small "mind rating us?" prompt; the review
// email comes from Google later. Hard requirements honored here:
//  - at most ONE render per page load (ref guard)
//  - only when order data exists (parent gates on that)
//  - fails silently if gapi is blocked (ad blockers) — the success page must
//    never break because of it. No `products` field (no GTINs).
const MERCHANT_ID = 5829406914

interface GapiSurveyOptin {
  load: (lib: string, cb: () => void) => void
  surveyoptin: { render: (opts: Record<string, unknown>) => void }
}

export function GcrOptIn({ orderId, email, orderDateIso }: { orderId: string; email: string; orderDateIso?: string | null }) {
  const rendered = useRef(false)

  function tryRender() {
    if (rendered.current || !orderId || !email) return
    const gapi = (window as unknown as { gapi?: GapiSurveyOptin }).gapi
    if (!gapi?.load) return
    rendered.current = true
    try {
      gapi.load('surveyoptin', () => {
        try {
          const base = orderDateIso ? new Date(orderDateIso) : new Date()
          const eta = new Date(base.getTime() + 7 * 24 * 60 * 60 * 1000)
          gapi.surveyoptin.render({
            merchant_id: MERCHANT_ID,
            order_id: orderId,
            email,
            delivery_country: 'US',
            estimated_delivery_date: eta.toISOString().slice(0, 10),
          })
        } catch { /* silent */ }
      })
    } catch { /* silent */ }
  }

  // Covers the script-already-loaded case (client-side nav back to the page).
  useEffect(() => { tryRender() }, [orderId, email]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Script
      src="https://apis.google.com/js/platform.js"
      strategy="afterInteractive"
      onLoad={tryRender}
      onError={() => { /* blocked — silently skip */ }}
    />
  )
}
