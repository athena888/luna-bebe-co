import { Resend } from 'resend'
import { CONTACT_EMAIL } from '@/lib/site-config'
import { unsubscribeUrl } from '@/lib/unsubscribe'

export const resend = new Resend(process.env.RESEND_API_KEY!)

const FROM = `Petite Lavande <${CONTACT_EMAIL}>`
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

// Marketing/flow emails carry UTMs so GA4 can attribute email revenue
// (utm_source=email is what the analytics page and scorecard count).
function utm(path: string, campaign: string) {
  return `${BASE_URL}${path}${path.includes('?') ? '&' : '?'}utm_source=email&utm_medium=email&utm_campaign=${campaign}`
}

const brandHeader = `
  <div style="text-align:center;padding:40px 0 24px;">
    <p style="font-family:sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#c9a84c;margin:0 0 8px;">Petite Lavande</p>
  </div>
`
const brandFooter = `
  <div style="text-align:center;padding:24px 0 40px;">
    <p style="font-family:sans-serif;font-size:11px;color:#9c7c5a;margin:0 0 6px;">
      Questions? Reply to this email — we're always here.
    </p>
    <p style="font-family:sans-serif;font-size:10px;color:#c2a88a;margin:0;">
      <a href="${BASE_URL}/legal/terms" style="color:#c2a88a;text-decoration:none;">Terms</a> &nbsp;·&nbsp;
      <a href="${BASE_URL}/legal/privacy" style="color:#c2a88a;text-decoration:none;">Privacy</a> &nbsp;·&nbsp;
      <a href="${BASE_URL}/legal/returns" style="color:#c2a88a;text-decoration:none;">Returns</a>
    </p>
  </div>
`

// RFC 8058 one-click unsubscribe headers for marketing sends — mailbox
// providers (Gmail/Yahoo bulk-sender rules) require these alongside the
// footer link. The unsubscribe endpoint accepts the RFC's POST.
function unsubHeaders(email: string) {
  return {
    'List-Unsubscribe': `<${unsubscribeUrl(email)}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  }
}

// Footer for marketing/flow emails — brandFooter plus the required
// unsubscribe link (CAN-SPAM). Transactional emails keep the plain footer.
function flowFooter(email: string) {
  return `
  <div style="text-align:center;padding:24px 0 40px;">
    <p style="font-family:sans-serif;font-size:11px;color:#9c7c5a;margin:0 0 6px;">
      Questions? Reply to this email — we're always here.
    </p>
    <p style="font-family:sans-serif;font-size:10px;color:#c2a88a;margin:0;">
      <a href="${BASE_URL}/legal/terms" style="color:#c2a88a;text-decoration:none;">Terms</a> &nbsp;·&nbsp;
      <a href="${BASE_URL}/legal/privacy" style="color:#c2a88a;text-decoration:none;">Privacy</a> &nbsp;·&nbsp;
      <a href="${unsubscribeUrl(email)}" style="color:#c2a88a;text-decoration:underline;">Unsubscribe</a>
    </p>
  </div>
`
}

// Plain-text alert to the team when a corporate inquiry comes in. Reply-to is
// the lead so it can be answered directly.
export async function sendCorporateInquiryEmail(lead: {
  name?: string | null; email: string; company?: string | null
  company_size?: string | null; needs?: string | null; gifts_per_year?: string | null
}) {
  const text = [
    `Company:        ${lead.company || '—'}`,
    `Name:           ${lead.name || '—'}`,
    `Work email:     ${lead.email}`,
    `Company size:   ${lead.company_size || '—'}`,
    `Gifts per year: ${lead.gifts_per_year || '—'}`,
    '',
    'What they need:',
    lead.needs || '—',
    '',
    '— Respond today. This is a corporate lead (Portal → Outreach).',
  ].join('\n')
  return resend.emails.send({
    from: FROM,
    to: CONTACT_EMAIL,
    replyTo: lead.email,
    subject: `Corporate inquiry: ${lead.company || lead.name || lead.email}`,
    text,
  })
}

export async function sendWelcomeEmail({
  customerName,
  customerEmail,
}: {
  customerName?: string
  customerEmail: string
}) {
  const greeting = customerName ? `Welcome, ${customerName}` : 'Welcome'
  return resend.emails.send({
    from: FROM,
    to: customerEmail,
    headers: unsubHeaders(customerEmail),
    subject: 'Welcome to Petite Lavande ✨',
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#3d2c1e;">
        ${brandHeader}
        <h1 style="font-size:28px;font-weight:normal;text-align:center;margin:0 0 24px;">${greeting}</h1>
        <div style="background:#faf7f2;border-radius:16px;padding:32px;margin-bottom:24px;">
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#5a3e28;margin:0 0 16px;">
            We're so glad you're here. Petite Lavande was born out of a love for new life — every box we create is handcrafted with organic materials, curated with intention, and packed with dried lavender and a wax seal because every detail matters.
          </p>
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#5a3e28;margin:0 0 24px;">
            Use code <strong>WELCOME10</strong> for 10% off your first order.
          </p>
          <div style="text-align:center;">
            <a href="${utm('/build', 'welcome')}" style="display:inline-block;background:#c9a84c;color:#3d2c1e;font-family:sans-serif;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:14px 32px;border-radius:100px;">
              Build Your Box
            </a>
          </div>
        </div>
        ${flowFooter(customerEmail)}
      </div>
    `,
  })
}

