'use client'
import Link from 'next/link'
import { useState } from 'react'
import { Menu, X, User, Heart } from 'lucide-react'

function MobileMenu({ onClose }: { onClose: () => void }) {
  return (
    <div className="md:hidden bg-white border-b border-cream-300 px-6 py-8 flex flex-col gap-6">
      <Link href="/build" className="text-[11px] font-sans tracking-[0.2em] uppercase text-bark-400" onClick={onClose}>Build Your Own Box</Link>
      <Link href="/boxes" className="text-[11px] font-sans tracking-[0.2em] uppercase text-bark-400" onClick={onClose}>Ready-Made Boxes</Link>
      <Link href="/gift-cards" className="text-[11px] font-sans tracking-[0.2em] uppercase text-bark-400" onClick={onClose}>Gift Cards</Link>
      <Link href="/guide" className="text-[11px] font-sans tracking-[0.2em] uppercase text-bark-400" onClick={onClose}>Gift Guide</Link>
      <Link href="/wishlist" className="text-[11px] font-sans tracking-[0.2em] uppercase text-bark-400" onClick={onClose}>Wishlist</Link>
      <Link href="/account" className="text-[11px] font-sans tracking-[0.2em] uppercase text-bark-400" onClick={onClose}>My Account</Link>
      <Link href="/social" className="text-[11px] font-sans tracking-[0.2em] uppercase text-bark-400" onClick={onClose}>Stories</Link>
    </div>
  )
}

export function Header() {
  const [open, setOpen] = useState(false)
  return (
    <header className="relative z-40 bg-white">
      {/* Nav bar */}
      <div className="border-b border-cream-300">
        <div className="relative w-full pl-4 sm:pl-9 pr-16 sm:pr-6 h-[68px] flex items-center justify-between">

          {/* Logo — left */}
          <Link href="/" className="flex flex-col leading-none shrink-0">
            <span
              className="uppercase inline-block"
              style={{
                fontFamily: 'var(--font-cormorant)',
                fontSize: 'clamp(1.45rem, 6.5vw, 2.1rem)',
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
          <nav className="hidden md:flex flex-1 items-center justify-center gap-5 lg:gap-7 px-4">
            <Link href="/build" className="text-[11px] font-sans tracking-[0.2em] uppercase text-bark-400 hover:text-bark-600 transition-colors whitespace-nowrap">Build Your Own Box</Link>
            <Link href="/boxes" className="text-[11px] font-sans tracking-[0.2em] uppercase text-bark-400 hover:text-bark-600 transition-colors whitespace-nowrap">Ready-Made</Link>
            <Link href="/gift-cards" className="text-[11px] font-sans tracking-[0.2em] uppercase text-bark-400 hover:text-bark-600 transition-colors whitespace-nowrap">Gift Cards</Link>
            <Link href="/guide" className="text-[11px] font-sans tracking-[0.2em] uppercase text-bark-400 hover:text-bark-600 transition-colors whitespace-nowrap">Gift Guide</Link>
            <Link href="/social" className="text-[11px] font-sans tracking-[0.2em] uppercase text-bark-400 hover:text-bark-600 transition-colors">Stories</Link>
          </nav>

          {/* Right slot */}
          <div className="flex items-center gap-1.5 md:gap-0.5 justify-self-end">
            <Link href="/wishlist" className="hidden md:flex p-2.5 text-bark-400 hover:text-bark-600 transition-colors" title="Wishlist">
              <Heart size={16} />
            </Link>
            <Link href="/account" className="hidden md:flex p-2.5 text-bark-400 hover:text-bark-600 transition-colors" title="My Account">
              <User size={16} />
            </Link>
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

      {/* Announcement bar */}
      <div className="bg-terra-100 border-b border-cream-300 text-bark-600 font-sans text-[10px] tracking-[0.3em] uppercase text-center py-2.5 px-4">
        Free shipping on orders over $150 · Handcrafted with care
      </div>

      {/* Mobile menu */}
      {open && (
        <MobileMenu onClose={() => setOpen(false)} />
      )}
    </header>
  )
}
