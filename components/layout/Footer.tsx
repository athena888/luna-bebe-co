'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { CONTACT_EMAIL } from '@/lib/site-config'
import { SlotBackground } from '@/components/ui/SlotBackground'
import { RegionSwitcher } from '@/components/ui/RegionSwitcher'

function EmailSignup() {
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
        body: JSON.stringify({ email, phone: phone.trim() || undefined }),
      })
    } finally {
      setLoading(false)
      setDone(true)
    }
  }

  if (done) {
    return <p className="font-sans text-sm text-espresso leading-loose text-center">Thank you — you&rsquo;re on the list.</p>
  }

  return (
    <form onSubmit={handleSubmit} className="flex bg-white">
      <input
        type="email"
        required
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Email Address*"
        className="w-[45%] min-w-0 px-4 py-2.5 font-sans text-sm text-espresso placeholder:font-light placeholder:text-[#B8B0A6] bg-transparent focus:outline-none"
      />
      <input
        type="tel"
        value={phone}
        onChange={e => setPhone(e.target.value)}
        placeholder="Phone Number"
        className="flex-1 min-w-0 px-4 py-2.5 font-sans text-sm text-espresso placeholder:font-light placeholder:text-[#B8B0A6] bg-transparent focus:outline-none border-l border-cream-300"
      />
      <button type="submit" aria-label="Subscribe" className="px-4 text-gold-500 hover:text-gold-600 transition-colors">
        <ArrowRight size={20} strokeWidth={1.3} />
      </button>
    </form>
  )
}

export function Footer() {
  return (
    <footer className="font-medium">
      {/* Main footer — optional owner-managed background sits behind everything;
          a translucent scrim keeps the cream look (and text legible) when set. */}
      <SlotBackground slotKey="footer.bg" scrim="bg-cream-100/30" className="bg-cream-100 border-t border-cream-300">
        <div className="max-w-6xl mx-auto px-6 py-10 sm:py-12">

          {/* Top row — brand + newsletter (left) · link columns (right) */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1.35fr] gap-8 lg:gap-16">

            {/* Brand + newsletter */}
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-color.png" alt="Petite Lavande" className="h-14 sm:h-[4.25rem] w-auto mb-2.5 mx-auto" />
              <p className="font-serif italic text-espresso text-[15px] font-medium mb-5 text-center">Fait avec amour, pour vous.</p>

              <p className="font-sans text-[11px] tracking-[0.25em] uppercase text-espresso font-semibold mb-1.5 text-center">Join our list — 10% off your first box</p>
              <p className="font-sans text-[13px] text-espresso font-medium mb-3 leading-relaxed max-w-md mx-auto text-center">New-parent gift guides, quiet launches, and a welcome code for your first order.</p>
              <div className="max-w-md mx-auto"><EmailSignup /></div>
            </div>

            {/* Link columns — kept off the right border and pulled toward centre */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-8 gap-x-5 sm:gap-x-8 lg:pr-14 xl:pr-24">
              <div>
                <p className="font-serif text-[15px] tracking-[0.03em] uppercase text-espresso font-semibold mb-3">Shop &amp; Gift</p>
                <ul className="space-y-2 text-[13px] font-sans font-medium">
                  <li><Link href="/gift-guides" className="text-espresso hover:text-gold-500 transition-colors">Gifting Ideas</Link></li>
                  <li><Link href="/boxes" className="text-espresso hover:text-gold-500 transition-colors">Ready-Made Boxes</Link></li>
                  <li><Link href="/build" className="text-espresso hover:text-gold-500 transition-colors">Build Your Own Box</Link></li>
                  <li><Link href="/gift-cards" className="text-espresso hover:text-gold-500 transition-colors">Gift Cards</Link></li>
                </ul>
              </div>
              <div>
                <p className="font-serif text-[15px] tracking-[0.03em] uppercase text-espresso font-semibold mb-3">About</p>
                <ul className="space-y-2 text-[13px] font-sans font-medium">
                  <li><Link href="/story" className="text-espresso hover:text-gold-500 transition-colors">Our Story</Link></li>
                  <li><Link href="/journal" className="text-espresso hover:text-gold-500 transition-colors">The Journal</Link></li>
                  <li><Link href="/track" className="text-espresso hover:text-gold-500 transition-colors">Track Order</Link></li>
                  <li><Link href="/account" className="text-espresso hover:text-gold-500 transition-colors">My Account</Link></li>
                </ul>
              </div>
              <div>
                <p className="font-serif text-[15px] tracking-[0.03em] uppercase text-espresso font-semibold mb-3">Corporate</p>
                <ul className="space-y-2 text-[13px] font-sans font-medium">
                  <li><Link href="/corporate" className="text-espresso hover:text-gold-500 transition-colors">Team Gifting</Link></li>
                  <li><a href={`mailto:${CONTACT_EMAIL}`} className="text-espresso hover:text-gold-500 transition-colors break-all">{CONTACT_EMAIL}</a></li>
                </ul>
              </div>
              <div>
                <p className="font-serif text-[15px] tracking-[0.03em] uppercase text-espresso font-semibold mb-3">Currency</p>
                <div className="text-[13px] font-sans font-medium text-espresso"><RegionSwitcher /></div>
              </div>
            </div>

          </div>

          {/* Legal bar — one centred line; the legal links stay grouped on a single
              line on every screen size */}
          <div className="mt-8 pt-6 border-t border-cream-300 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 font-sans text-[13px] font-medium text-espresso">
            <p className="whitespace-nowrap">© {new Date().getFullYear()} Petite Lavande.</p>
            <div className="flex items-center gap-x-5 sm:gap-x-8 whitespace-nowrap">
              <Link href="/legal/privacy" className="hover:text-gold-500 transition-colors">Privacy Policy</Link>
              <Link href="/legal/terms" className="hover:text-gold-500 transition-colors">Terms of Service</Link>
              <Link href="/legal/returns" className="hover:text-gold-500 transition-colors">Returns</Link>
            </div>
          </div>

        </div>
      </SlotBackground>
    </footer>
  )
}
