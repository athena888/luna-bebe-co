'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { Menu, X, User, ShoppingBag, Mail } from 'lucide-react'
import { cartCount } from '@/lib/cart'
import { CONTACT_EMAIL } from '@/lib/site-config'
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
      className={`relative w-11 h-11 flex items-center justify-center transition-colors ${light ? 'text-cream-50 hover:text-white' : 'text-gold-500 hover:text-espresso'}`}
      title="Your box"
      aria-label="Your box"
    >
      <ShoppingBag size={24} strokeWidth={1.5} />
      {count > 0 && (
        <span className="absolute top-0.5 right-0 min-w-[17px] h-[17px] px-1 bg-bark-600 text-cream-50 rounded-full pl-round-full text-[10px] font-sans flex items-center justify-center leading-none">{count}</span>
      )}
    </Link>
  )
}

// lucide no longer ships brand marks, so inline the two socials we show on the
// left of the bar (balancing the account/cart icons on the right).
function IgIcon({ size = 23 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}
function FbIcon({ size = 23 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z" />
    </svg>
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
  const sizeCls = expanded ? 'h-[4.5rem] sm:h-[5.25rem]' : 'h-12 sm:h-14'
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
  const base = light ? 'text-cream-50/90 hover:text-white' : 'text-[#6F5B4D] hover:text-espresso'
  const cls = `uppercase font-medium ${base} transition-colors whitespace-nowrap`
  return (
    <>
      {/* Curated first, custom second */}
      <Link href="/boxes" className={cls} onClick={onClick}>Gift Boxes</Link>
      <Link href="/build" className={cls} onClick={onClick}>Build Your Own Box</Link>
      <Link href="/gift-cards" className={cls} onClick={onClick}>Gift Cards</Link>
      <Link href="/story" className={cls} onClick={onClick}>Stories</Link>
    </>
  )
}

function MobileMenu({ onClose }: { onClose: () => void }) {
  return (
    <div className="md:hidden bg-[#FBF5E9] border-b border-cream-300 px-6 py-8 flex flex-col gap-6 font-playfair text-[15px] tracking-[0.14em]">
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
  // Auto-hide (non-hero pages only): the sticky bar slides up while scrolling
  // down (max product/image space) and slides back in on scroll-up (cart + nav
  // one flick away). Standard Shopify-Dawn / DTC pattern.
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    if (!overHero) return
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [overHero])

  useEffect(() => {
    if (overHero) return
    let lastY = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      if (y < 80) setHidden(false)              // always visible near the top
      else if (y > lastY + 4) setHidden(true)   // scrolling down → hide
      else if (y < lastY - 4) setHidden(false)  // scrolling up → reveal
      lastY = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [overHero])

  // Reveal the bar whenever the mobile menu is open, so it never hides mid-use.
  useEffect(() => { if (open) setHidden(false) }, [open])

  // The non-hero bar is `fixed` (sticky is broken by the `overflow-x: clip` on
  // html/body that we use to kill mobile side-scroll). A spacer of the header's
  // height keeps page content from sliding underneath. No gap ever shows because
  // the bar is always visible near the top.
  const headerRef = useRef<HTMLElement>(null)
  const [spacerH, setSpacerH] = useState(0)
  useEffect(() => {
    if (overHero) return
    const el = headerRef.current
    if (!el) return
    const measure = () => setSpacerH(el.offsetHeight)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => { ro.disconnect(); window.removeEventListener('resize', measure) }
  }, [overHero])

  // expanded = big centered logo with nav beneath (hero top). On scroll (or on a
  // page without a hero) it collapses to the compact logo-beside-nav bar.
  const expanded = overHero && !scrolled
  const transparent = expanded && !open
  const light = transparent

  return (
    <>
    <header ref={headerRef} className={overHero
      ? 'absolute top-0 inset-x-0 z-40'
      : `fixed top-0 inset-x-0 z-40 bg-[#FBF5E9] transition-transform duration-300 ease-out ${hidden ? '-translate-y-full' : 'translate-y-0'}`}>

      {/* Coming-soon announcement strip — right-to-left looping marquee */}
      <div className="bg-[#4A3B30] text-cream-50 py-2.5 overflow-hidden">
        <div className="flex w-max animate-[pl-marquee_36s_linear_infinite]">
          {[0, 1].map(copy => (
            <div key={copy} className="flex shrink-0" aria-hidden={copy === 1}>
              {[0, 1, 2].map(i => (
                <p key={i} className="font-sans text-[10px] tracking-[0.25em] uppercase leading-relaxed whitespace-nowrap px-12">
                  Fait avec amour, pour vous. &nbsp;·&nbsp; Petite Lavande is launching soon &mdash;&nbsp;
                  <a href="https://www.instagram.com/petitelavandeco" target="_blank" rel="noopener noreferrer" tabIndex={copy === 1 ? -1 : undefined} className="underline underline-offset-2 hover:text-gold-300 transition-colors">Instagram</a>
                  &nbsp;&amp;&nbsp;
                  <a href="https://www.facebook.com/profile.php?id=61590439437590" target="_blank" rel="noopener noreferrer" tabIndex={copy === 1 ? -1 : undefined} className="underline underline-offset-2 hover:text-gold-300 transition-colors">Facebook</a>
                  &nbsp;for updates
                </p>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Nav bar — Organic-Zoo style: at the hero top, a big centered logo with the
          nav beneath it; on scroll it collapses smoothly to a compact bar with the
          nav beside the logo. Pages without a hero start compact. */}
      <div className={`transition-colors duration-500 ${transparent ? 'bg-gradient-to-b from-black/30 via-black/10 to-transparent' : 'bg-[#FBF5E9]'}`}>

        {/* Desktop */}
        <div className={`hidden md:block relative w-full px-9 transition-all duration-500 ${expanded ? 'py-5' : 'py-3'}`}>
          {/* Both states: centred logo with the nav beneath it (balanced), icons
              pinned right. Expanded (hero top) is just bigger and roomier. */}
          <div className={`flex flex-col items-center justify-center transition-all duration-500 ${expanded ? 'gap-3' : 'gap-1.5'}`}>
            <Wordmark light={light} expanded={expanded} />
            <nav className="flex items-center gap-6 lg:gap-9 font-playfair text-[13px] tracking-[0.14em]">
              <NavLinks light={light} />
            </nav>
          </div>
          {/* Socials left + account/cart right — only on the solid (coloured-logo)
              bar; hidden while the white logo sits over the hero. Both rows sit
              on the nav-links line rather than the bar's centre. */}
          {!light && (
            <>
              <div className={`absolute left-9 flex items-center gap-0.5 ${expanded ? 'bottom-2' : 'bottom-0.5'}`}>
                <a href="https://www.instagram.com/petitelavandeco" target="_blank" rel="noopener noreferrer" title="Instagram · @petitelavandeco" aria-label="Instagram"
                  className="w-11 h-11 flex items-center justify-center transition-colors text-gold-500 hover:text-espresso">
                  <IgIcon />
                </a>
                <a href="https://www.facebook.com/profile.php?id=61590439437590" target="_blank" rel="noopener noreferrer" title="Facebook" aria-label="Facebook"
                  className="w-11 h-11 flex items-center justify-center transition-colors text-gold-500 hover:text-espresso">
                  <FbIcon />
                </a>
                <a href={`mailto:${CONTACT_EMAIL}`} title={CONTACT_EMAIL} aria-label="Email"
                  className="w-11 h-11 flex items-center justify-center transition-colors text-gold-500 hover:text-espresso">
                  <Mail size={23} strokeWidth={1.6} />
                </a>
              </div>
              <div className={`absolute right-9 flex items-center gap-0.5 ${expanded ? 'bottom-2' : 'bottom-0.5'}`}>
                <Link href="/account" className="w-11 h-11 flex items-center justify-center transition-colors text-gold-500 hover:text-espresso" title="My Account">
                  <User size={24} />
                </Link>
                <CartButton light={false} />
              </div>
            </>
          )}
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
    {/* Reserves the fixed bar's height so content doesn't hide beneath it. */}
    {!overHero && <div aria-hidden style={{ height: spacerH }} />}
    </>
  )
}
