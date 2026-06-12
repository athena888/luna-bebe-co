'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { CONTACT_EMAIL } from '@/lib/site-config'
import { LogoMark } from '@/components/ui/LogoMark'
import { SlotBackground } from '@/components/ui/SlotBackground'
import { RegionSwitcher } from '@/components/ui/RegionSwitcher'

function EmailSignup() {
  const [email, setEmail] = useState('')
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
        body: JSON.stringify({ email }),
      })
    } finally {
      setLoading(false)
      setDone(true)
    }
  }

  if (done) {
    return <p className="font-sans text-xs text-espresso leading-loose">Thank you — you&rsquo;re on the list.</p>
  }

  return (
    <form onSubmit={handleSubmit} className="flex border border-cream-300 bg-cream-50">
      <input
        type="email"
        required
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Your email address"
        className="flex-1 px-4 py-3 font-sans text-xs text-espresso placeholder:text-espresso/40 bg-transparent focus:outline-none"
      />
      <button type="submit" className="px-4 text-espresso hover:text-espresso transition-colors border-l border-cream-300">
        <ArrowRight size={14} />
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
        <div className="max-w-6xl mx-auto px-6 py-16">

          {/* Logo + tagline */}
          <div className="mb-10 text-center">
            <LogoMark className="h-24 w-auto mx-auto mb-4" style={{ color: '#4A3B30' }} alt="Petite Lavande" />
            <div className="font-serif text-3xl tracking-[0.15em] uppercase text-espresso mb-2">Petite Lavande</div>
            <p className="font-serif italic text-espresso text-sm">Fait avec amour, pour vous.</p>
          </div>

          {/* Email signup — 10% off the first order */}
          <div className="max-w-md mx-auto text-center mb-14">
            <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-espresso mb-2 font-medium">Join our list — 10% off your first box</p>
            <p className="font-sans text-xs text-espresso mb-4 leading-relaxed">New-parent gift guides, quiet launches, and a welcome code for your first order.</p>
            <EmailSignup />
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-12 text-center">

            {/* Shop */}
            <div>
              <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-espresso mb-4 font-medium">Shop</p>
              <ul className="space-y-2.5 text-xs font-sans">
                <li><Link href="/boxes" className="text-espresso hover:text-espresso transition-colors">Ready-Made Boxes</Link></li>
                <li><Link href="/build" className="text-espresso hover:text-espresso transition-colors">Build Your Own Box</Link></li>
                <li><Link href="/gift-cards" className="text-espresso hover:text-espresso transition-colors">Gift Cards</Link></li>
              </ul>
            </div>

            {/* Gift Guides (search-intent landing pages) */}
            <div>
              <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-espresso mb-4 font-medium">Gift Guides</p>
              <ul className="space-y-2.5 text-xs font-sans">
                <li><Link href="/gifts/organic-newborn-gift-box" className="text-espresso hover:text-espresso transition-colors">Organic Newborn Box</Link></li>
                <li><Link href="/gifts/gender-neutral-baby-gift-box" className="text-espresso hover:text-espresso transition-colors">Gender-Neutral Box</Link></li>
                <li><Link href="/gifts/postpartum-care-package" className="text-espresso hover:text-espresso transition-colors">Postpartum Care</Link></li>
                <li><Link href="/gifts/luxury-baby-shower-gift" className="text-espresso hover:text-espresso transition-colors">Luxury Shower Gift</Link></li>
                <li><Link href="/corporate" className="text-espresso hover:text-espresso transition-colors">Corporate &amp; Team Gifting</Link></li>
              </ul>
            </div>

            {/* About */}
            <div>
              <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-espresso mb-4 font-medium">About</p>
              <ul className="space-y-2.5 text-xs font-sans">
                <li><Link href="/story" className="text-espresso hover:text-espresso transition-colors">Our Story</Link></li>
                <li><Link href="/journal" className="text-espresso hover:text-espresso transition-colors">The Journal</Link></li>
                <li><Link href="/track" className="text-espresso hover:text-espresso transition-colors">Track Order</Link></li>
                <li><Link href="/account" className="text-espresso hover:text-espresso transition-colors">My Account</Link></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-espresso mb-4 font-medium">Contact</p>
              <ul className="space-y-2.5 text-xs font-sans">
                <li><a href={`mailto:${CONTACT_EMAIL}`} className="text-espresso hover:text-espresso transition-colors break-all">hello@<br />petitelavande.com</a></li>
                <li><a href="https://www.instagram.com/petitelavandeco" target="_blank" rel="noopener noreferrer" className="text-espresso hover:text-espresso transition-colors">Instagram</a></li>
                <li><a href="https://www.facebook.com/profile.php?id=61590439437590" target="_blank" rel="noopener noreferrer" className="text-espresso hover:text-espresso transition-colors">Facebook</a></li>
              </ul>
            </div>

          </div>

          {/* Copyright + legal — same container, separated by a divider */}
          <div className="pt-6 border-t border-cream-300">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <p className="font-sans text-[10px] text-espresso">© {new Date().getFullYear()} Petite Lavande. Sent with love.</p>
              <div className="flex flex-wrap items-center gap-4 font-sans text-[10px] text-espresso">
                <RegionSwitcher />
                <span className="text-espresso/40">·</span>
                <Link href="/legal/privacy" className="hover:text-espresso transition-colors">Privacy</Link>
                <span className="text-espresso/40">·</span>
                <Link href="/legal/terms" className="hover:text-espresso transition-colors">Terms</Link>
                <span className="text-espresso/40">·</span>
                <Link href="/legal/returns" className="hover:text-espresso transition-colors">Returns</Link>
              </div>
            </div>
          </div>

        </div>
      </SlotBackground>
    </footer>
  )
}