// Welcome series step 2 (D+2) — the story and what makes the boxes different.
// Build 7 — segment-aware copy. Variants apply only while SEGMENTS_ACTIVE
// (copy approval pending in MARKETING_COPY.md); otherwise everyone gets the
// default paragraph. 'unknown' and 'corporate' always get the default.
const SEGMENTS_ACTIVE = process.env.SEGMENTS_ACTIVE === 'true'
type CopySegment = 'parent_to_be' | 'grandparent' | 'friend_coworker' | 'corporate' | 'unknown'

const WELCOME2_OPENERS: Partial<Record<CopySegment, string>> = {
  parent_to_be: `Every item that will touch your baby's skin is traced to its source — organic cotton garments from GOTS-certified makers, botanical bath goods, Provence lavender. The printed card in each box tells the story of every piece.`,
  grandparent: `A grandbaby changes everything. Every item in the box you send is traced to its source — organic cotton garments from GOTS-certified makers, botanical bath goods, Provence lavender — and the printed card inside tells the story of every piece.`,
  friend_coworker: `The best gift for a new parent is the one they'd never think to buy themselves. Every item is traced to its source — organic cotton garments from GOTS-certified makers, botanical bath goods, Provence lavender — and the printed card inside tells its story.`,
}

const WINBACK_OPENERS: Partial<Record<CopySegment, string>> = {
  parent_to_be: `The newborn days go quickly. Whether the next moment is a sibling on the way, a friend's arrival, or a first birthday, we're still here hand-packing organic gift boxes that care for the new parent as much as the baby.`,
  grandparent: `Grandbabies have a way of multiplying — a cousin on the way, a first birthday coming up. When the next moment arrives, we're still here hand-packing organic gift boxes that care for the new parent as much as the baby.`,
}

function pickOpener(variants: Partial<Record<CopySegment, string>>, fallback: string, segment?: CopySegment): string {
  if (!SEGMENTS_ACTIVE || !segment) return fallback
  return variants[segment] ?? fallback
}

