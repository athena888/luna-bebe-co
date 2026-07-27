'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { CONTACT_EMAIL } from '@/lib/site-config'
import { SlotBackground } from '@/components/ui/SlotBackground'
import { RegionSwitcher } from '@/components/ui/RegionSwitcher'
import { useIsEs } from '@/lib/use-is-es'

// Segment chips (Build 7) — one optional tap after signup so flow emails can
// speak to the right reader. Fire-and-forget; disappears once tapped.
function SegmentChips({ email }: { email: string }) {
  const [picked, setPicked] = useState<string | null>(null)
  const OPTIONS = [
    { key: 'parent_to_be', label: 'My own baby' },
    { key: 'grandparent', label: 'A grandbaby' },
    { key: 'friend_coworker', label: 'A friend or coworker' },
  ]

  function pick(key: string) {
    if (picked) return
    setPicked(key)
    fetch('/api/segment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, segment: key }),
    }).catch(() => { /* best-effort */ })
  }

  if (picked) {
    return <p className="font-sans text-[12px] text-espresso-light text-center mt-3">Noted — we&rsquo;ll keep it relevant.</p>
  }

  return (
    <div className="mt-4 bg-white border border-cream-300 p-4 text-left">
      <p className="font-playfair text-[15px] text-espresso mb-0.5">Who are you shopping for?</p>
      <p className="font-sans text-[11px] text-espresso-light mb-2.5">Optional — helps us send you the right ideas.</p>
      <div className="flex gap-2 flex-wrap">
        {OPTIONS.map(o => (
          <button key={o.key} type="button" onClick={() => pick(o.key)}
            className="px-3 py-2 font-sans text-[10px] tracking-[0.08em] uppercase font-semibold border border-cream-300 bg-cream-50 text-espresso-light hover:bg-[#7A8E7C] hover:border-[#7A8E7C] hover:text-white transition-colors">
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// Occasion capture (Build 3) — offered right after a newsletter signup, when
// we already have the email. One well-timed reminder per saved date.
function OccasionCapture({ email }: { email: string }) {
  const [kind, setKind] = useState<'due_date' | 'baby_birthday'>('due_date')
  const [date, setDate] = useState('')
  const [label, setLabel] = useState('')
  const [state, setState] = useState<'idle' | 'saving' | 'done'>('idle')

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!date || state === 'saving') return
    setState('saving')
    try {
      await fetch('/api/occasions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, kind, date, label: label.trim() || undefined }),
      })
    } finally {
      setState('done')
    }
  }

  if (state === 'done') {
    return <p className="font-sans text-[13px] text-espresso leading-relaxed text-center mt-3">We&rsquo;ll remember — one reminder at just the right time. 💛</p>
  }

  return (
    <form onSubmit={save} className="mt-4 bg-white border border-cream-300 p-4 text-left">
      <p className="font-playfair text-[15px] text-espresso mb-1">Is there a big day coming?</p>
      <p className="font-sans text-[12px] text-espresso-light leading-relaxed mb-3">Tell us the due date or birthday and we&rsquo;ll send one perfectly-timed reminder — nothing else.</p>
      <div className="flex gap-2 mb-2">
        <div className="flex border border-cream-300 shrink-0">
          <button type="button" onClick={() => setKind('due_date')}
            className={`px-3 py-2 font-sans text-[10px] tracking-[0.1em] uppercase font-semibold transition-colors ${kind === 'due_date' ? 'bg-[#7A8E7C] text-white' : 'bg-white text-espresso-light'}`}>
            Due date
          </button>
          <button type="button" onClick={() => setKind('baby_birthday')}
            className={`px-3 py-2 font-sans text-[10px] tracking-[0.1em] uppercase font-semibold transition-colors ${kind === 'baby_birthday' ? 'bg-[#7A8E7C] text-white' : 'bg-white text-espresso-light'}`}>
            Birthday
          </button>
        </div>
        <input
          type="date"
          required
          value={date}
          onChange={e => setDate(e.target.value)}
          className="flex-1 min-w-0 px-3 py-2 font-sans text-[13px] text-espresso bg-cream-50 border border-cream-300 focus:outline-none"
        />
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="Baby's name (optional)"
          className="flex-1 min-w-0 px-3 py-2 font-sans text-[13px] text-espresso placeholder:font-light placeholder:text-[#B8B0A6] bg-cream-50 border border-cream-300 focus:outline-none"
        />
        <button type="submit" disabled={state === 'saving'}
          className="px-4 py-2 bg-[#7A8E7C] text-white font-sans text-[10px] tracking-[0.15em] uppercase font-semibold hover:bg-[#6b7d6d] transition-colors disabled:opacity-50">
          {state === 'saving' ? '…' : 'Remember It'}
        </button>
      </div>
      <p className="font-sans text-[10px] text-espresso-light mt-2">One reminder ~30 days before a due date, ~21 before a birthday. Unsubscribe anytime.</p>
    </form>
  )
}

function EmailSignup() {
  const isEs = useIsEs()
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || loading) return
    setLoading(true)
    try {
      await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone: phone.trim() || undefined, locale: isEs ? 'es' : 'en' }),
      })
    } finally {
      setLoading(false)
      setDone(true)
    }
  }

  if (done) {
    return (
      <div>
        <p className="font-sans text-sm text-espresso leading-loose text-center">{isEs ? 'Gracias — ya estás en la lista.' : <>Thank you — you&rsquo;re on the list.</>}</p>
        <SegmentChips email={email} />
        <OccasionCapture email={email} />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex bg-white">
      <input
        type="email"
        required
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder={isEs ? 'Correo electrónico*' : 'Email Address*'}
        className="w-[45%] min-w-0 px-4 py-2.5 font-sans text-sm text-espresso placeholder:font-light placeholder:text-[#B8B0A6] bg-transparent focus:outline-none"
      />
      <input
        type="tel"
        value={phone}
        onChange={e => setPhone(e.target.value)}
        placeholder={isEs ? 'Teléfono' : 'Phone Number'}
        className="flex-1 min-w-0 px-4 py-2.5 font-sans text-sm text-espresso placeholder:font-light placeholder:text-[#B8B0A6] bg-transparent focus:outline-none border-l border-cream-300"
      />
      <button type="submit" aria-label="Subscribe" className="px-4 text-gold-500 hover:text-gold-600 transition-colors">
        <ArrowRight size={20} strokeWidth={1.3} />
      </button>
    </form>
  )
}

