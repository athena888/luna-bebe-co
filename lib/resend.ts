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
export async function sendWelcomeSeries2Email({ customerEmail }: { customerEmail: string }) {
  return resend.emails.send({
    from: FROM,
    to: customerEmail,
    subject: 'The story behind every box 🌿',
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#3d2c1e;">
        ${brandHeader}
        <h1 style="font-size:28px;font-weight:normal;text-align:center;margin:0 0 24px;">We don't curate. We trace.</h1>
        <div style="background:#faf7f2;border-radius:16px;padding:32px;margin-bottom:24px;">
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#5a3e28;margin:0 0 16px;">
            Every item in a Petite Lavande box is traced to its source — organic cotton garments from GOTS-certified makers, botanical bath goods, Provence lavender. The printed card in each box tells the story of every item, so the person you're gifting knows exactly what's touching their baby's skin.
          </p>
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#5a3e28;margin:0 0 24px;">
            Hand-packed in Seattle, finished with satin ribbon and a wax seal.
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
export async function sendWinBackEmail({ customerName, customerEmail }: { customerName?: string; customerEmail: string }) {
  const greeting = customerName ? `Hi ${customerName},` : 'Hi,'
  return resend.emails.send({
    from: FROM,
    to: customerEmail,
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
            Chances are someone around you is expecting — a friend, a colleague, a sister. When the moment comes, we're still here hand-packing organic gift boxes that care for the new parent as much as the baby.
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

export async function sendOrderConfirmationEmail({
  customerName,
  customerEmail,
  orderId,
  recipientName,
  total,
  trackingNumber,
  trackingUrl,
}: {
  customerName: string
  customerEmail: string
  orderId: string
  recipientName?: string
  total: number
  trackingNumber?: string
  trackingUrl?: string
}) {
  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`

  return resend.emails.send({
    from: FROM,
    to: customerEmail,
    subject: 'Your Petite Lavande box is on its way 🎀',
    html: `
      <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; color: #3d2c1e;">
        <div style="text-align: center; padding: 40px 0 24px;">
          <p style="font-family: sans-serif; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #c9a84c; margin: 0 0 8px;">Petite Lavande</p>
          <h1 style="font-size: 28px; font-weight: normal; margin: 0;">Order Confirmed</h1>
        </div>
        <div style="background: #faf7f2; border-radius: 16px; padding: 32px; margin-bottom: 24px;">
          <p style="font-family: sans-serif; font-size: 14px; line-height: 1.7; color: #5a3e28; margin: 0 0 16px;">
            Hi ${customerName},
          </p>
          <p style="font-family: sans-serif; font-size: 14px; line-height: 1.7; color: #5a3e28; margin: 0 0 8px;">
            Thank you for your order${recipientName ? ` for ${recipientName}` : ''}. We're carefully assembling your Petite Lavande box and it will be on its way soon.
          </p>
          <div style="border-top: 1px solid #e8ddd0; margin: 24px 0; padding-top: 16px;">
            <p style="font-family: sans-serif; font-size: 12px; color: #9c7c5a; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 1px;">Order Total</p>
            <p style="font-family: sans-serif; font-size: 18px; font-weight: 600; color: #3d2c1e; margin: 0;">${formatPrice(total)}</p>
          </div>
          ${trackingNumber ? `
          <div style="border-top: 1px solid #e8ddd0; padding-top: 16px;">
            <p style="font-family: sans-serif; font-size: 12px; color: #9c7c5a; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 1px;">Tracking Number</p>
            <p style="font-family: monospace; font-size: 14px; color: #3d2c1e; margin: 0;">${trackingNumber.slice(-8).toUpperCase()}</p>
          </div>
          ` : ''}
        </div>
        <p style="font-family: sans-serif; font-size: 11px; text-align: center; color: #9c7c5a; margin: 0;">
          Questions? Reply to this email — we're always here.
        </p>
      </div>
    `,
  })
}