export async function sendWelcomeSeries2Email({ customerEmail, segment }: { customerEmail: string; segment?: CopySegment }) {
  const opener = pickOpener(
    WELCOME2_OPENERS,
    `Every item in a Petite Lavande box is traced to its source — organic cotton garments from GOTS-certified makers, botanical bath goods, Provence lavender. The printed card in each box tells the story of every item, so the person you're gifting knows exactly what's touching their baby's skin.`,
    segment
  )
  return resend.emails.send({
    from: FROM,
    to: customerEmail,
    headers: unsubHeaders(customerEmail),
    subject: 'The story behind every box 🌿',
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#3d2c1e;">
        ${brandHeader}
        <h1 style="font-size:28px;font-weight:normal;text-align:center;margin:0 0 24px;">We don't curate. We trace.</h1>
        <div style="background:#faf7f2;border-radius:16px;padding:32px;margin-bottom:24px;">
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#5a3e28;margin:0 0 16px;">
            ${opener}
          </p>
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#5a3e28;margin:0 0 24px;">
            Hand-packed and finished with satin ribbon and a wax seal.
          </p>
          <div style="text-align:center;">
            <a href="${utm('/boxes', 'welcome')}" style="display:inline-block;background:#c9a84c;color:#3d2c1e;font-family:sans-serif;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:14px 32px;border-radius:100px;">
              See the Boxes
            </a>
          </div>
        </div>
        ${flowFooter(customerEmail)}
      </div>
    `,
  })
}

// Welcome series step 3 (D+4) — gentle nudge with the code reminder.
export async function sendWelcomeSeries3Email({ customerEmail }: { customerEmail: string }) {
  return resend.emails.send({
    from: FROM,
    to: customerEmail,
    headers: unsubHeaders(customerEmail),
    subject: 'Still deciding? Your 10% is waiting ✨',
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#3d2c1e;">
        ${brandHeader}
        <h1 style="font-size:28px;font-weight:normal;text-align:center;margin:0 0 24px;">Not sure which box?</h1>
        <div style="background:#faf7f2;border-radius:16px;padding:32px;margin-bottom:24px;">
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#5a3e28;margin:0 0 16px;">
            Tell us who you're gifting and our gift guide will point you to the right box — for a new mama, a newborn, or both. Or build your own from scratch, item by item.
          </p>
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#5a3e28;margin:0 0 24px;">
            Your <strong>WELCOME10</strong> code still takes 10% off your first order.
          </p>
          <div style="text-align:center;">
            <a href="${utm('/guide', 'welcome')}" style="display:inline-block;background:#c9a84c;color:#3d2c1e;font-family:sans-serif;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:14px 32px;border-radius:100px;">
              Find the Right Box
            </a>
          </div>
        </div>
        ${flowFooter(customerEmail)}
      </div>
    `,
  })
}

// Win-back — one email when a customer's last order is 75+ days old.
export async function sendWinBackEmail({ customerName, customerEmail, segment }: { customerName?: string; customerEmail: string; segment?: CopySegment }) {
  const greeting = customerName ? `Hi ${customerName},` : 'Hi,'
  const opener = pickOpener(
    WINBACK_OPENERS,
    `Chances are someone around you is expecting — a friend, a colleague, a sister. When the moment comes, we're still here hand-packing organic gift boxes that care for the new parent as much as the baby.`,
    segment
  )
  return resend.emails.send({
    from: FROM,
    to: customerEmail,
    headers: unsubHeaders(customerEmail),
    subject: 'A little lavender, from us to you 💛',
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#3d2c1e;">
        ${brandHeader}
        <h1 style="font-size:28px;font-weight:normal;text-align:center;margin:0 0 24px;">It's been a while</h1>
        <div style="background:#faf7f2;border-radius:16px;padding:32px;margin-bottom:24px;">
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#5a3e28;margin:0 0 16px;">
            ${greeting}
          </p>
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#5a3e28;margin:0 0 24px;">
            ${opener}
          </p>
          <div style="text-align:center;">
            <a href="${utm('/boxes', 'winback')}" style="display:inline-block;background:#c9a84c;color:#3d2c1e;font-family:sans-serif;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:14px 32px;border-radius:100px;">
              See What's New
            </a>
          </div>
        </div>
        ${flowFooter(customerEmail)}
      </div>
    `,
  })
}

// Build 1 upgrade — second abandoned-cart touch, D+3 after the first. No
// discount on purpose (a rescue code would train cart-abandoning). Gated by
// CART_SEQUENCE_ACTIVE via the cron; copy in MARKETING_COPY.md.
export async function sendCartReminder2Email({ customerEmail }: { customerEmail: string }) {
  return resend.emails.send({
    from: FROM,
    to: customerEmail,
    headers: unsubHeaders(customerEmail),
    subject: 'Your box is still saved 🌿',
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#3d2c1e;">
        ${brandHeader}
        <h1 style="font-size:28px;font-weight:normal;text-align:center;margin:0 0 24px;">Right where you left it</h1>
        <div style="background:#faf7f2;border-radius:16px;padding:32px;margin-bottom:24px;">
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#5a3e28;margin:0 0 16px;">
            The box you built is still saved, exactly as you left it. If the moment passed, no worries at all — but if that gift is still on your mind, everything is ready to finish in a minute or two.
          </p>
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#5a3e28;margin:0 0 24px;">
            Hand-packed within 24 hours of your order, finished with satin ribbon and a wax seal.
          </p>
          <div style="text-align:center;">
            <a href="${utm('/checkout', 'cart')}" style="display:inline-block;background:#c9a84c;color:#3d2c1e;font-family:sans-serif;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:14px 32px;border-radius:100px;">
              Pick Up Where You Left Off
            </a>
          </div>
        </div>
        ${flowFooter(customerEmail)}
      </div>
    `,
  })
}

