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
      {/* Main footer — 3 col */}
      <div className="bg-cream-100 border-t border-cream-300">
        <div className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-12">

          {/* Email signup */}
          <div>
            <p className="font-serif text-xl text-bark-600 italic mb-2">Only the Best From Us</p>
            <p className="font-sans text-xs text-bark-400 leading-loose mb-6">
              First access to new boxes, gifting guides, and exclusive offers.
            </p>
            <EmailSignup />
            <p className="font-sans text-[9px] text-bark-400/40 mt-3 leading-loose">
              By subscribing you agree to receive occasional emails. Unsubscribe any time.
            </p>
          </div>

          {/* Brand + links */}
          <div className="flex flex-col items-start md:items-center">
            <div className="font-serif text-xl tracking-[0.22em] uppercase text-bark-600 mb-0.5">Petite Lavande</div>
            <div className="text-[8px] tracking-[0.45em] text-gold-400 uppercase font-sans mb-6">Collective</div>
            <ul className="space-y-2.5 text-xs font-sans text-center">
              <li><Link href="/shop" className="text-bark-400 hover:text-bark-600 transition-colors">Shop Gift Boxes</Link></li>
              <li><Link href="/build" className="text-bark-400 hover:text-bark-600 transition-colors">Build a Box</Link></li>
              <li><Link href="/story" className="text-bark-400 hover:text-bark-600 transition-colors">Our Story</Link></li>
              <li><Link href="/guide" className="text-bark-400 hover:text-bark-600 transition-colors">Gift Guide</Link></li>
              <li><Link href="/gift-cards" className="text-bark-400 hover:text-bark-600 transition-colors">Gift Cards</Link></li>
              <li><Link href="/track" className="text-bark-400 hover:text-bark-600 transition-colors">Track Order</Link></li>
              <li><Link href="/account" className="text-bark-400 hover:text-bark-600 transition-colors">My Account</Link></li>
              <li><Link href="/wholesale" className="text-bark-400 hover:text-bark-600 transition-colors">Wholesale</Link></li>
              <li><Link href="/affiliate" className="text-bark-400 hover:text-bark-600 transition-colors">Affiliate Program</Link></li>
              <li><a href="mailto:hello@petitelavande.com" className="text-bark-400 hover:text-bark-600 transition-colors">hello@petitelavande.com</a></li>
            </ul>
          </div>

          {/* Trust badges */}
          <div>
            <p className="font-serif text-xl text-bark-600 italic mb-6">Lots to Love</p>
            <div className="grid grid-cols-2 gap-6">
              {TRUST_BADGES.map(({ icon: Icon, label, sub }) => (
                <div key={label} className="flex flex-col items-start gap-2">
                  <Icon size={20} className="text-bark-400" strokeWidth={1.5} />
                  <div>
                    <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-bark-600">{label}</p>
                    <p className="font-sans text-[9px] text-bark-400">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Bottom bar */}
      <div className="bg-cream-100 border-t border-cream-300 py-5 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <p className="font-serif italic text-bark-500 text-sm mb-1">Fait avec amour, pour vous.</p>
            <p className="font-sans text-[10px] text-bark-400/50">© {new Date().getFullYear()} Petite Lavande. Made in Seattle. Sent with love.</p>
          </div>
          <div className="flex items-center gap-6 font-sans text-[10px] text-bark-400/50">
            <Link href="/legal/privacy" className="hover:text-bark-400 transition-colors">Privacy</Link>
            <Link href="/legal/terms" className="hover:text-bark-400 transition-colors">Terms</Link>
            <Link href="/legal/returns" className="hover:text-bark-400 transition-colors">Returns</Link>
            <a href="mailto:hello@petitelavande.com" className="hover:text-bark-400 transition-colors">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
