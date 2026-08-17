'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useIsEs } from '@/lib/use-is-es'
import { useState, useEffect, useRef } from 'react'
import { Menu, X, User, ShoppingBag, Mail, ChevronDown } from 'lucide-react'
import { cartCount } from '@/lib/cart'
import { FREE_SHIPPING_THRESHOLD } from '@/lib/products'
import { CONTACT_EMAIL } from '@/lib/site-config'
import { LavenderSprig } from '@/components/ui/LavenderSprig'
import { BagDrawer } from '@/components/ui/BagDrawer'

// Cart lives in the nav row so it scrolls with the header. On the build page it
// opens the bag drawer in place; elsewhere it goes to the Shopping Bag.
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
      href="/checkout"
      onClick={e => { e.preventDefault(); window.dispatchEvent(new Event('pl:open-bag')) }}
      className={`relative w-11 h-11 flex items-center justify-center transition-colors ${light ? 'text-cream-50 hover:text-white' : 'text-gold-500 hover:text-espresso'}`}
      title="Shopping bag"
      aria-label="Shopping bag"
    >
      <ShoppingBag size={27} strokeWidth={1.2} />
      {count > 0 && (
        <span className="absolute top-0.5 right-0 min-w-[17px] h-[17px] px-1 bg-espresso text-cream-50 rounded-full pl-round-full text-[10px] font-sans flex items-center justify-center leading-none">{count}</span>
      )}
    </Link>
  )
}