// Build 3 occasion flow — one email ~30 days before a due date the customer
// asked us to remember. Gated by OCCASIONS_ACTIVE via the scheduler; copy in
// MARKETING_COPY.md, inactive until approved.
export async function sendOccasionDueEmail({ customerEmail }: { customerEmail: string }) {
  return resend.emails.send({
    from: FROM,
    to: customerEmail,
    headers: unsubHeaders(customerEmail),
    subject: 'The big day is getting close 🌿',
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#3d2c1e;">
        ${brandHeader}
        <h1 style="font-size:28px;font-weight:normal;text-align:center;margin:0 0 24px;">Almost time</h1>
        <div style="background:#faf7f2;border-radius:16px;padding:32px;margin-bottom:24px;">
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#5a3e28;margin:0 0 16px;">
            The arrival you asked us to remember is only a few weeks away now. If a gift is part of the plan, this is the window — every box is packed by hand and ships with time to spare.
          </p>
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#5a3e28;margin:0 0 24px;">
            Organic keepsakes, chosen piece by piece, sealed with wax and ribbon.
          </p>
          <div style="text-align:center;">
            <a href="${utm('/build', 'occasion')}" style="display:inline-block;background:#c9a84c;color:#3d2c1e;font-family:sans-serif;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:14px 32px;border-radius:100px;">
              Build Their Box
            </a>
          </div>
        </div>
        ${flowFooter(customerEmail)}
      </div>
    `,
  })
}

// Build 3 — ~21 days before a remembered baby birthday, every year.
export async function sendOccasionBirthdayEmail({ customerEmail }: { customerEmail: string }) {
  return resend.emails.send({
    from: FROM,
    to: customerEmail,
    headers: unsubHeaders(customerEmail),
    subject: 'A little birthday is coming up 💛',
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#3d2c1e;">
        ${brandHeader}
        <h1 style="font-size:28px;font-weight:normal;text-align:center;margin:0 0 24px;">A day worth celebrating</h1>
        <div style="background:#faf7f2;border-radius:16px;padding:32px;margin-bottom:24px;">
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#5a3e28;margin:0 0 16px;">
            A birthday you asked us to remember is a few weeks out. A box of organic keepsakes — soft things to grow into, gentle things for the bath — is a lovely way to mark the day.
          </p>
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#5a3e28;margin:0 0 24px;">
            Hand-packed, finished with satin ribbon and a wax seal, with your message inside.
          </p>
          <div style="text-align:center;">
            <a href="${utm('/boxes', 'occasion')}" style="display:inline-block;background:#c9a84c;color:#3d2c1e;font-family:sans-serif;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:14px 32px;border-radius:100px;">
              See the Boxes
            </a>
          </div>
        </div>
        ${flowFooter(customerEmail)}
      </div>
    `,
  })
}

