import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SPANISH_ACTIVE } from '@/lib/i18n'

// Spanish locale gate — pages under /es/ use the SAME site chrome as English
// (each page renders the real Header/Footer itself, exactly like EN pages).
// This layout only gates the subtree behind the flag and sets metadata.

export const metadata: Metadata = {
  title: { default: 'Petite Lavande — Canastillas de Regalo Orgánicas', template: '%s | Petite Lavande' },
}

export default function EsLayout({ children }: { children: React.ReactNode }) {
  if (!SPANISH_ACTIVE) notFound()
  return <>{children}</>
}
