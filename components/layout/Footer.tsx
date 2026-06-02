'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight, Package, Leaf, PenLine, Heart } from 'lucide-react'

const TRUST_BADGES = [
  { icon: Package, label: 'Free Shipping', sub: '$150+' },
  { icon: Leaf, label: 'Organic', sub: 'Certified' },
  { icon: PenLine, label: 'Handcrafted', sub: 'Always' },
  { icon: Heart, label: 'Giving Back', sub: '1% Donated' },
]

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
    return <p className="font-sans text-xs text-bark-600 leading-loose">Thank you — you&rsquo;re on the list.</p>
  }

  return (
    <form onSubmit={handleSubmit} className="flex border border-cream-300 bg-cream-50">
      <input
        type="email"
        required
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Your email address"
        className="flex-1 px-4 py-3 font-sans text-xs text-bark-600 placeholder:text-bark-400/40 bg-transparent focus:outline-none"
      />
      <button type="submit" className="px-4 text-bark-400 hover:text-bark-600 transition-colors border-l border-cream-300">
        <ArrowRight size={14} />
      </button>
    </form>
  )
}

export function Footer() {
  return (
    <footer>
      {/* Main footer */}
      <div className="bg-cream-100 border-t border-cream-300">
        <div className="max-w-6xl mx-auto px-6 py-16">

          {/* Logo + tagline */}
          <div className="mb-12 text-center">
            <div className="font-serif text-2xl tracking-[0.15em] uppercase text-bark-600 mb-2">Petite Lavande</div>
            <p className="font-serif italic text-bark-400 text-sm">Fait avec amour, pour vous.</p>
          </div>

          {/* 3 column grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 mb-12">

            {/* Shop */}
            <div>
              <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-4 font-medium">Shop</p>
              <ul className="space-y-2.5 text-xs font-sans">
                <li><Link href="/shop" className="text-bark-400 hover:text-bark-600 transition-colors">Gift Boxes</Link></li>
                <li><Link href="/build" className="text-bark-400 hover:text-bark-600 transition-colors">Build a Box</Link></li>
                <li><Link href="/gift-cards" className="text-bark-400 hover:text-bark-600 transition-colors">Gift Cards</Link></li>
                <li><Link href="/guide" className="text-bark-400 hover:text-bark-600 transition-colors">Gift Guide</Link></li>
              </ul>
            </div>

            {/* About */}
            <div>
              <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-4 font-medium">About</p>
              <ul className="space-y-2.5 text-xs font-sans">
                <li><Link href="/story" className="text-bark-400 hover:text-bark-600 transition-colors">Our Story</Link></li>
                <li><Link href="/track" className="text-bark-400 hover:text-bark-600 transition-colors">Track Order</Link></li>
                <li><Link href="/account" className="text-bark-400 hover:text-bark-600 transition-colors">My Account</Link></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-4 font-medium">Contact</p>
              <ul className="space-y-2.5 text-xs font-sans">
                <li><a href="mailto:hello@petitelavande.com" className="text-bark-400 hover:text-bark-600 transition-colors break-all">hello@<br />petitelavande.com</a></li>
              </ul>
            </div>

          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-12 border-t border-cream-300">
            {TRUST_BADGES.map(({ icon: Icon, label, sub }) => (
              <div key={label} className="text-center sm:text-left">
                <Icon size={18} className="text-bark-400 mb-2 mx-auto sm:mx-0" strokeWidth={1.5} />
                <p className="font-sans text-[10px] tracking-[0.15em] uppercase text-bark-600">{label}</p>
                <p className="font-sans text-[9px] text-bark-400">{sub}</p>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Bottom bar */}
      <div className="bg-cream-50 border-t border-cream-300 py-6 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-4">
            <p className="font-sans text-[10px] text-bark-400/60">© {new Date().getFullYear()} Petite Lavande. Made in Seattle. Sent with love.</p>
            <div className="flex flex-wrap items-center gap-4 font-sans text-[10px] text-bark-400/60">
              <Link href="/legal/privacy" className="hover:text-bark-400 transition-colors">Privacy</Link>
              <span className="text-bark-300/30">·</span>
              <Link href="/legal/terms" className="hover:text-bark-400 transition-colors">Terms</Link>
              <span className="text-bark-300/30">·</span>
              <Link href="/legal/returns" className="hover:text-bark-400 transition-colors">Returns</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
