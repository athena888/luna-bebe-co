'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Menu, X, User, ShoppingBag } from 'lucide-react'
import { cartCount } from '@/lib/cart'
import { LavenderSprig } from '@/components/ui/LavenderSprig'

// Cart lives in the nav row so it scrolls with the header. On the build page it
// opens the bag drawer in place; elsewhere it links to /build.
function CartButton({ light }: { light: boolean }) {
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
      className={`relative w-11 h-11 flex items-center justify-center transition-colors ${light ? 'text-cream-50 hover:text-white' : 'text-bark-500 hover:text-bark-700'}`}
      title="Your box"
      aria-label="Your box"
    >
      <ShoppingBag size={18} strokeWidth={1.5} />
      {count > 0 && (
        <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-1 bg-bark-600 text-cream-50 rounded-full text-[9px] font-sans flex items-center justify-center leading-none">{count}</span>
      )}
    </Link>
  )
}

// The lavender sprig. Over the hero (light) we use the white cut-out; on the
// solid bar the coloured version. Falls back to the built-in SVG if the PNG
// isn't present yet.
function Sprig({ light }: { light: boolean }) {
  const src = light ? '/sprig-white.png' : '/sprig-color.png'
  const [err, setErr] = useState(false)
  useEffect(() => { setErr(false) }, [src])
  if (err) {
    return <LavenderSprig className="h-9 sm:h-12 w-auto shrink-0" style={{ color: light ? '#FBF4EA' : '#8B79B0' }} title="Petite Lavande" />
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className="h-9 sm:h-12 w-auto shrink-0 object-contain" onError={() => setErr(true)} />
}

// Brand lockup: lavender sprig to the LEFT of the wordmark (no seal logo in the
// header — the seal lives elsewhere across the site). Fraunces wordmark.
function Wordmark({ light }: { light: boolean }) {
  const color = light ? '#FBF4EA' : '#574540'
  return (
    <Link href="/" className="flex items-center gap-2 sm:gap-2.5 shrink-0" aria-label="Petite Lavande — home">
      <Sprig light={light} />
      <span style={{ fontFamily: 'var(--font-fraunces)', fontSize: 'clamp(1.35rem, 5.5vw, 2.15rem)', fontWeight: 500, letterSpacing: '0.01em', lineHeight: 1, color }}>
        Petite Lavande
      </span>
    </Link>
  )
}

function NavLinks({ light, onClick }: { light: boolean; onClick?: () => void }) {
  const base = light ? 'text-cream-50/90 hover:text-white' : 'text-[#7A6B60] hover:text-espresso'
  const cls = `uppercase ${base} transition-colors whitespace-nowrap`
  return (
    <>
      <Link href="/build" className={cls} onClick={onClick}>Build Your Own Box</Link>
      {/* Gifting Ideas → the ready-made / pre-made boxes page (no dropdown for now) */}
      <Link href="/boxes" className={cls} onClick={onClick}>Gifting Ideas</Link>
      <Link href="/gift-cards" className={cls} onClick={onClick}>Gift Cards</Link>
      <Link href="/story" className={cls} onClick={onClick}>Stories</Link>
    </>
  )
}

function MobileMenu({ onClose }: { onClose: () => void }) {
  return (
    <div className="md:hidden bg-[#FEF8F4] border-b border-cream-300 px-6 py-8 flex flex-col gap-6 font-sans text-[11px] tracking-[0.2em]">
      <NavLinks light={false} onClick={onClose} />
      <Link href="/account" className="uppercase text-[#7A6B60] hover:text-espresso transition-colors" onClick={onClose}>My Account</Link>
    </div>
  )
}

// `overHero`: on pages whose first section is a full-bleed hero, the header sits
// transparent over the image at the top (cream-white text) and turns into the
// normal solid bar once the user scrolls. Pages without a hero pass nothing and
// get the solid in-flow header.
export function Header({ overHero = false }: { overHero?: boolean }) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (!overHero) return
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [overHero])

  // Transparent only while over the hero, at the top, and the mobile menu is closed.
  const transparent = overHero && !scrolled && !open
  const light = transparent

  return (
    <header className={overHero ? 'fixed top-0 inset-x-0 z-40' : 'relative z-40 bg-[#FEF8F4]'}>

      {/* Coming-soon announcement strip */}
      <div className="bg-[#4A3B30] text-cream-50 text-center py-2.5 px-4">
        <p className="font-sans text-[10px] tracking-[0.25em] uppercase leading-relaxed">
          Petite Lavande is launching soon &mdash;&nbsp;
          <a href="https://www.instagram.com/petitelavandeco" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-gold-300 transition-colors">Instagram</a>
          &nbsp;&amp;&nbsp;
          <a href="https://www.facebook.com/profile.php?id=61590439437590" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-gold-300 transition-colors">Facebook</a>
          &nbsp;for updates
        </p>
      </div>

      {/* Nav bar */}
      <div className={`transition-colors duration-300 ${transparent ? 'bg-gradient-to-b from-black/30 via-black/10 to-transparent' : 'bg-[#FEF8F4] border-b border-cream-300 shadow-sm'}`}>
        <div className="relative w-full pl-4 sm:pl-9 pr-4 sm:pr-6 h-[92px] sm:h-[112px] flex items-center justify-between">

          <Wordmark light={light} />

          <nav className="hidden md:flex flex-1 items-center justify-center gap-5 lg:gap-7 px-4 font-sans text-[11px] tracking-[0.2em]">
            <NavLinks light={light} />
          </nav>

          <div className="flex items-center gap-0.5 justify-self-end">
            <Link href="/account" className={`hidden md:flex w-11 h-11 items-center justify-center transition-colors ${light ? 'text-cream-50/90 hover:text-white' : 'text-bark-400 hover:text-bark-600'}`} title="My Account">
              <User size={16} />
            </Link>
            <CartButton light={light} />
            <button
              className={`md:hidden w-11 h-11 flex items-center justify-center transition-colors ${light ? 'text-cream-50' : 'text-bark-600 hover:text-bark-700'}`}
              onClick={() => setOpen(!open)}
              title={open ? 'Close menu' : 'Open menu'}
              aria-label={open ? 'Close menu' : 'Open menu'}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {open && <MobileMenu onClose={() => setOpen(false)} />}
    </header>
  )
}
