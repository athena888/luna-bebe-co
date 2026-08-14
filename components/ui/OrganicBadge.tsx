'use client'

import Link from 'next/link'
import { useIsEs } from '@/lib/use-is-es'

// Trust badge — "certificado" carries the message, GOTS is the visible mark
// (never the opening claim). Links to the plain-language cotton page.
// NOTE: this is a text mark, not the official GOTS logo — the real logo
// requires a licence from Global Standard gGmbH.
export function OrganicBadge({ className = '' }: { className?: string }) {
  const isEs = useIsEs()
  return (
    <Link
      href={isEs ? '/es/nuestro-algodon' : '/our-cotton'}
      className={`inline-flex items-center gap-2.5 border border-cream-300 bg-cream-50 px-3 py-2 hover:border-espresso-light transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-espresso ${className}`}
      title={isEs ? 'Conoce nuestro algodón' : 'About our cotton'}
    >
      <span aria-hidden="true" className="flex items-center justify-center w-7 h-7 rounded-full border border-espresso text-espresso font-sans text-[8px] font-bold tracking-wide">
        GOTS
      </span>
      <span className="font-serif text-[13px] leading-tight text-espresso">
        {isEs ? 'Algodón Orgánico Certificado' : 'Certified Organic Cotton'}
      </span>
    </Link>
  )
}
