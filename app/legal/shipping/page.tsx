import type { Metadata } from 'next'
import { CONTACT_EMAIL } from '@/lib/site-config'
import { FREE_SHIPPING_THRESHOLD, SHIPPING, formatDollars } from '@/lib/products'
import { TRANSIT } from '@/lib/delivery'
import { LEGAL_NAME, businessAddress } from '@/lib/business-info'

export const metadata: Metadata = {
  title: 'Shipping Policy',
  description: 'Where Petite Lavande ships, shipping methods and prices, processing times, and estimated delivery times.',
  alternates: {
    canonical: '/legal/shipping',
    ...(process.env.NEXT_PUBLIC_SPANISH_ACTIVE === 'true' || process.env.SPANISH_ACTIVE === 'true'
      ? { languages: { en: '/legal/shipping', 'es-US': '/es/legal/envios', 'x-default': '/legal/shipping' } } : {}),
  },
}

// Every figure here is read from the same constants checkout and the FAQ use
// (lib/products.ts SHIPPING + FREE_SHIPPING_THRESHOLD, lib/delivery.ts TRANSIT),
// so this page cannot quote a price or transit time checkout doesn't charge.
const band = ([a, b]: [number, number]) => `${a}–${b}`
const ADDRESS = businessAddress()

export default function ShippingPolicyPage() {
  return (
    <article className="font-sans text-bark-600">
      <p className="font-sans text-[11px] tracking-[0.18em] uppercase text-gold-400 mb-4">Legal</p>
      <h1 className="font-serif text-4xl font-normal text-espresso mb-2">Shipping Policy</h1>
      <p className="text-bark-400 text-sm mb-10">Last updated: September 2026</p>

      <Section title="Where We Ship From">
        Orders are hand-packed and shipped from Seattle, Washington, USA.
      </Section>

      <Section title="Where We Ship">
        We ship within the United States only, including Alaska and Hawaii. We do not currently ship internationally.
      </Section>

      <Section title="Processing Time">
        Orders placed before 1:00 PM Pacific, Monday to Friday, are hand-packed and handed to the carrier the same day. Orders placed after 1:00 PM, or on a weekend or federal holiday, ship the next business day.
      </Section>

      <Section title="Shipping Methods & Prices">
        <ul className="mt-1 space-y-2 list-disc list-inside text-bark-500">
          <li><strong>{SHIPPING.standard.label}</strong> — {formatDollars(SHIPPING.standard.price)}, sent by USPS Ground Advantage. <strong>Free</strong> on orders of {formatDollars(FREE_SHIPPING_THRESHOLD)} or more (merchandise total, before shipping).</li>
          <li><strong>{SHIPPING.premium.label}</strong> — {formatDollars(SHIPPING.premium.price)}, {SHIPPING.premium.days} in transit after your order ships. Rush shipping is not included in the free-shipping offer.</li>
          <li><strong>{SHIPPING.sameday.label}</strong> (Seattle area only) — {formatDollars(SHIPPING.sameday.price)}. See Seattle-area same-day delivery below.</li>
        </ul>
        <span className="block mt-3">The shipping options available for your address and their prices are shown at checkout before you pay.</span>
      </Section>

      <Section title="Estimated Delivery Times (Standard Shipping)">
        Counted in business days after your order ships:
        <ul className="mt-2 space-y-1 list-disc list-inside text-bark-500">
          <li>Washington, Oregon, Idaho and Northern California: {band(TRANSIT.northwest)} business days</li>
          <li>Mountain states and Southern California: {band(TRANSIT.mountain)} business days</li>
          <li>Central US: {band(TRANSIT.central)} business days</li>
          <li>East Coast and Florida: {band(TRANSIT.east)} business days</li>
          <li>Alaska and Hawaii: {band(TRANSIT.noncontiguous)} business days</li>
        </ul>
        <span className="block mt-3">Weekends and federal holidays are not counted. Each product page shows an estimated delivery window, and you can enter your ZIP code there for estimated dates.</span>
      </Section>

      <Section title="Seattle-Area Same-Day Delivery">
        Same-day courier delivery is available only to eligible Seattle-area ZIP codes (Seattle, Shoreline and nearby Eastside cities); the option appears at checkout only when your ZIP code qualifies. Order by 1:00 PM Pacific for delivery that evening between 5–9 PM; orders placed after 1:00 PM are delivered the following evening. See <a href="/same-day-delivery" className="text-bark-600 underline underline-offset-2">Same-Day Delivery</a> for the areas we cover. We do not currently offer in-person pickup.
      </Section>

      <Section title="Carrier Delays">
        Delivery times are estimates, not guarantees. Carrier transit times may occasionally vary because of weather, peak seasons, or other circumstances outside our control, and we are not responsible for delays caused by the carrier once an order has shipped.
      </Section>

      <Section title="Tracking">
        You will receive an email with tracking information when your order ships. You can also check your order status on our <a href="/track" className="text-bark-600 underline underline-offset-2">Track Order</a> page.
      </Section>

      <Section title="Damaged, Lost or Incorrect Deliveries">
        If your order arrives damaged or incorrect, please see our <a href="/legal/returns" className="text-bark-600 underline underline-offset-2">Returns &amp; Refund Policy</a>. If your tracking shows no movement or your order has not arrived, email us and we will work with the carrier to resolve it.
      </Section>

      <Section title="Contact">
        {LEGAL_NAME}, doing business as Petite Lavande.{ADDRESS ? ` Business mailing address: ${ADDRESS}.` : ''} Questions about shipping? Email <a href={`mailto:${CONTACT_EMAIL}`} className="text-bark-600 underline underline-offset-2">{CONTACT_EMAIL}</a> or visit our <a href="/contact" className="text-bark-600 underline underline-offset-2">Contact</a> page.
      </Section>
    </article>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="font-serif text-xl text-bark-600 mb-3 font-normal">{title}</h2>
      <div className="font-sans text-sm text-bark-500 leading-relaxed">{children}</div>
    </div>
  )
}