export function Footer() {
  const isEs = useIsEs()
  return (
    <footer className="font-medium">
      {/* Main footer — optional owner-managed background sits behind everything;
          a translucent scrim keeps the cream look (and text legible) when set. */}
      <SlotBackground slotKey="footer.bg" scrim="bg-cream-100/30" className="bg-cream-100">
        <div className="max-w-6xl mx-auto px-6 py-10 sm:py-12">

          {/* Top row — brand + newsletter (left) · link columns (right) */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1.35fr] gap-8 lg:gap-16">

            {/* Brand + newsletter */}
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-color.png" alt="Petite Lavande" className="h-14 sm:h-[4.25rem] w-auto mb-5 mx-auto" />

              <p className="font-playfair text-[15px] text-espresso mb-3 text-center">{isEs ? 'Solo te enviamos lo bueno.' : 'We only send the good stuff.'}</p>
              <div className="max-w-md mx-auto"><EmailSignup /></div>
            </div>

            {/* Link columns — kept off the right border and pulled toward centre */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-8 gap-x-5 sm:gap-x-8 lg:pr-14 xl:pr-24">
              <div>
                <p className="font-playfair text-[15px] tracking-[0.02em] uppercase text-espresso font-medium mb-3.5">{isEs ? 'Compra y regala' : <>Shop &amp; Gift</>}</p>
                <ul className="space-y-2.5 text-[13.5px] font-sans font-normal">
                  <li><Link href="/gift-guides" className="text-espresso hover:text-gold-500 transition-colors">{isEs ? 'Ideas para regalar' : 'Gifting Ideas'}</Link></li>
                  <li><Link href="/boxes" className="text-espresso hover:text-gold-500 transition-colors">{isEs ? 'Sets de regalo' : 'Gift Sets'}</Link></li>
                  <li><Link href={isEs ? '/es/build' : '/build'} className="text-espresso hover:text-gold-500 transition-colors">{isEs ? 'Arma tu canastilla' : 'Build Your Own Box'}</Link></li>
                  <li><Link href="/gift-cards" className="text-espresso hover:text-gold-500 transition-colors">{isEs ? 'Tarjetas de regalo' : 'Gift Cards'}</Link></li>
                </ul>
              </div>
              <div>
                <p className="font-playfair text-[15px] tracking-[0.02em] uppercase text-espresso font-medium mb-3.5">{isEs ? 'Nosotros' : 'About'}</p>
                <ul className="space-y-2.5 text-[13.5px] font-sans font-normal">
                  <li><Link href={isEs ? '/es/historia' : '/story'} className="text-espresso hover:text-gold-500 transition-colors">{isEs ? 'Nuestra historia' : 'Our Story'}</Link></li>
                  <li><Link href="/journal" className="text-espresso hover:text-gold-500 transition-colors">{isEs ? 'El diario' : 'The Journal'}</Link></li>
                  <li><Link href="/track" className="text-espresso hover:text-gold-500 transition-colors">{isEs ? 'Rastrear pedido' : 'Track Order'}</Link></li>
                  <li><Link href="/account" className="text-espresso hover:text-gold-500 transition-colors">{isEs ? 'Mi cuenta' : 'My Account'}</Link></li>
                </ul>
              </div>
              <div>
                <p className="font-playfair text-[15px] tracking-[0.02em] uppercase text-espresso font-medium mb-3.5">{isEs ? 'Corporativo' : 'Corporate'}</p>
                <ul className="space-y-2.5 text-[13.5px] font-sans font-normal">
                  <li><Link href="/corporate" className="text-espresso hover:text-gold-500 transition-colors">{isEs ? 'Regalos para equipos' : 'Team Gifting'}</Link></li>
                  <li><Link href="/press" className="text-espresso hover:text-gold-500 transition-colors">{isEs ? 'Prensa' : 'Press'}</Link></li>
                  <li><a href={`mailto:${CONTACT_EMAIL}`} className="text-espresso hover:text-gold-500 transition-colors break-all">{CONTACT_EMAIL}</a></li>
                </ul>
              </div>
              <div>
                <p className="font-playfair text-[15px] tracking-[0.02em] uppercase text-espresso font-medium mb-3.5">{isEs ? 'Moneda' : 'Currency'}</p>
                <div className="text-[13.5px] font-sans font-normal text-espresso"><RegionSwitcher /></div>
              </div>
            </div>

          </div>

          {/* Legal bar — one centred line; the legal links stay grouped on a single
              line on every screen size */}
          <div className="mt-8 pt-6 border-t border-cream-300 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 font-sans text-[13px] font-normal text-espresso">
            <p className="whitespace-nowrap">© {new Date().getFullYear()} Petite Lavande.</p>
            {process.env.NEXT_PUBLIC_SPANISH_ACTIVE === 'true' && (
              <div className="flex border border-cream-300">
                {isEs ? (
                  <>
                    <Link href="/" className="px-3 py-1.5 bg-white text-espresso hover:bg-cream-50 transition-colors text-[12px]">English</Link>
                    <span className="px-3 py-1.5 bg-[#7A8E7C] text-white font-semibold text-[12px]">Español</span>
                  </>
                ) : (
                  <>
                    <span className="px-3 py-1.5 bg-[#7A8E7C] text-white font-semibold text-[12px]">English</span>
                    <Link href="/es" className="px-3 py-1.5 bg-white text-espresso hover:bg-cream-50 transition-colors text-[12px]">Español</Link>
                  </>
                )}
              </div>
            )}
            <div className="flex items-center gap-x-5 sm:gap-x-8 whitespace-nowrap">
              <Link href="/legal/privacy" className="hover:text-gold-500 transition-colors">{isEs ? 'Privacidad' : 'Privacy Policy'}</Link>
              <Link href="/legal/terms" className="hover:text-gold-500 transition-colors">{isEs ? 'Términos' : 'Terms of Service'}</Link>
              <Link href={isEs ? '/es/legal/devoluciones' : '/legal/returns'} className="hover:text-gold-500 transition-colors">{isEs ? 'Devoluciones' : 'Returns'}</Link>
            </div>
          </div>

        </div>
      </SlotBackground>
    </footer>
  )
}
