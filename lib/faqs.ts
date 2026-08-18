import { RETURNS_SUMMARY } from './site-config'

// Shared FAQ content — rendered on /faq (with FAQPage schema) and linked from
// every box page's buy panel. Returns/cancellation wording comes from
// site-config so it can never drift from the Returns Policy page.
export const SITE_FAQS = [
  { q: 'Can I change what\'s inside a box?', a: 'Every piece is swappable — use Build Your Own Box to choose item by item, or note a swap at checkout and we\'ll accommodate where stock allows.' },
  { q: 'Is everything baby-safe?', a: 'Every textile is organic cotton from GOTS-certified makers, and every toy meets US safety standards for newborns. Safety notes for specific items appear on their product pages.' },
  { q: 'How fast does it ship?', a: 'Same day. Orders placed before 1:00 PM Pacific, Monday to Friday, are hand-packed and handed to the carrier that same day; anything later (or over a weekend or federal holiday) goes out the next business day. At checkout you can also tell us your occasion date and we\'ll show the order-by date.' },
  { q: 'When will it arrive?', a: 'Boxes ship from Seattle by USPS Ground Advantage. Counting business days after it ships: 2–3 to Washington, Oregon, Idaho and Northern California; 3–4 to the Mountain states and Southern California; 4–5 to the Central US; 5–6 to the East Coast and Florida; 7–10 to Alaska and Hawaii. Every product page shows an estimated delivery window, and you can enter your ZIP code there for exact dates. Weekends and federal holidays are never counted.' },
  { q: 'How much is shipping?', a: 'Free over $100. Below that, standard shipping is $9.95 and rush is $28 (1–2 business days).' },
  { q: 'Can I include a gift note?', a: 'Always — you\'ll write your message before checkout and we hand-finish a card for every box. If you add the recipient\'s email, they receive a digital note when the box ships.' },
  { q: 'What if I need to cancel or return?', a: RETURNS_SUMMARY },
]
