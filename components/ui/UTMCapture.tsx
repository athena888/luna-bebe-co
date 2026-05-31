'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

// Reads UTM params from landing URL and persists them in sessionStorage.
// First-touch attribution: params are only written once per session (not overwritten on later page views).
export function UTMCapture() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const source   = searchParams.get('utm_source')
    const medium   = searchParams.get('utm_medium')
    const campaign = searchParams.get('utm_campaign')
    const content  = searchParams.get('utm_content')
    const term     = searchParams.get('utm_term')

    // Only write if we have at least one UTM param and nothing stored yet
    if (source || medium || campaign) {
      const existing = sessionStorage.getItem('pl_utm')
      if (!existing) {
        sessionStorage.setItem('pl_utm', JSON.stringify({ source, medium, campaign, content, term }))
      }
    }
  }, [searchParams])

  return null
}
