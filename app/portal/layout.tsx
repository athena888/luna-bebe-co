'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { LayoutDashboard, ShoppingBag, ImagePlus, BarChart2, Target, TrendingUp, Webhook, PackageSearch, Menu, X, Gift, ShieldCheck, LineChart, Mail, LayoutTemplate, Building2, Compass } from 'lucide-react'

const NAV = [
  { href: '/portal', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
  { href: '/portal/cockpit', label: 'Daily Cockpit', icon: <Compass size={16} /> },
  { href: '/portal/orders', label: 'Orders', icon: <ShoppingBag size={16} /> },
  { href: '/portal/outreach', label: 'Outreach', icon: <Building2 size={16} /> },
  { href: '/portal/content', label: 'Pages & Content', icon: <LayoutTemplate size={16} /> },
  { href: '/portal/products', label: 'Products', icon: <ImagePlus size={16} /> },
  { href: '/portal/boxes', label: 'Prebuilt Boxes', icon: <Gift size={16} /> },
  { href: '/portal/card-styles', label: 'Card Styles', icon: <Mail size={16} /> },
  { href: '/portal/cert-icons', label: 'Cert Library', icon: <ShieldCheck size={16} /> },
  { href: '/portal/inventory', label: 'Inventory', icon: <PackageSearch size={16} /> },
  { href: '/portal/stock-insights', label: 'Stock Insights', icon: <LineChart size={16} /> },
  { href: '/portal/webhooks', label: 'Webhooks', icon: <Webhook size={16} /> },
  { href: '/portal/analytics', label: 'Analytics', icon: <TrendingUp size={16} /> },
]

const ANALYTICS = [
  { href: 'https://analytics.google.com', label: 'Google Analytics', icon: <BarChart2 size={16} /> },
  { href: 'https://business.facebook.com', label: 'Meta Business', icon: <Target size={16} /> },
]

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <>
      <div className="mb-8 px-2">
        <div className="font-serif text-sm tracking-[0.2em] uppercase text-gold-300">Petite Lavande</div>
        <div className="font-sans text-[9px] uppercase tracking-[0.35em] text-gold-400/60 mt-0.5">Portal</div>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV.map(({ href, label, icon }) => {
          const contentPaths = ['/portal/home-content', '/portal/story', '/portal/social', '/portal/journal', '/portal/collections', '/portal/site-images']
          const active = pathname === href
            || (href !== '/portal' && pathname.startsWith(href))
            || (href === '/portal/content' && contentPaths.some(p => pathname.startsWith(p)))
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={`flex items-center gap-2.5 px-3 py-3 rounded-xl font-sans text-sm transition-colors ${
                active ? 'bg-bark-600/60 text-cream-100' : 'text-cream-300 hover:bg-bark-600/50 hover:text-cream-100'
              }`}
            >
              <span className="text-gold-400/70">{icon}</span>
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="mt-6 px-2">
        <p className="font-sans text-[9px] uppercase tracking-[0.25em] text-bark-400 mb-2 px-1">External</p>
        <div className="flex flex-col gap-1">
          {ANALYTICS.map(({ href, label, icon }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-3 py-3 rounded-xl font-sans text-sm text-cream-300 hover:bg-bark-600/50 hover:text-cream-100 transition-colors"
            >
              <span className="text-gold-400/70">{icon}</span>
              {label}
            </a>
          ))}
        </div>
      </div>
    </>
  )
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Anyone using the admin portal is internal — flag this browser so GA excludes it
  useEffect(() => { try { localStorage.setItem('pl_internal', '1') } catch {} }, [])

  // The login page is shown to signed-OUT users — render it bare (no portal nav
  // sidebar/header) so its own full-screen background image fills the viewport.
  if (pathname === '/portal/login') return <>{children}</>

  return (
    <div className="flex min-h-screen bg-bark-700">
      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 h-14 bg-bark-800 border-b border-bark-600/40 flex items-center justify-between px-4">
        <div className="font-serif text-sm tracking-[0.2em] uppercase text-gold-300">Petite Lavande</div>
        <button
          onClick={() => setOpen(true)}
          className="w-10 h-10 flex items-center justify-center text-cream-200"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-bark-900/60" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 max-w-[80vw] bg-bark-800 flex flex-col py-6 px-4 overflow-y-auto">
            <button
              onClick={() => setOpen(false)}
              className="self-end w-10 h-10 flex items-center justify-center text-cream-200 mb-2"
              aria-label="Close menu"
            >
              <X size={22} />
            </button>
            <NavContent onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 bg-bark-800 border-r border-bark-600/40 flex-col py-8 px-4">
        <NavContent />
        <div className="mt-auto px-2">
          <div className="text-[10px] font-sans text-bark-400 leading-relaxed">
            Petite Lavande<br />Internal Portal
          </div>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto bg-cream-100 pt-14 md:pt-0">
        {children}
      </main>
    </div>
  )
}
