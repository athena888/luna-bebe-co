'use client'

import { useEffect, useState } from 'react'

// "¿Prefieres español?" — a suggestion, never a redirect. Renders only after
// hydration (zero effect on server HTML or cached English pages), only when
// the browser prefers Spanish, only until dismissed or followed (cookie).
// Fixed-position so it can never shift the layout. Square edges.

const COOKIE = 'pl_lang_choice'

export function LanguageBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SPANISH_ACTIVE !== 'true') return
    if (document.cookie.includes(`${COOKIE}=`)) return
    const prefersEs = (navigator.languages ?? [navigator.language]).some(l => l?.toLowerCase().startsWith('es'))
    if (prefersEs) setShow(true)
  }, [])

  function remember(choice: string) {
    document.cookie = `${COOKIE}=${choice};path=/;max-age=${60 * 60 * 24 * 365}`
    setShow(false)
  }

  if (!show) return null
  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-[#7A8E7C] text-white font-sans text-[13px]">
      <div className="max-w-4xl mx-auto px-5 py-3 flex items-center justify-center gap-5 flex-wrap">
        <span>¿Prefieres español?</span>
        <a href="/es" onClick={() => remember('es')} className="underline underline-offset-2 font-semibold">Ver en español</a>
        <button onClick={() => remember('en')} className="opacity-80 hover:opacity-100" aria-label="No, gracias">
          No, gracias ✕
        </button>
      </div>
    </div>
  )
}