// Build 6 referral loop — sent to the ORIGINAL buyer when a friend redeems
// their code. Fires only while REFERRALS_ACTIVE (webhook gates the call);
// copy lives in MARKETING_COPY.md and ships inactive until approved.
export async function sendReferralRewardEmail({ customerEmail, code }: { customerEmail: string; code: string }) {
  return resend.emails.send({
    from: FROM,
    to: customerEmail,
    headers: unsubHeaders(customerEmail),
    subject: 'A friend used your code — here\'s $15, from us 💛',
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#3d2c1e;">
        ${brandHeader}
        <h1 style="font-size:28px;font-weight:normal;text-align:center;margin:0 0 24px;">Your gift inspired another</h1>
        <div style="background:#faf7f2;border-radius:16px;padding:32px;margin-bottom:24px;">
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#5a3e28;margin:0 0 16px;">
            Someone you shared Petite Lavande with just sent a box of their own. As a thank-you, here's $15 off your next order:
          </p>
          <p style="text-align:center;margin:0 0 24px;">
            <span style="display:inline-block;font-family:monospace;font-size:20px;letter-spacing:2px;background:#fff;border:1px dashed #c9a84c;border-radius:8px;padding:12px 24px;color:#3d2c1e;">${code}</span>
          </p>
          <div style="text-align:center;">
            <a href="${utm('/build', 'referral')}" style="display:inline-block;background:#c9a84c;color:#3d2c1e;font-family:sans-serif;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:14px 32px;border-radius:100px;">
              Build Your Next Box
            </a>
          </div>
        </div>
        ${flowFooter(customerEmail)}
      </div>
    `,
  })
}

export async function sendReviewRequestEmail({
  customerName,
  customerEmail,
  orderId,
  selectedItems,
}: {
  customerName: string
  customerEmail: string
  orderId: string
  selectedItems: Array<{ id: string; name: string }>
}) {
  const itemLinks = selectedItems.slice(0, 3).map(item =>
    `<li style="margin-bottom:8px;"><a href="${utm(`/products/${item.id}`, 'postpurchase')}" style="font-family:sans-serif;font-size:14px;color:#c9a84c;text-decoration:none;">${item.name}</a></li>`
  ).join('')
  // CTA goes to the first item's product page — the review form lives there.
  const reviewHref = selectedItems[0]
    ? utm(`/products/${selectedItems[0].id}`, 'postpurchase')
    : utm(`/track?ref=${orderId.slice(-8).toUpperCase()}`, 'postpurchase')

  return resend.emails.send({
    from: FROM,
    to: customerEmail,
    headers: unsubHeaders(customerEmail),
    subject: 'How was your Petite Lavande box? 🌿',
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#3d2c1e;">
        ${brandHeader}
        <h1 style="font-size:28px;font-weight:normal;text-align:center;margin:0 0 24px;">We'd love your thoughts</h1>
        <div style="background:#faf7f2;border-radius:16px;padding:32px;margin-bottom:24px;">
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#5a3e28;margin:0 0 16px;">
            Hi ${customerName}, we hope your Petite Lavande box arrived beautifully and brought a little joy. Your review helps other families discover these products — it would mean the world to us.
          </p>
          ${selectedItems.length > 0 ? `<ul style="padding-left:20px;margin:0 0 24px;">${itemLinks}</ul>` : ''}
          <div style="text-align:center;">
            <a href="${reviewHref}" style="display:inline-block;background:#c9a84c;color:#3d2c1e;font-family:sans-serif;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:14px 32px;border-radius:100px;">
              Leave a Review
            </a>
          </div>
        </div>
        ${flowFooter(customerEmail)}
      </div>
    `,
  })
}

export async function sendAbandonedCartEmail({
  customerName,
  customerEmail,
  orderId,
}: {
  customerName: string
  customerEmail: string
  orderId: string
}) {
  return resend.emails.send({
    from: FROM,
    to: customerEmail,
    headers: unsubHeaders(customerEmail),
    subject: 'Your Petite Lavande box is waiting ✨',
    html: `
      <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; color: #3d2c1e;">
        <div style="text-align: center; padding: 40px 0 24px;">
          <p style="font-family: sans-serif; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #c9a84c; margin: 0 0 8px;">Petite Lavande</p>
          <h1 style="font-size: 28px; font-weight: normal; margin: 0;">Your box is waiting</h1>
        </div>
        <div style="background: #faf7f2; border-radius: 16px; padding: 32px; margin-bottom: 24px;">
          <p style="font-family: sans-serif; font-size: 14px; line-height: 1.7; color: #5a3e28; margin: 0 0 16px;">
            Hi ${customerName},
          </p>
          <p style="font-family: sans-serif; font-size: 14px; line-height: 1.7; color: #5a3e28; margin: 0 0 24px;">
            You started building a beautiful gift box but didn't quite finish. Your selections are saved — all you need to do is complete checkout.
          </p>
          <div style="text-align: center;">
            <a href="${utm('/build', 'abandonedcart')}" style="display: inline-block; background: #c9a84c; color: #3d2c1e; font-family: sans-serif; font-size: 13px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; text-decoration: none; padding: 14px 32px; border-radius: 100px;">
              Complete My Box
            </a>
          </div>
        </div>
        ${flowFooter(customerEmail)}
      </div>
    `,
  })
}

