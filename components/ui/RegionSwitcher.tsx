'use client'

import { useState, useEffect } from 'react'
import { Globe } from 'lucide-react'
import { LOCALES, MARKETS, LOCALE_COOKIE, DEFAULT_LOCALE, isLocale, type Locale } from '@/lib/markets'

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return m ? decodeURIComponent(m[1]) : null
}

// Small region/currency selector for the footer. Writes the pl_locale cookie and
// reloads so the server re-resolves locale + currency (see lib/markets).
export function RegionSwitcher() {
  const [current, setCurrent] = useState<Locale>(DEFAULT_LOCALE)

  useEffect(() => {
    const c = readCookie(LOCALE_COOKIE)
    if (isLocale(c)) setCurrent(c)
  }, [])

  function choose(loc: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${loc}; path=/; max-age=31536000; samesite=lax`
    window.location.reload()
  }

  return (
    <label className="inline-flex items-center gap-1.5 text-bark-400">
      <Globe size={13} className="shrink-0" />
      <select
        aria-label="Region and currency"
        value={current}
        onChange={e => choose(e.target.value as Locale)}
        className="bg-transparent font-sans text-[11px] text-bark-500 focus:outline-none cursor-pointer"
      >
        {LOCALES.map(loc => (
          <option key={loc} value={loc}>
            {MARKETS[loc].label}{MARKETS[loc].enabled ? '' : ' · soon'}
          </option>
        ))}
      </select>
    </label>
  )
}
