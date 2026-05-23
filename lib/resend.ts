import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY!)

const FROM = 'La Lumière & Co. <hello@lalumiercollective.com>'
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

const brandHeader = `
  <div style="text-align:center;padding:40px 0 24px;">
    <p style="font-family:sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#c9a84c;margin:0 0 8px;">La Lumière & Co.</p>
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

export async function sendWelcomeEmail({
  customerName,
  customerEmail,
}: {
  customerName: string
  customerEmail: string
}) {
  return resend.emails.send({
    from: FROM,
    to: customerEmail,
    subject: 'Welcome to La Lumière & Co. ✨',
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#3d2c1e;">
        ${brandHeader}
        <h1 style="font-size:28px;font-weight:normal;text-align:center;margin:0 0 24px;">Welcome, ${customerName}</h1>
        <div style="background:#faf7f2;border-radius:16px;padding:32px;margin-bottom:24px;">
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#5a3e28;margin:0 0 16px;">
            We're so glad you're here. La Lumière was born out of a love for new life — every box we create is handcrafted with organic materials, curated with intention, and packed with dried lavender and a wax seal because every detail matters.
          </p>
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#5a3e28;margin:0 0 24px;">
            Use code <strong>WELCOME10</strong> for 10% off your first order.
          </p>
          <div style="text-align:center;">
            <a href="${BASE_URL}/build" style="display:inline-block;background:#c9a84c;color:#3d2c1e;font-family:sans-serif;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:14px 32px;border-radius:100px;">
              Build Your Box
            </a>
          </div>
        </div>
        ${brandFooter}
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
    `<li style="margin-bottom:8px;"><a href="${BASE_URL}/products/${item.id}" style="font-family:sans-serif;font-size:14px;color:#c9a84c;text-decoration:none;">${item.name}</a></li>`
  ).join('')

  return resend.emails.send({
    from: FROM,
    to: customerEmail,
    subject: 'How was your La Lumière box? 🌿',
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#3d2c1e;">
        ${brandHeader}
        <h1 style="font-size:28px;font-weight:normal;text-align:center;margin:0 0 24px;">We'd love your thoughts</h1>
        <div style="background:#faf7f2;border-radius:16px;padding:32px;margin-bottom:24px;">
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#5a3e28;margin:0 0 16px;">
            Hi ${customerName}, we hope your La Lumière box arrived beautifully and brought a little joy. Your review helps other families discover these products — it would mean the world to us.
          </p>
          ${selectedItems.length > 0 ? `<ul style="padding-left:20px;margin:0 0 24px;">${itemLinks}</ul>` : ''}
          <div style="text-align:center;">
            <a href="${BASE_URL}/track?ref=${orderId.slice(-8).toUpperCase()}" style="display:inline-block;background:#c9a84c;color:#3d2c1e;font-family:sans-serif;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:14px 32px;border-radius:100px;">
              Leave a Review
            </a>
          </div>
        </div>
        ${brandFooter}
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
    subject: 'Your La Lumière box is waiting ✨',
    html: `
      <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; color: #3d2c1e;">
        <div style="text-align: center; padding: 40px 0 24px;">
          <p style="font-family: sans-serif; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #c9a84c; margin: 0 0 8px;">La Lumière & Co.</p>
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
            <a href="${BASE_URL}/build" style="display: inline-block; background: #c9a84c; color: #3d2c1e; font-family: sans-serif; font-size: 13px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; text-decoration: none; padding: 14px 32px; border-radius: 100px;">
              Complete My Box
            </a>
          </div>
        </div>
        <p style="font-family: sans-serif; font-size: 11px; text-align: center; color: #9c7c5a; margin: 0;">
          Questions? Reply to this email — we're here to help.
        </p>
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
    subject: 'Your La Lumière box is on its way 🎀',
    html: `
      <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; color: #3d2c1e;">
        <div style="text-align: center; padding: 40px 0 24px;">
          <p style="font-family: sans-serif; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #c9a84c; margin: 0 0 8px;">La Lumière & Co.</p>
          <h1 style="font-size: 28px; font-weight: normal; margin: 0;">Order Confirmed</h1>
        </div>
        <div style="background: #faf7f2; border-radius: 16px; padding: 32px; margin-bottom: 24px;">
          <p style="font-family: sans-serif; font-size: 14px; line-height: 1.7; color: #5a3e28; margin: 0 0 16px;">
            Hi ${customerName},
          </p>
          <p style="font-family: sans-serif; font-size: 14px; line-height: 1.7; color: #5a3e28; margin: 0 0 8px;">
            Thank you for your order${recipientName ? ` for ${recipientName}` : ''}. We're carefully assembling your La Lumière box and it will be on its way soon.
          </p>
          <div style="border-top: 1px solid #e8ddd0; margin: 24px 0; padding-top: 16px;">
            <p style="font-family: sans-serif; font-size: 12px; color: #9c7c5a; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 1px;">Order Total</p>
            <p style="font-family: sans-serif; font-size: 18px; font-weight: 600; color: #3d2c1e; margin: 0;">${formatPrice(total)}</p>
          </div>
          ${trackingNumber ? `
          <div style="border-top: 1px solid #e8ddd0; padding-top: 16px;">
            <p style="font-family: sans-serif; font-size: 12px; color: #9c7c5a; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 1px;">Tracking</p>
            <a href="${trackingUrl || '#'}" style="font-family: sans-serif; font-size: 14px; color: #c9a84c;">${trackingNumber}</a>
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
