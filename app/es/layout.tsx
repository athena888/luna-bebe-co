import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SPANISH_ACTIVE } from '@/lib/i18n'

// Spanish locale shell — every /es/ page is a real server-rendered URL.
// While SPANISH_ACTIVE is off (production today), the whole subtree 404s;
// preview/dev carry the flag so Emily and her reviewer can click through.
// Square edges throughout, per the standing rule.

export const metadata: Metadata = {
  title: { default: 'Petite Lavande — Canastillas de Regalo Orgánicas', template: '%s | Petite Lavande' },
}

const NAV = [
  { href: '/es', label: 'Inicio' },
  { href: '/es/colecciones/for-mama', label: 'Para Mamá' },
  { href: '/es/colecciones/for-baby', label: 'Para el Bebé' },
  { href: '/es/colecciones/baby-shower', label: 'Baby Shower' },
]

export default function EsLayout({ children }: { children: React.ReactNode }) {
  if (!SPANISH_ACTIVE) notFound()
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-cream-300 bg-cream-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-6 flex-wrap">
          <Link href="/es" className="font-playfair text-xl text-espresso">Petite Lavande</Link>
          <nav className="flex items-center gap-5 font-sans text-[12px] tracking-[0.12em] uppercase">
            {NAV.map(l => (
              <Link key={l.href} href={l.href} className="text-espresso hover:text-gold-500 transition-colors">{l.label}</Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-cream-300 bg-cream-100">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between gap-4 flex-wrap font-sans text-[12px] text-espresso">
          <span>© {new Date().getFullYear()} Petite Lavande · <Link href="/es/legal/devoluciones" className="underline underline-offset-2">Devoluciones</Link></span>
          <div className="flex border border-cream-300">
            <Link href="/" className="px-4 py-2 bg-white text-espresso hover:bg-cream-50 transition-colors">English</Link>
            <span className="px-4 py-2 bg-[#7A8E7C] text-white font-semibold">Español</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
