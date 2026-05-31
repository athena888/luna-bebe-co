import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { COMMISSION_RATES } from '@/lib/affiliate'

const PERKS = [
  { title: 'Earn 15% on every sale', desc: 'Standard rate on the order subtotal. VIPs earn 20%.' },
  { title: '30-day cookie window', desc: 'Get credited for any order placed within 30 days of someone clicking your link.' },
  { title: 'Monthly payouts via Stripe', desc: 'Connect your bank, get paid automatically. 1099 issued by Stripe when you cross $600/year.' },
  { title: 'Real-time dashboard', desc: 'See clicks, conversions, and earnings as they happen.' },
]

export default function AffiliateLanding() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-20">
      <div className="text-center mb-16">
        <p className="font-sans text-[10px] tracking-[0.35em] uppercase text-gold-400 mb-3">Partner With Us</p>
        <h1 className="font-serif text-5xl text-bark-600 mb-6">Affiliate Program</h1>
        <p className="font-sans text-base text-bark-400 max-w-xl mx-auto leading-relaxed">
          Share Petite Lavande with the families in your community. Earn {Math.round(COMMISSION_RATES.standard * 100)}% commission on every order placed through your unique code.
        </p>
        <div className="mt-10 flex gap-4 justify-center">
          <Link href="/affiliate/apply"><Button variant="gold" size="lg">Apply Now</Button></Link>
          <Link href="/affiliate/dashboard"><Button variant="outline" size="lg">Affiliate Login</Button></Link>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-16">
        {PERKS.map(p => (
          <div key={p.title} className="border border-cream-300 bg-cream-50 p-6">
            <p className="font-serif text-xl text-bark-600 mb-2">{p.title}</p>
            <p className="font-sans text-sm text-bark-400 leading-relaxed">{p.desc}</p>
          </div>
        ))}
      </div>

      <div className="border-t border-cream-300 pt-12">
        <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark-400 mb-6">How It Works</p>
        <ol className="space-y-6">
          {[
            'Apply with a few details about you and your audience.',
            'We review applications within 2 business days. Once approved, you get a unique affiliate code.',
            'Share your code or referral link (e.g. yoursite.com/?ref=YOURCODE).',
            'When someone uses your link and buys, you earn commission. Conversions become eligible for payout after 30 days (refund window).',
            'Connect your Stripe account, get paid monthly.',
          ].map((step, i) => (
            <li key={i} className="flex gap-4">
              <span className="font-serif text-2xl text-gold-400 flex-shrink-0 w-8">{i + 1}</span>
              <p className="font-sans text-sm text-bark-500 leading-relaxed pt-1">{step}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