export async function sendGiftCardEmail({
  recipientName,
  recipientEmail,
  senderName,
  message,
  amount,
  code,
}: {
  recipientName: string
  recipientEmail: string
  senderName: string
  message?: string
  amount: number
  code: string
}) {
  const formatted = `$${(amount / 100).toFixed(0)}`
  return resend.emails.send({
    from: FROM,
    to: recipientEmail,
    subject: `${senderName} sent you a Petite Lavande gift card 🎀`,
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#3d2c1e;">
        ${brandHeader}
        <h1 style="font-size:28px;font-weight:normal;text-align:center;margin:0 0 8px;">You've received a gift</h1>
        <p style="font-family:sans-serif;font-size:14px;text-align:center;color:#9c7c5a;margin:0 0 32px;">From ${senderName}, with love</p>
        <div style="background:#faf7f2;border-radius:16px;padding:32px;margin-bottom:24px;">
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#5a3e28;margin:0 0 16px;">
            Hi ${recipientName},
          </p>
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#5a3e28;margin:0 0 24px;">
            ${senderName} has gifted you a <strong>${formatted} Petite Lavande gift card</strong>. Use the code below to build your own luxury baby gift box.
          </p>
          ${message ? `
          <div style="border-left:3px solid #c9a84c;padding:12px 16px;margin-bottom:24px;">
            <p style="font-family:Georgia,serif;font-size:15px;font-style:italic;color:#5a3e28;margin:0;">"${message}"</p>
          </div>
          ` : ''}
          <div style="background:#fff;border:2px dashed #c9a84c;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
            <p style="font-family:sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#9c7c5a;margin:0 0 8px;">Your Gift Code</p>
            <p style="font-family:monospace;font-size:28px;font-weight:bold;color:#3d2c1e;letter-spacing:4px;margin:0;">${code}</p>
            <p style="font-family:sans-serif;font-size:12px;color:#9c7c5a;margin:8px 0 0;">Worth ${formatted} · Valid forever</p>
          </div>
          <div style="text-align:center;">
            <a href="${BASE_URL}/build" style="display:inline-block;background:#c9a84c;color:#3d2c1e;font-family:sans-serif;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:14px 32px;border-radius:100px;">
              Build Your Box
            </a>
          </div>
        </div>
        <p style="font-family:sans-serif;font-size:12px;text-align:center;color:#9c7c5a;margin:0 0 4px;">Enter your code at checkout to redeem it.</p>
        ${brandFooter}
      </div>
    `,
  })
}

// Distinct "your box has shipped" email — separate from order confirmation so
// the customer gets a shipped notice, not a second confirmation-looking email.
export async function sendShippingNotificationEmail({
  customerName,
  customerEmail,
  recipientName,
  trackingNumber,
  trackingUrl,
}: {
  customerName: string
  customerEmail: string
  recipientName?: string
  trackingNumber?: string
  trackingUrl?: string
}) {
  return resend.emails.send({
    from: FROM,
    to: customerEmail,
    subject: 'Your Petite Lavande box has shipped 📦',
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#ffffff;">
        <div style="text-align:center;padding:44px 0 24px;">
          <p style="font-family:sans-serif;font-size:12px;letter-spacing:4px;text-transform:uppercase;color:#c9a84c;margin:0 0 6px;">Petite Lavande</p>
          <p style="font-family:Georgia,serif;font-style:italic;font-size:13px;color:#9c7c5a;margin:0;">Fait avec amour, pour vous</p>
        </div>
        <div style="background:#7A8E7C;padding:36px 32px;margin:0 4px 24px;">
          <h1 style="font-family:Georgia,serif;font-size:26px;font-weight:normal;color:#ffffff;text-align:center;margin:0 0 22px;">On Its Way</h1>
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#ffffff;margin:0 0 6px;">Hi ${customerName},</p>
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#ffffff;margin:0 0 6px;">
            Your box${recipientName ? ` for ${recipientName}` : ''} shipped today and is on its way.
          </p>
          ${trackingNumber ? `
          <div style="border:1px dashed rgba(255,255,255,0.6);padding:20px;text-align:center;margin:22px 0 0;">
            <p style="font-family:sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.75);margin:0 0 6px;">Tracking number</p>
            <p style="font-family:monospace;font-size:15px;letter-spacing:1px;color:#ffffff;margin:0;">${trackingNumber}</p>
            ${trackingUrl ? `
            <a href="${trackingUrl}" style="display:inline-block;border:1px solid #ffffff;color:#ffffff;background:transparent;font-family:sans-serif;font-size:11px;font-weight:600;letter-spacing:3px;text-transform:uppercase;text-decoration:none;padding:14px 34px;margin-top:18px;">Track Your Box</a>` : ''}
          </div>` : ''}
        </div>
        ${brandFooter}
      </div>
    `,
  })
}

