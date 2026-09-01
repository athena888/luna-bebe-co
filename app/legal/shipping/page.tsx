import type { Metadata } from 'next'
import { CONTACT_EMAIL, DEFECT_REPORT_WINDOW_DAYS } from '@/lib/site-config'
import { FREE_SHIPPING_THRESHOLD, SHIPPING, formatDollars } from '@/lib/products'

// The shipping policy in one place, linked from the footer. Every figure on
// this page is READ from the same constants checkout charges against
// (lib/products SHIPPING + FREE_SHIPPING_THRESHOLD), so the page cannot come
// to promise a price or a service the cart does not offer.
//
// Written to keep two things apart that the site used to blur: DISPATCH (how
// fast we hand the box to the carrier — same business day before the cutoff)
// and TRANSIT (how long the carrier then takes — 5–7 business days on
// standard). "Same-day shipping" beside "5–7 business days" reads as a
// contradiction to a reviewer; it never was one, it was two different clocks
// sharing one word.

export const metadata: Metadata = {
  title: 'Shipping Policy',
  description: 'Petite Lavande shipping policy: dispatch times, delivery estimates, shipping charges, and destinations.',
  alternates: { canonical: '/legal/shipping' },
}

const FREE_OVER = formatDollars(FREE_SHIPPING_THRESHOLD)

export default function ShippingPage() {
  return (
    <article className="font-sans text-bark-600">
      <p className="font-sans text-[11px] tracking-[0.18em] uppercase text-gold-400 mb-4">Legal</p>
      <h1 className="font-serif text-4xl font-normal text-espresso mb-2">Shipping Policy</h1>
      <p className="text-bark-400 text-sm mb-10">Last updated: September 2026</p>

      <Section title="Where We Ship">
        We currently ship within the United States, including Alaska and Hawaii. We do not ship internationally at this time.
      </Section>

      <Section title="Processing &amp; Dispatch">
        <strong>Same-day dispatch available.</strong> Orders placed before 1:00 PM Pacific Time, Monday to Friday, are typically hand-packed and handed to the carrier the same business day. Orders placed after the cutoff, at weekends, or on federal holidays are processed the next business day.
      </Section>

      <Section title="Delivery Estimates">
        Transit time is counted in business days <em>after</em> an order is dispatched, and is separate from the processing time above. Standard shipping is {SHIPPING.standard.days} in transit; {SHIPPING.premium.label.toLowerCase()} is {SHIPPING.premium.days}. Boxes ship from Seattle, so the West Coast typically arrives at the faster end of the range and the East Coast, Alaska and Hawaii at the slower end. Every product page shows an estimated delivery window, and you can enter your ZIP code there for dates specific to your address.
      </Section>

      <Section title="Shipping Charges">
        Standard shipping is <strong>free on orders of {FREE_OVER} or more</strong>. Below that it is {formatDollars(SHIPPING.standard.price)}. {SHIPPING.premium.label} is {formatDollars(SHIPPING.premium.price)} and is charged on every order regardless of total. The exact charge is shown at checkout before payment.
      </Section>

      <Section title="Same-Day Courier (Seattle Area)">
        For a limited set of Seattle and Eastside ZIP codes, a same-day courier option ({formatDollars(SHIPPING.sameday.price)}) appears at checkout when your delivery ZIP qualifies. If it does not appear, the option is not available for that address.
      </Section>

      <Section title="Delays">
        Delivery estimates are carrier estimates, not guarantees. Weather, peak-season volume, carrier disruption and federal holidays can extend transit, and those delays are outside our control. Weekends and federal holidays are never counted as business days.
      </Section>

      <Section title="Damaged or Incorrect Deliveries">
        If your order arrives damaged or is not what you ordered, contact us within {DEFECT_REPORT_WINDOW_DAYS} days of delivery and we will make it right. See our <a href="/legal/returns" className="text-bark-600 underline underline-offset-2">Returns &amp; Refund Policy</a> for full details.
      </Section>

      <Section title="Questions">
        Email <a href={`mailto:${CONTACT_EMAIL}`} className="text-bark-600 underline underline-offset-2">{CONTACT_EMAIL}</a> and we aim to respond within 24 hours.
      </Section>
    </article>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="font-serif text-xl text-bark-600 mb-3 font-normal">{title}</h2>
      <p className="font-sans text-sm text-bark-500 leading-relaxed">{children}</p>
    </div>
  )
}
