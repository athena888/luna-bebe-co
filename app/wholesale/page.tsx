import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { TIER_DISCOUNTS, TIER_MIN_ORDER_CENTS, TIER_LABELS } from '@/lib/wholesale'

const BENEFITS = [
  { title: 'Up to 50% off retail', desc: 'Tiered wholesale pricing based on order volume.' },
  { title: 'Curated for boutiques', desc: 'Hand-finished organic baby gifts that match the aesthetic of high-end shops.' },
  { title: 'NET-30 terms available', desc: 'Approved stockists can opt for NET-30 invoicing on orders.' },
  { title: 'Dedicated account support', desc: 'Direct line to our wholesale team for restocking, custom orders, and merchandising help.' },
]

export default function WholesaleLanding() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-20">
      <div className="text-center mb-16">
        <p className="font-sans text-[10px] tracking-[0.35em] uppercase text-gold-400 mb-3">Stock Petite Lavande</p>
        <h1 className="font-serif text-5xl text-bark-600 mb-6">Wholesale</h1>
        <p className="font-sans text-base text-bark-400 max-w-xl mx-auto leading-relaxed">
          Bring our handcrafted, organic baby gifting to your storefront. Apply for a wholesale account to access trade pricing and dedicated support.
        </p>
        <div className="mt-10 flex gap-4 justify-center">
          <Link href="/wholesale/apply"><Button variant="gold" size="lg">Apply for Account</Button></Link>
          <Link href="/wholesale/dashboard"><Button variant="outline" size="lg">Stockist Login</Button></Link>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-20">
        {BENEFITS.map(b => (
          <div key={b.title} className="border border-cream-300 bg-cream-50 p-6">
            <p className="font-serif text-xl text-bark-600 mb-2">{b.title}</p>
            <p className="font-sans text-sm text-bark-400 leading-relaxed">{b.desc}</p>
          </div>
        ))}
      </div>

      <div className="mb-16">
        <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark-400 mb-6 text-center">Pricing Tiers</p>
        <div className="grid md:grid-cols-3 gap-4">
          {(['silver', 'gold', 'platinum'] as const).map(tier => (
            <div key={tier} className="border border-cream-300 bg-white p-6 text-center">
              <p className="font-serif text-2xl text-bark-600 mb-2">{TIER_LABELS[tier]}</p>
              <p className="font-serif text-4xl text-gold-400 mb-2">{Math.round(TIER_DISCOUNTS[tier] * 100)}<span className="text-2xl">% off</span></p>
              <p className="font-sans text-xs text-bark-400">Min order ${(TIER_MIN_ORDER_CENTS[tier] / 100).toFixed(0)}</p>
            </div>
          ))}
        </div>
        <p className="font-sans text-[10px] text-bark-400 text-center mt-4">Tier is assigned on approval and reviewed quarterly based on order volume. Platinum tier is invitation only.</p>
      </div>

      <div className="border-t border-cream-300 pt-12">
        <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark-400 mb-6">Application Process</p>
        <ol className="space-y-6">
          {[
            'Submit your business details, including reseller certificate.',
            'Our team reviews within 3–5 business days. We look for alignment with our brand and aesthetic.',
            'Approved accounts receive an email with login and tier assignment.',
            'Place orders through your wholesale dashboard. Pay by card or apply for NET-30 terms.',
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