// Auto-acknowledgment to someone who submits the Corporate & Team Gifting form,
// so they know we received it. Transactional (their own inquiry) — plain footer.
export async function sendCorporateInquiryReceiptEmail({
  name,
  email,
}: {
  name?: string | null
  email: string
}) {
  const greeting = name ? `Hi ${name},` : 'Hi there,'
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: 'We received your corporate gifting inquiry 🌿',
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#3d2c1e;">
        ${brandHeader}
        <h1 style="font-size:28px;font-weight:normal;text-align:center;margin:0 0 24px;">Thank you for reaching out</h1>
        <div style="background:#faf7f2;border-radius:16px;padding:32px;margin-bottom:24px;">
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#5a3e28;margin:0 0 16px;">${greeting}</p>
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#5a3e28;margin:0 0 16px;">
            We've received your corporate & team gifting inquiry and someone from our team will be in touch within one business day to help design the right gifting experience for you.
          </p>
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#5a3e28;margin:0;">
            In the meantime, feel free to reply to this email with anything else you'd like us to know.
          </p>
        </div>
        ${brandFooter}
      </div>
    `,
  })
}

// Refund confirmation to the customer. Transactional — plain footer.
export async function sendRefundEmail({
  customerName,
  customerEmail,
  amount,
  orderId,
}: {
  customerName: string
  customerEmail: string
  amount: number
  orderId: string
}) {
  const formatted = `$${(amount / 100).toFixed(2)}`
  return resend.emails.send({
    from: FROM,
    to: customerEmail,
    subject: 'Your Petite Lavande refund has been processed',
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#3d2c1e;">
        ${brandHeader}
        <h1 style="font-size:28px;font-weight:normal;text-align:center;margin:0 0 24px;">Refund Processed</h1>
        <div style="background:#faf7f2;border-radius:16px;padding:32px;margin-bottom:24px;">
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#5a3e28;margin:0 0 16px;">Hi ${customerName},</p>
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#5a3e28;margin:0 0 16px;">
            We've processed a refund of <strong>${formatted}</strong> for your order. Depending on your bank, it may take 5–10 business days to appear on your statement.
          </p>
          <div style="border-top:1px solid #e8ddd0;padding-top:16px;">
            <p style="font-family:sans-serif;font-size:12px;color:#9c7c5a;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px;">Order Reference</p>
            <p style="font-family:monospace;font-size:14px;color:#3d2c1e;margin:0;">#${orderId.slice(-8).toUpperCase()}</p>
          </div>
        </div>
        ${brandFooter}
      </div>
    `,
  })
}

// Internal alert when Stripe opens a dispute/chargeback — respond fast (evidence
// deadlines are tight). Plain text to the team.
export async function sendDisputeAlertEmail(dispute: {
  orderId?: string | null
  amount: number
  reason?: string | null
  customerEmail?: string | null
}) {
  const text = [
    '⚠️  A payment dispute (chargeback) was opened.',
    '',
    `Order:     ${dispute.orderId ? `#${dispute.orderId.slice(-8).toUpperCase()}` : '— (not matched to an order)'}`,
    `Amount:    $${(dispute.amount / 100).toFixed(2)}`,
    `Reason:    ${dispute.reason || '—'}`,
    `Customer:  ${dispute.customerEmail || '—'}`,
    '',
    'Respond in Stripe Dashboard → Payments → Disputes before the evidence deadline.',
  ].join('\n')
  return resend.emails.send({
    from: FROM,
    to: process.env.ADMIN_EMAIL || CONTACT_EMAIL,
    subject: `Payment dispute opened — $${(dispute.amount / 100).toFixed(2)}`,
    text,
  })
}

