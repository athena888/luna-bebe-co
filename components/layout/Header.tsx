'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Menu, X, User, ShoppingBag, ChevronDown } from 'lucide-react'
import { cartCount } from '@/lib/cart'
import { LogoMark } from '@/components/ui/LogoMark'

// Ready-Made editions — the label links to all boxes; the dropdown jumps to a
// specific edition section on /boxes (anchors match `edition-<slug>` there).
const READY_MADE_EDITIONS = [
  { label: 'All', href: '/boxes' },
  { label: 'Summer', href: '/boxes#edition-summer' },
  { label: 'All Season', href: '/boxes#edition-all-season' },
  { label: 'Winter', href: '/boxes#edition-winter' },
]

// Cart lives in the nav row so it scrolls with the header and aligns on every
// page. On the build page it opens the bag drawer in place; elsewhere it links
// to /build. Badge updates live via the 'pl:cart' event fired by writeCart().
function CartButton() {
  const pathname = usePathname()
  const [count, setCount] = useState(0)
  useEffect(() => {
    const update = () => setCount(cartCount())
    update()
    window.addEventListener('pl:cart', update)
    window.addEventListener('storage', update)
    window.addEventListener('focus', update)
    return () => {
      window.removeEventListener('pl:cart', update)
      window.removeEventListener('storage', update)
      window.removeEventListener('focus', update)
    }
  }, [])
  useEffect(() => { setCount(cartCount()) }, [pathname])

  return (
    <Link
      href="/build"
      onClick={e => { if (pathname?.startsWith('/build')) { e.preventDefault(); window.dispatchEvent(new Event('pl:open-bag')) } }}
      className="relative p-2.5 text-bark-500 hover:text-bark-700 transition-colors flex items-center justify-center"
      title="Your box"
      aria-label="Your box"
    >
      <ShoppingBag size={18} strokeWidth={1.5} />
      {count > 0 && (
        <span className="absolute top-0.5 right-0.5 min-w-[15px] h-[15px] px-1 bg-bark-600 text-cream-50 rounded-full text-[9px] font-sans flex items-center justify-center leading-none">{count}</span>
      )}
    </Link>
  )
}

function MobileMenu({ onClose }: { onClose: () => void }) {
  return (
    <div className="md:hidden bg-[#FEF8F4] border-b border-cream-300 px-6 py-8 flex flex-col gap-6">
      <Link href="/build" className="text-[11px] font-sans tracking-[0.2em] uppercase text-bark-400" onClick={onClose}>Build Your Own Box</Link>
      <div>
        <Link href="/boxes" className="text-[11px] font-sans tracking-[0.2em] uppercase text-bark-400" onClick={onClose}>Ready-Made Boxes</Link>
        <div className="mt-3 ml-3 flex flex-col gap-3 border-l border-cream-300 pl-4">
          {READY_MADE_EDITIONS.map(e => (
            <Link key={e.label} href={e.href} className="text-[10px] font-sans tracking-[0.2em] uppercase text-bark-300 hover:text-bark-500 transition-colors" onClick={onClose}>{e.label}</Link>
          ))}
        </div>
      </div>
      <Link href="/gift-cards" className="text-[11px] font-sans tracking-[0.2em] uppercase text-bark-400" onClick={onClose}>Gift Cards</Link>
      <Link href="/account" className="text-[11px] font-sans tracking-[0.2em] uppercase text-bark-400" onClick={onClose}>My Account</Link>
      <Link href="/story" className="text-[11px] font-sans tracking-[0.2em] uppercase text-bark-400" onClick={onClose}>Stories</Link>
    </div>
  )
}

export function Header() {
  const [open, setOpen] = useState(false)
  return (
    <header className="relative z-40 bg-[#FEF8F4]">
      {/* Nav bar */}
      <div className="border-b border-cream-300">
        <div className="relative w-full pl-4 sm:pl-9 pr-3 sm:pr-6 h-[80px] flex items-center justify-between">

          {/* Logo — seal mark + flat wordmark lockup, links home */}
          <Link href="/" className="flex items-center gap-2 sm:gap-2.5 shrink-0" aria-label="Petite Lavande — home">
            <LogoMark className="h-11 sm:h-16 w-auto shrink-0" style={{ color: '#574540' }} alt="Petite Lavande" />
            <span
              className="uppercase inline-block"
              style={{
                fontFamily: 'var(--font-cormorant)',
                fontSize: 'clamp(1.35rem, 6vw, 2.1rem)',
                fontWeight: 450,
                lineHeight: 1,
                color: '#574540',
                letterSpacing: '0.168em',
                transform: 'scaleX(0.92)',
                transformOrigin: 'left center',
              }}
            >
              Petite Lavande
            </span>
          </Link>

          {/* Nav — center (flows between logo and icons, never overlaps) */}
          <nav className="hidden md:flex flex-1 items-center justify-center gap-5 lg:gap-7 px-4 font-sans text-[11px] tracking-[0.2em] text-bark-400">
            <Link href="/build" className="uppercase text-bark-400 hover:text-bark-600 transition-colors whitespace-nowrap">Build Your Own Box</Link>

            {/* Ready-Made — links to all boxes, with an edition dropdown on hover */}
            <div className="relative group">
              <Link href="/boxes" className="flex items-center gap-1 uppercase text-bark-400 hover:text-bark-600 transition-colors whitespace-nowrap">
                Ready-Made
                <ChevronDown size={12} className="text-bark-300 group-hover:text-bark-500 transition-colors" />
              </Link>
              <div className="absolute left-1/2 -translate-x-1/2 top-full pt-2 hidden group-hover:block group-focus-within:block z-50">
                <div className="bg-white border border-cream-200 shadow-xl py-1 min-w-[170px]">
                  {READY_MADE_EDITIONS.map(e => (
                    <Link key={e.label} href={e.href} className="block px-5 py-2.5 uppercase text-bark-500 hover:bg-cream-100 hover:text-bark-700 transition-colors">
                      {e.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <Link href="/gift-cards" className="uppercase text-bark-400 hover:text-bark-600 transition-colors whitespace-nowrap">Gift Cards</Link>
            <Link href="/story" className="uppercase text-bark-400 hover:text-bark-600 transition-colors whitespace-nowrap">Stories</Link>
          </nav>

          {/* Right slot */}
          <div className="flex items-center gap-1.5 md:gap-0.5 justify-self-end">
            <Link href="/account" className="hidden md:flex p-2.5 text-bark-400 hover:text-bark-600 transition-colors" title="My Account">
              <User size={16} />
            </Link>
            <CartButton />
            <button
              className="md:hidden p-2.5 text-bark-600 hover:text-bark-700 transition-colors flex items-center justify-center"
              onClick={() => setOpen(!open)}
              title={open ? 'Close menu' : 'Open menu'}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <MobileMenu onClose={() => setOpen(false)} />
      )}
    </header>
  )
}
