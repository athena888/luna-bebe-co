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

// Full brand lockup (wordmark + flanking sprigs, baked into one image): white
// version over the hero, coloured version on the solid bar. Falls back to the
// sprig + Fraunces wordmark if the lockup image isn't present yet.
function Wordmark({ light, expanded }: { light: boolean; expanded: boolean }) {
  const src = light ? '/logo-white.png' : '/logo-color.png'
  const [err, setErr] = useState(false)
  useEffect(() => { setErr(false) }, [src])
  // Bigger at the hero top; shrinks to normal on scroll. transition-all animates height.
  const sizeCls = expanded ? 'h-16 sm:h-24' : 'h-11 sm:h-14'
  return (
    <Link href="/" className="flex items-center shrink-0 min-w-0" aria-label="Petite Lavande — home">
      {err ? (
        <span className="flex items-center gap-2 sm:gap-2.5">
          <Sprig light={light} />
          <span style={{ fontFamily: 'var(--font-fraunces)', fontSize: expanded ? 'clamp(1.55rem, 6vw, 2.6rem)' : 'clamp(1.2rem, 5vw, 1.85rem)', fontWeight: 500, lineHeight: 1, color: light ? '#FBF4EA' : '#9D8BBC', transition: 'font-size 500ms' }}>
            Petite Lavande
          </span>
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="Petite Lavande" onError={() => setErr(true)} className={`${sizeCls} w-auto max-w-[62vw] sm:max-w-none object-contain transition-all duration-500`} />
      )}
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

  // expanded = big centered logo with nav beneath (hero top). On scroll (or on a
  // page without a hero) it collapses to the compact logo-beside-nav bar.
  const expanded = overHero && !scrolled
  const transparent = expanded && !open
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

      {/* Nav bar — Organic-Zoo style: at the hero top, a big centered logo with the
          nav beneath it; on scroll it collapses smoothly to a compact bar with the
          nav beside the logo. Pages without a hero start compact. */}
      <div className={`transition-colors duration-500 ${transparent ? 'bg-gradient-to-b from-black/30 via-black/10 to-transparent' : 'bg-[#FEF8F4] border-b border-cream-300 shadow-sm'}`}>

        {/* Desktop */}
        <div className={`hidden md:block relative w-full px-9 transition-all duration-500 ${expanded ? 'py-5' : 'py-3'}`}>
          <div className={`flex items-center justify-center transition-all duration-500 ${expanded ? 'flex-col gap-3' : 'flex-row gap-8'}`}>
            <Wordmark light={light} expanded={expanded} />
            <nav className="flex items-center gap-6 lg:gap-9 font-sans text-[11px] tracking-[0.2em] transition-all duration-500">
              <NavLinks light={light} />
            </nav>
          </div>
          <div className="absolute right-9 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            <Link href="/account" className={`w-11 h-11 flex items-center justify-center transition-colors ${light ? 'text-cream-50/90 hover:text-white' : 'text-bark-400 hover:text-bark-600'}`} title="My Account">
              <User size={16} />
            </Link>
            <CartButton light={light} />
          </div>
        </div>

        {/* Mobile — logo centered (shrinks on scroll); hamburger left, cart right */}
        <div className="md:hidden relative w-full px-3 flex items-center justify-center py-3 min-h-[60px]">
          <button
            className={`absolute left-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center transition-colors ${light ? 'text-cream-50' : 'text-bark-600 hover:text-bark-700'}`}
            onClick={() => setOpen(!open)}
            title={open ? 'Close menu' : 'Open menu'}
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Wordmark light={light} expanded={expanded} />
          <div className="absolute right-1 top-1/2 -translate-y-1/2">
            <CartButton light={light} />
          </div>
        </div>
      </div>

      {open && <MobileMenu onClose={() => setOpen(false)} />}
    </header>
  )
}
