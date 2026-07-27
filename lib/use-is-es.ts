'use client'

import { usePathname } from 'next/navigation'

// True on any /es route. Client components use this to swap their strings —
// no prop threading, and /es/* routes can re-export the English pages
// unchanged (the pathname carries the locale).
export function useIsEs(): boolean {
  const pathname = usePathname()
  return pathname === '/es' || pathname.startsWith('/es/')
}