// lucide no longer ships brand marks, so inline the two socials we show on the
// left of the bar (balancing the account/cart icons on the right).
function IgIcon({ size = 26 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}
function FbIcon({ size = 26 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M15.3 7.5h-1.4c-1.1 0-1.8.7-1.8 1.8V12h3.1l-.45 2.7h-2.65V22" />
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
  return <img src={src} alt="Petite Lavande" className="h-9 sm:h-12 w-auto shrink-0 object-contain" onError={() => setErr(true)} />
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
    <Link href={useIsEs() ? '/es' : '/'} className="flex items-center shrink-0 min-w-0" aria-label="Petite Lavande — home">
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

// Gift Boxes dropdown — the NEW catalog structure (§46): ready-made parent
// products first, occasion collections second. The static list is the SSR
// fallback so crawlers always see the links; /api/catalog-nav refreshes it so
// the seasonal hide toggle (e.g. Noël off-season) drops items without a deploy.
const DEFAULT_BOX_PRODUCTS: Array<{ slug: string; name: string }> = [
  { slug: 'signature-baby-gift-box', name: 'The Petite' },
  { slug: 'themed-baby-gift-box', name: 'Mama et Bébé' },
  { slug: 'new-mom-gift-box', name: 'The Mama Box' },
  { slug: 'baby-first-christmas-gift-box', name: 'Noël' },
]

// SHOP BY OCCASION column — Emily's exact format (2026-07-29).
// ONE column (Emily): each box row carries its occasion as a right-hand tag.
const OCCASION_BY_SLUG: Record<string, { en: string; es: string }> = {
  'signature-baby-gift-box': { en: 'Baby Shower', es: 'Baby Shower' },
  'themed-baby-gift-box': { en: 'For Her & Baby', es: 'Para ella y el bebé' },
  'new-mom-gift-box': { en: 'For Mom', es: 'Para mamá' },
  'baby-first-christmas-gift-box': { en: 'Christmas Gifts For Little Ones', es: 'Regalos de Navidad para los más pequeños' },
}

function useBoxProducts() {
  const [products, setProducts] = useState(DEFAULT_BOX_PRODUCTS)
  useEffect(() => {
    fetch('/api/catalog-nav').then(r => r.json())
      .then(d => { if (Array.isArray(d.products) && d.products.length) setProducts(d.products) })
      .catch(() => {})
  }, [])
  return products
}

// "Gift Boxes" with the collections dropdown. Every link renders in the
// initial HTML (hidden with CSS, never conditionally omitted) so crawlers see
// the full list; the trigger itself links to /boxes so it works without JS.
function BoxesDropdown({ light, cls }: { light: boolean; cls: string }) {
  const isEs = useIsEs()
  const boxProducts = useBoxProducts()
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const enter = () => { if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(true), 150) }
  const leave = () => { if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(false), 150) }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return (
    <div className="relative" onMouseEnter={enter} onMouseLeave={leave} onFocus={enter} onBlur={leave}>
      <Link
        href={isEs ? '/es/canastillas' : '/boxes'}
        className={cls}
        aria-expanded={open}
        aria-controls="boxes-dropdown"
        onClick={() => setOpen(false)}
      >
        {isEs ? 'Canastillas' : 'Gift Boxes'}
      </Link>
      <div
        id="boxes-dropdown"
        className={`absolute left-1/2 -translate-x-1/2 top-full pt-3 z-50 transition-opacity duration-150 ${open ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
      >
        <div className="bg-cream-white border border-cream-300 shadow-lg px-7 py-6 whitespace-nowrap min-w-[340px]">
          <p className="font-sans text-[10px] tracking-[0.18em] uppercase text-bark-400 font-bold mb-2.5">{isEs ? 'Nuestras canastillas' : 'Ready-Made Boxes'}</p>
          {boxProducts.map(p => (
            <Link key={p.slug} href={isEs ? `/es/canastillas/${p.slug}` : `/boxes/${p.slug}`} onClick={() => setOpen(false)}
              className="block font-sans text-[13px] normal-case tracking-normal text-espresso hover:text-gold-500 transition-colors py-1">
              {p.name}
              {OCCASION_BY_SLUG[p.slug] && (
                <>
                  <span className="text-cream-300 mx-2">|</span>
                  {isEs ? OCCASION_BY_SLUG[p.slug].es : OCCASION_BY_SLUG[p.slug].en}
                </>
              )}
            </Link>
          ))}
          <Link href="/corporate" onClick={() => setOpen(false)}
            className="block font-sans text-[13px] normal-case tracking-normal text-espresso hover:text-gold-500 transition-colors py-1">
            {isEs ? 'Regalos corporativos' : 'Corporate Gifting'}
          </Link>
          <Link href={isEs ? '/es/build' : '/build'} onClick={() => setOpen(false)}
            className="block font-sans text-[13px] normal-case tracking-normal text-[#7A8E7C] hover:text-espresso transition-colors py-1">
            {isEs ? 'Arma la tuya' : 'Build Your Own'}
          </Link>
          <Link href={isEs ? '/es/canastillas' : '/boxes'} onClick={() => setOpen(false)}
            className="self-end font-sans text-[12px] normal-case tracking-normal text-[#7A8E7C] underline underline-offset-2 hover:text-espresso transition-colors">
            {isEs ? 'Ver todas →' : 'View all boxes →'}
          </Link>
        </div>
      </div>
    </div>
  )
}

function NavLinks({ light, onClick }: { light: boolean; onClick?: () => void }) {
  const isEs = useIsEs()
  const base = light ? 'text-cream-50/90 hover:text-white' : 'text-espresso hover:text-gold-500'
  const cls = `uppercase font-medium ${base} transition-colors whitespace-nowrap`
  return (
    <>
      {/* Curated first, custom second */}
      <BoxesDropdown light={light} cls={cls} />
      <Link href={isEs ? '/es/build' : '/build'} className={cls} onClick={onClick}>{isEs ? 'Arma tu canastilla' : 'Build Your Own Box'}</Link>
      <Link href={isEs ? '/es/tarjetas-regalo' : '/gift-cards'} className={cls} onClick={onClick}>{isEs ? 'Tarjetas de regalo' : 'Gift Cards'}</Link>
      <Link href={isEs ? '/es/historia' : '/story'} className={cls} onClick={onClick}>{isEs ? 'Nuestra historia' : 'Stories'}</Link>
    </>
  )
}

function MobileMenu({ onClose }: { onClose: () => void }) {
  const isEs = useIsEs()
  const boxProducts = useBoxProducts()
  const linkCls = 'uppercase text-espresso hover:text-gold-500 transition-colors'
  return (
    <div className="md:hidden bg-cream-white border-b border-cream-300 px-6 py-8 flex flex-col gap-6 font-playfair text-[15px] tracking-[0.14em]">
      {/* Boxes — sub-links always expanded (Emily 2026-08-15: no accordion,
          every tap target visible the moment the menu opens) */}
      <div>
        <Link href={isEs ? '/es/canastillas' : '/boxes'} className={linkCls} onClick={onClose}>{isEs ? 'Canastillas' : 'Gift Boxes'}</Link>
        <div className="mt-3 pl-3 flex flex-col gap-2.5 font-sans text-[13px] tracking-normal normal-case">
          {boxProducts.map(p => (
            <Link key={p.slug} href={isEs ? `/es/canastillas/${p.slug}` : `/boxes/${p.slug}`} onClick={onClose} className="text-bark-500 hover:text-gold-500 transition-colors">{p.name}</Link>
          ))}
          <Link href="/corporate" onClick={onClose} className="text-bark-500 hover:text-gold-500 transition-colors">{isEs ? 'Regalos corporativos' : 'Corporate Gifting'}</Link>
        </div>
      </div>
      <Link href={isEs ? '/es/build' : '/build'} className={linkCls} onClick={onClose}>{isEs ? 'Arma tu canastilla' : 'Build Your Own Box'}</Link>
      <Link href={isEs ? '/es/tarjetas-regalo' : '/gift-cards'} className={linkCls} onClick={onClose}>{isEs ? 'Tarjetas de regalo' : 'Gift Cards'}</Link>
      <Link href={isEs ? '/es/historia' : '/story'} className={linkCls} onClick={onClose}>{isEs ? 'Nuestra historia' : 'Stories'}</Link>
      <Link href="/account" className="uppercase text-[#7A6B60] hover:text-espresso transition-colors" onClick={onClose}>My Account</Link>
    </div>
  )
}

// The promise perks — espresso strip pinned to the top of the header on EVERY
// page. Perks come from Portal → Homepage (falls back to the defaults until
// the fetch lands).
type Perk = { label: string; sub: string; es?: { label?: string; sub?: string } }
// Labels only, no sub-lines (Emily 2026-08-16): four short promises fit one
// line at any desktop width. A perk with a `sub` still renders it — the field
// stays editable in Portal → Home Content.
const DEFAULT_PERKS: Perk[] = [
  { label: `Free Shipping Over $${Math.round(FREE_SHIPPING_THRESHOLD / 100)}`, sub: '', es: { label: `Envío gratis desde $${Math.round(FREE_SHIPPING_THRESHOLD / 100)}`, sub: '' } },
  { label: 'Organic Cotton', sub: '', es: { label: 'Algodón orgánico', sub: '' } },
  { label: 'Personalized Card', sub: '', es: { label: 'Tarjeta personalizada', sub: '' } },
  { label: 'Same-Day Shipping', sub: '', es: { label: 'Envío el mismo día', sub: '' } },
]
export function PerksMarquee() {
  const [perks, setPerks] = useState<Perk[]>(DEFAULT_PERKS)
  useEffect(() => {
    fetch('/api/home-perks')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.perks) && d.perks.length > 0) setPerks(d.perks) })
      .catch(() => {})
  }, [])
  const isEs = useIsEs()
  // Spanish rides on each perk's own `es` subtree (edited with the English in
  // Portal → Home Content). No label-keyed lookup — that drifted the moment a
  // label was reworded ('Gift Ready' vs 'Gift-Ready' silently fell back to EN).
  const shown = isEs
    ? perks.map(pk => ({ label: pk.es?.label || pk.label, sub: pk.es?.sub || pk.sub }))
    : perks
  // Static strip (Emily 2026-08-15: no scrolling) — every promise on one
  // evenly-spaced line on sm+; phones show a 2×2 grid because four
  // label+sub pairs can't fit a phone width legibly.
  // ALL FOUR must stay on screen (Emily 2026-08-16): the row wraps and its
  // spacing/type tighten on narrower windows rather than running off both
  // edges, which is what clipped the first and last promise before.
  return (
    <div className="bg-[#4A3B30] py-2.5" aria-label="Our promises">
      <div className="hidden sm:flex flex-wrap items-baseline justify-center gap-y-1 px-4">
        {shown.map(({ label, sub }, i) => (
          <span key={label} className="flex items-baseline whitespace-nowrap">
            {i > 0 && <span className="w-1 h-1 rounded-full bg-gold-400 mx-3 md:mx-5 lg:mx-8 self-center shrink-0" />}
            <span className="font-sans text-[10px] md:text-[11px] tracking-[0.16em] md:tracking-[0.22em] lg:tracking-[0.25em] uppercase font-semibold text-cream-50">{label}</span>
            {sub && <span className="font-cormorant text-[13px] md:text-[15px] text-cream-200 ml-2 md:ml-3">{sub}</span>}
          </span>
        ))}
      </div>
      <div className="sm:hidden grid grid-cols-2 gap-y-1.5 gap-x-4 px-4 text-center">
        {shown.map(({ label, sub }) => (
          <span key={label} className="flex flex-col">
            <span className="font-sans text-[10px] tracking-[0.2em] uppercase font-semibold text-cream-50">{label}</span>
            {sub && <span className="font-cormorant text-[13px] text-cream-200 leading-snug">{sub}</span>}
          </span>
        ))}
      </div>
    </div>
  )
}

// The coming-soon announcement — cream marquee the homepage runs below the
// hero (colours swapped with the perks strip above).
export function LaunchMarquee() {
  const isEs = useIsEs()
  return (
    <div className="bg-cream-white border-y border-cream-300 text-espresso py-2.5 overflow-hidden">
      <div className="flex w-max animate-[pl-marquee_36s_linear_infinite]">
        {[0, 1].map(copy => (
          <div key={copy} className="flex shrink-0" aria-hidden={copy === 1}>
            {[0, 1, 2].map(i => (
              <p key={i} className="font-sans text-[11px] tracking-[0.25em] uppercase leading-relaxed whitespace-nowrap px-12">
                Fait avec amour, pour vous. &nbsp;·&nbsp; {isEs ? 'Petite Lavande llega muy pronto' : 'Petite Lavande is launching soon'} &mdash;&nbsp;
                <a href="https://www.instagram.com/petitelavandeco" target="_blank" rel="noopener noreferrer" tabIndex={copy === 1 ? -1 : undefined} className="underline underline-offset-2 hover:text-gold-500 transition-colors">Instagram</a>
                &nbsp;&amp;&nbsp;
                <a href="https://www.facebook.com/profile.php?id=61590439437590" target="_blank" rel="noopener noreferrer" tabIndex={copy === 1 ? -1 : undefined} className="underline underline-offset-2 hover:text-gold-500 transition-colors">Facebook</a>
                {isEs ? <>&nbsp;para novedades</> : <>&nbsp;for updates</>}
              </p>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// `overHero`: on pages whose first section is a full-bleed hero, the header sits
// transparent over the image at the top (cream-white text) and turns into the
// normal solid bar once the user scrolls. Pages without a hero pass nothing and
// get the solid in-flow header.
export function Header({ overHero = false }: { overHero?: boolean }) {
  const [open, setOpen] = useState(false)
  // Auto-hide: the bar slides up while scrolling down (max product/image
  // space) and slides back in on scroll-up (cart + nav one flick away).
  // Standard Shopify-Dawn / DTC pattern. On over-hero pages the revealed bar
  // is the solid coloured one; near the top of the page it hands back to the
  // transparent white-logo overlay.
  const [hidden, setHidden] = useState(false)
  const [atTop, setAtTop] = useState(true)

  useEffect(() => {
    let lastY = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      setAtTop(y < 120)
      if (y < 80) setHidden(false)              // always visible near the top
      else if (y > lastY + 4) setHidden(true)   // scrolling down → hide
      else if (y < lastY - 4) setHidden(false)  // scrolling up → reveal
      lastY = y
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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

  // expanded = big centered logo with nav beneath, transparent over the hero.
  // Only at the top of an over-hero page; the scroll-up-revealed bar mid-page
  // is the compact solid one.
  const expanded = overHero && atTop
  const transparent = expanded && !open
  const light = transparent

  return (
    <>
    <header ref={headerRef} className={`fixed top-0 inset-x-0 z-40 transition-transform duration-300 ease-out ${hidden ? '-translate-y-full' : 'translate-y-0'} ${overHero ? '' : 'bg-cream-white'}`}>

      {/* Top strip — the perks marquee, identical on every page */}

      {/* Nav bar — Organic-Zoo style: at the hero top, a big centered logo with the
          nav beneath it; on scroll it collapses smoothly to a compact bar with the
          nav beside the logo. Pages without a hero start compact. */}
      <div className={`transition-colors duration-500 ${transparent ? 'bg-gradient-to-b from-black/30 via-black/10 to-transparent' : 'bg-cream-white'}`}>

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
          {/* Socials left — only on the solid (coloured-logo) bar. Account/cart
              right — ALWAYS shown, white over the hero, gold on the solid bar;
              both rows sit on the nav-links line rather than the bar's centre. */}
          {!light && (
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
                <Mail size={26} strokeWidth={1.2} />
              </a>
            </div>
          )}
          <div className={`absolute right-9 flex items-center gap-0.5 ${expanded ? 'bottom-2' : 'bottom-0.5'}`}>
            <Link href="/account" className={`w-11 h-11 flex items-center justify-center transition-colors ${light ? 'text-cream-50 hover:text-white' : 'text-gold-500 hover:text-espresso'}`} title="My Account">
              <User size={27} strokeWidth={1.2} />
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
    {/* Reserves the fixed bar's height so content doesn't hide beneath it. */}
    {!overHero && <div aria-hidden style={{ height: spacerH }} />}
    {/* Global slide-out bag — the cart icon opens it on any page (the Build
        page has its own richer drawer; BagDrawer no-ops there). */}
    <BagDrawer />
    </>
  )
}
