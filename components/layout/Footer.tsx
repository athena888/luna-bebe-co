'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight, Mail } from 'lucide-react'

// lucide no longer ships brand marks, so inline the two we use.
function IgIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}
function FbIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z" />
    </svg>
  )
}
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

          {/* Find us — social + email icons + labels + handle/address subline, above the signup */}
          <div className="flex justify-center gap-10 mb-12">
            <a href="https://www.instagram.com/petitelavandeco" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5 text-bark-400 hover:text-bark-600 transition-colors">
              <IgIcon />
              <span className="font-sans text-[10px] tracking-[0.2em] uppercase">Instagram</span>
              <span className="font-sans text-[10px] text-bark-400/70 tracking-wide">@petitelavandeco</span>
            </a>
            <a href="https://www.facebook.com/profile.php?id=61590439437590" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5 text-bark-400 hover:text-bark-600 transition-colors">
              <FbIcon />
              <span className="font-sans text-[10px] tracking-[0.2em] uppercase">Facebook</span>
              <span className="font-sans text-[10px] text-bark-400/70 tracking-wide">@petitelavandeco</span>
            </a>
            <a href={`mailto:${CONTACT_EMAIL}`} className="flex flex-col items-center gap-1.5 text-bark-400 hover:text-bark-600 transition-colors">
              <Mail size={22} strokeWidth={1.5} />
              <span className="font-sans text-[10px] tracking-[0.2em] uppercase">Email</span>
              <span className="font-sans text-[10px] text-bark-400/70 tracking-wide break-all">{CONTACT_EMAIL}</span>
            </a>
          </div>

          {/* Email signup — 10% off the first order */}
          <div className="max-w-md mx-auto text-center mb-14">
            <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-espresso mb-2 font-medium">Join our list — 10% off your first box</p>
            <p className="font-sans text-xs text-espresso mb-4 leading-relaxed">New-parent gift guides, quiet launches, and a welcome code for your first order.</p>
            <EmailSignup />
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 mb-12 text-center">

            {/* Shop & Gift — merged */}
            <div>
              <p className="font-sans text-[11px] tracking-[0.2em] uppercase text-espresso mb-4 font-semibold">Shop &amp; Gift</p>
              <ul className="space-y-2.5 text-[13px] font-sans font-medium">
                <li><Link href="/gift-guides" className="text-espresso hover:text-espresso transition-colors">Gifting Ideas</Link></li>
                <li><Link href="/boxes" className="text-espresso hover:text-espresso transition-colors">Ready-Made Boxes</Link></li>
                <li><Link href="/build" className="text-espresso hover:text-espresso transition-colors">Build Your Own Box</Link></li>
                <li><Link href="/gift-cards" className="text-espresso hover:text-espresso transition-colors">Gift Cards</Link></li>
              </ul>
            </div>

            {/* About */}
            <div>
              <p className="font-sans text-[11px] tracking-[0.2em] uppercase text-espresso mb-4 font-semibold">About</p>
              <ul className="space-y-2.5 text-[13px] font-sans font-medium">
                <li><Link href="/story" className="text-espresso hover:text-espresso transition-colors">Our Story</Link></li>
                <li><Link href="/journal" className="text-espresso hover:text-espresso transition-colors">The Journal</Link></li>
                <li><Link href="/track" className="text-espresso hover:text-espresso transition-colors">Track Order</Link></li>
                <li><Link href="/account" className="text-espresso hover:text-espresso transition-colors">My Account</Link></li>
              </ul>
            </div>

            {/* Corporate */}
            <div>
              <p className="font-sans text-[11px] tracking-[0.2em] uppercase text-espresso mb-4 font-semibold">Corporate</p>
              <ul className="space-y-2.5 text-[13px] font-sans font-medium">
                <li><Link href="/corporate" className="text-espresso hover:text-espresso transition-colors">Corporate &amp; Team Gifting</Link></li>
                <li><a href={`mailto:${CONTACT_EMAIL}`} className="text-espresso hover:text-espresso transition-colors break-all">{CONTACT_EMAIL}</a></li>
              </ul>
            </div>

          </div>

          {/* Copyright + legal — same container, separated by a divider */}
          <div className="pt-6 border-t border-cream-300">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="font-sans text-[11px] text-espresso">© {new Date().getFullYear()} Petite Lavande. Sent with love.</p>
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 font-sans text-[11px] text-espresso">
                <RegionSwitcher />
                <span className="text-espresso/40 hidden sm:inline">·</span>
                {/* Privacy · Terms · Returns — kept on one line */}
                <div className="flex items-center gap-2.5 whitespace-nowrap">
                  <Link href="/legal/privacy" className="hover:text-espresso transition-colors">Privacy</Link>
                  <span className="text-espresso/40">·</span>
                  <Link href="/legal/terms" className="hover:text-espresso transition-colors">Terms</Link>
                  <span className="text-espresso/40">·</span>
                  <Link href="/legal/returns" className="hover:text-espresso transition-colors">Returns</Link>
                </div>
              </div>
            </div>
          </div>

        </div>
      </SlotBackground>
    </footer>
  )
}