export async function sendOrderConfirmationEmail({
  customerName,
  customerEmail,
  orderId,
  recipientName,
  total,
  trackingNumber,
  trackingUrl,
  items,
  referralCode,
}: {
  customerName: string
  customerEmail: string
  orderId: string
  recipientName?: string
  total: number
  trackingNumber?: string
  trackingUrl?: string
  items?: Array<{ id?: string; name: string; price?: number; qty?: number; image?: string | null }>
  referralCode?: string | null
}) {
  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`
  const ref = (trackingNumber ?? orderId).slice(-8).toUpperCase()
  const supa = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const imgOf = (i: { id?: string; image?: string | null }) =>
    i.image || (i.id && supa ? `${supa}/storage/v1/object/public/product-images/${i.id}.jpg` : null)

  const itemRows = (items ?? []).map(i => {
    const qty = i.qty ?? 1
    const img = imgOf(i)
    return `
    <tr>
      <td style="padding:9px 0;border-bottom:1px solid rgba(255,255,255,0.25);width:52px;vertical-align:middle;">
        ${img ? `<img src="${img}" width="44" height="44" alt="" style="display:block;width:44px;height:44px;object-fit:cover;border-radius:6px;" />` : ''}
      </td>
      <td style="padding:9px 0 9px 12px;border-bottom:1px solid rgba(255,255,255,0.25);vertical-align:middle;">
        <p style="font-family:sans-serif;font-size:13px;color:#ffffff;margin:0 0 2px;">${i.name}</p>
        <p style="font-family:sans-serif;font-size:11px;color:rgba(255,255,255,0.75);margin:0;">Qty ${qty}${i.price != null ? ` · ${formatPrice(i.price)} each` : ''}</p>
      </td>
      ${i.price != null ? `<td style="padding:9px 0;border-bottom:1px solid rgba(255,255,255,0.25);text-align:right;vertical-align:middle;font-family:sans-serif;font-size:13px;color:#ffffff;white-space:nowrap;">${formatPrice(i.price * qty)}</td>` : '<td style="border-bottom:1px solid rgba(255,255,255,0.25);"></td>'}
    </tr>`
  }).join('')

  return resend.emails.send({
    from: FROM,
    to: customerEmail,
    subject: 'Your Petite Lavande order is confirmed',
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#ffffff;">
        <div style="text-align:center;padding:44px 0 24px;">
          <p style="font-family:sans-serif;font-size:12px;letter-spacing:4px;text-transform:uppercase;color:#c9a84c;margin:0 0 6px;">Petite Lavande</p>
          <p style="font-family:Georgia,serif;font-style:italic;font-size:13px;color:#9c7c5a;margin:0;">Fait avec amour, pour vous</p>
        </div>
        <div style="background:#7A8E7C;padding:36px 32px;margin:0 4px 24px;">
          <h1 style="font-family:Georgia,serif;font-size:26px;font-weight:normal;color:#ffffff;text-align:center;margin:0 0 22px;">Order Confirmed</h1>
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#ffffff;margin:0 0 6px;">Hi ${customerName},</p>
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#ffffff;margin:0 0 6px;">
            Thank you${recipientName ? ` — what a lovely thing to send ${recipientName}` : ' for your order'}. We are preparing your box by hand now.
          </p>
          ${itemRows ? `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 0;border-top:1px solid rgba(255,255,255,0.25);">
            ${itemRows}
          </table>` : ''}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0 0;">
            <tr>
              <td style="font-family:sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.75);padding:6px 0;">Order total</td>
              <td style="font-family:Georgia,serif;font-size:20px;color:#ffffff;text-align:right;padding:6px 0;">${formatPrice(total)}</td>
            </tr>
            <tr>
              <td style="font-family:sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.75);padding:6px 0;">Order reference</td>
              <td style="font-family:monospace;font-size:13px;color:#ffffff;text-align:right;padding:6px 0;">${ref}</td>
            </tr>
          </table>
          ${trackingUrl ? `
          <div style="text-align:center;margin-top:26px;">
            <a href="${trackingUrl}" style="display:inline-block;border:1px solid #ffffff;color:#ffffff;background:transparent;font-family:sans-serif;font-size:11px;font-weight:600;letter-spacing:3px;text-transform:uppercase;text-decoration:none;padding:14px 34px;">Track Your Order</a>
          </div>` : ''}
        </div>
        ${referralCode ? `
        <div style="background:#7A8E7C;padding:24px 30px;margin:0 4px 24px;">
          <h2 style="font-family:Georgia,serif;font-size:19px;font-weight:normal;color:#ffffff;margin:0 0 8px;">Give $15, get $15</h2>
          <p style="font-family:sans-serif;font-size:13px;line-height:1.7;color:rgba(255,255,255,0.92);margin:0;">
            Your personal code <span style="font-family:monospace;letter-spacing:2px;background:rgba(255,255,255,0.14);border:1px solid rgba(255,255,255,0.5);border-radius:6px;padding:2px 8px;color:#ffffff;">${referralCode}</span> gives a friend $15 off their first box — and when they use it, you get $15 off your next one.
          </p>
        </div>` : ''}
        <p style="font-family:sans-serif;font-size:12px;text-align:center;color:#9c7c5a;margin:0 0 4px;">We will email again the moment it ships.</p>
        ${brandFooter}
      </div>
    `,
  })
}
