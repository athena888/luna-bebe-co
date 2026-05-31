'use client'
import Link from 'next/link'
import { useState } from 'react'
import { Menu, X, User, Heart } from 'lucide-react'


export function Header() {
  const [open, setOpen] = useState(false)
  return (
    <header className="sticky top-0 z-50 bg-white">
      {/* Nav bar */}
      <div className="border-b border-cream-300">
        <div className="w-full pl-4 sm:pl-9 pr-2 sm:pr-6 h-[68px] grid grid-cols-[1fr_auto_1fr] items-center">

          {/* Logo — left */}
          <Link href="/" className="flex flex-col leading-none justify-self-start">
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
            <span
              className="uppercase tracking-[0.45em] font-sans"
              style={{ fontSize: '0.42rem', color: '#d4b97a', letterSpacing: '0.45em', marginTop: '3px' }}
            >
              Collective
            </span>
          </Link>

          {/* Nav — center */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/shop" className="text-[11px] font-sans tracking-[0.2em] uppercase text-bark-400 hover:text-bark-600 transition-colors">Shop</Link>
            <Link href="/boxes" className="text-[11px] font-sans tracking-[0.2em] uppercase text-bark-400 hover:text-bark-600 transition-colors">Ready-Made</Link>
            <Link href="/build" className="text-[11px] font-sans tracking-[0.2em] uppercase text-bark-400 hover:text-bark-600 transition-colors">Build a Box</Link>
            <Link href="/gift-cards" className="text-[11px] font-sans tracking-[0.2em] uppercase text-bark-400 hover:text-bark-600 transition-colors">Gift Cards</Link>
            <Link href="/guide" className="text-[11px] font-sans tracking-[0.2em] uppercase text-bark-400 hover:text-bark-600 transition-colors">Gift Guide</Link>
            <Link href="/social" className="text-[11px] font-sans tracking-[0.2em] uppercase text-bark-400 hover:text-bark-600 transition-colors">Stories</Link>
          </nav>

          {/* Right slot */}
          <div className="flex items-center gap-1 justify-self-end">
            <Link href="/wishlist" className="hidden md:flex p-2 text-bark-400 hover:text-bark-600 transition-colors" title="Wishlist">
              <Heart size={17} />
            </Link>
            <Link href="/account" className="hidden md:flex p-2 text-bark-400 hover:text-bark-600 transition-colors" title="My Account">
              <User size={17} />
            </Link>
            <button
              className="md:hidden w-10 h-10 flex items-center justify-center text-bark-600 shrink-0"
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
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
        <div className="md:hidden bg-white border-b border-cream-300 px-6 py-8 flex flex-col gap-6">
          <Link href="/shop" className="text-[11px] font-sans tracking-[0.2em] uppercase text-bark-400" onClick={() => setOpen(false)}>Shop</Link>
          <Link href="/boxes" className="text-[11px] font-sans tracking-[0.2em] uppercase text-bark-400" onClick={() => setOpen(false)}>Ready-Made Boxes</Link>
          <Link href="/build" className="text-[11px] font-sans tracking-[0.2em] uppercase text-bark-400" onClick={() => setOpen(false)}>Build a Box</Link>
          <Link href="/gift-cards" className="text-[11px] font-sans tracking-[0.2em] uppercase text-bark-400" onClick={() => setOpen(false)}>Gift Cards</Link>
          <Link href="/guide" className="text-[11px] font-sans tracking-[0.2em] uppercase text-bark-400" onClick={() => setOpen(false)}>Gift Guide</Link>
          <Link href="/wishlist" className="text-[11px] font-sans tracking-[0.2em] uppercase text-bark-400" onClick={() => setOpen(false)}>Wishlist</Link>
          <Link href="/account" className="text-[11px] font-sans tracking-[0.2em] uppercase text-bark-400" onClick={() => setOpen(false)}>My Account</Link>
          <Link href="/social" className="text-[11px] font-sans tracking-[0.2em] uppercase text-bark-400" onClick={() => setOpen(false)}>Stories</Link>
        </div>
      )}
    </header>
  )
}
