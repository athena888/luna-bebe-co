'use client'

import { useEffect } from 'react'

// Stashes the referral code so checkout can auto-apply it. localStorage (not
// session) — a friend often scans on their phone, browses, and buys later.
export function RememberReferral({ code }: { code: string }) {
  useEffect(() => {
    try { localStorage.setItem('pl_referral_code', code) } catch { /* ignore */ }
  }, [code])
  return null
}
