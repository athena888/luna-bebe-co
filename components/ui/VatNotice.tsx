'use client'

import { useState, useEffect } from 'react'
import { resolveLocale, marketFor, LOCALE_COOKIE } from '@/lib/markets'

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return m ? decodeURIComponent(m[1]) : null
}

// Required import-VAT/duties disclosure for any non-US market. Renders nothing
// for the US (USD). Resolves the market client-side after mount.
export function VatNotice({ className = '' }: { className?: string }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const loc = resolveLocale({
      host: window.location.host,
      cookie: readCookie(LOCALE_COOKIE),
      acceptLanguage: navigator.language,
    })
    if (marketFor(loc).currency !== 'USD') setShow(true)
  }, [])
  if (!show) return null
  return (
    <p className={`font-sans text-[11px] text-bark-400 leading-relaxed ${className}`}>
      International orders may be subject to import VAT, duties, and carrier fees collected from the
      recipient on delivery. These are not included in your order total.
    </p>
  )
}
