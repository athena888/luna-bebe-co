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

// One shared header for every email: brand, tagline, lavender divider.
const brandHeader = `
  <div style="text-align:center;padding:40px 0 20px;">
    <p style="font-family:sans-serif;font-size:12px;letter-spacing:4px;text-transform:uppercase;color:#c9a84c;margin:0 0 6px;">Petite Lavande</p>
    <p style="font-family:Georgia,serif;font-style:italic;font-size:13px;color:#9c7c5a;margin:0;">Fait avec amour, pour vous</p>
    <img src="${BASE_URL}/decor/lavender-divider.png" width="150" alt="" style="display:block;margin:12px auto 0;width:150px;max-width:150px;height:auto;" />
  </div>
`

// ——— The house email family: green panel, white text, square outline button ———
const P = (text: string) =>
  `<p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#ffffff;margin:0 0 16px;">${text}</p>`
const BTN = (href: string, label: string) =>
  `<div style="text-align:center;margin-top:24px;">
     <a href="${href}" style="display:inline-block;border:1px solid #ffffff;color:#ffffff;background:transparent;font-family:sans-serif;font-size:11px;font-weight:600;letter-spacing:3px;text-transform:uppercase;text-decoration:none;padding:14px 34px;">${label}</a>
   </div>`
const CODE = (code: string) =>
  `<p style="text-align:center;margin:20px 0;">
     <span style="display:inline-block;font-family:monospace;font-size:18px;letter-spacing:3px;background:rgba(255,255,255,0.14);border:1px dashed rgba(255,255,255,0.6);padding:12px 26px;color:#ffffff;">${code}</span>
   </p>`
// Every customer email sends a plain-text part alongside the HTML — real
// correspondence is multipart, and HTML-only is a classic promotions signal
// to Gmail. Derived automatically so templates can't forget it.
function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|h1|h2|div|tr|li)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&rsquo;|&#8217;/g, '’')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&middot;|·/g, '·')
    .split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n')
}

export type EmailLocale = 'en' | 'es'

function sendEmail(opts: { from: string; to: string; subject: string; html: string; headers?: Record<string, string>; replyTo?: string }) {
  return resend.emails.send({ ...opts, text: htmlToText(opts.html) })
}

const shell = (heading: string, inner: string, footer: string) => `
  <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#ffffff;color:#3d2c1e;">
    ${brandHeader}
    <div style="background:#7A8E7C;padding:34px 32px;margin:0 4px 24px;">
      <h1 style="font-family:Georgia,serif;font-size:26px;font-weight:normal;color:#ffffff;text-align:center;margin:0 0 22px;">${heading}</h1>
      ${inner}
    </div>
    ${footer}
  </div>`
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
  code,
  locale = 'en',
}: {
  customerName?: string
  customerEmail: string
  code?: string | null
  locale?: EmailLocale
}) {
  const es = locale === 'es'
  const greeting = es
    ? (customerName ? `Te damos la bienvenida, ${customerName}` : 'Te damos la bienvenida')
    : (customerName ? `Welcome, ${customerName}` : 'Welcome')
  return sendEmail({
    from: FROM,
    to: customerEmail,
    headers: unsubHeaders(customerEmail),
    subject: es ? 'Te damos la bienvenida a Petite Lavande ✨' : 'Welcome to Petite Lavande ✨',
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#ffffff;color:#3d2c1e;">
        ${brandHeader}
        <div style="background:#7A8E7C;padding:34px 32px;margin:0 4px 24px;">
          <h1 style="font-family:Georgia,serif;font-size:26px;font-weight:normal;color:#ffffff;text-align:center;margin:0 0 22px;">${greeting}</h1>
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#ffffff;margin:0 0 16px;">
            ${es ? 'Qué alegría tenerte aquí. Petite Lavande nació del amor por la vida nueva — cada canastilla se hace a mano con materiales orgánicos, se cura con intención y se empaca con lavanda seca, sellada a mano, porque cada detalle importa.' : 'We\'re so glad you\'re here. Petite Lavande was born out of a love for new life — every box we create is handcrafted with organic materials, curated with intention, and packed with dried lavender and sealed by hand because every detail matters.'}
          </p>
          ${code ? `
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#ffffff;margin:0 0 8px;">
            Your personal code takes 10% off your first order — one use, just for you:
          </p>
          ${CODE(code)}` : ''}
          <div style="text-align:center;">
            <a href="${utm(es ? '/es/build' : '/build', 'welcome')}" style="display:inline-block;border:1px solid #ffffff;color:#ffffff;background:transparent;font-family:sans-serif;font-size:11px;font-weight:600;letter-spacing:3px;text-transform:uppercase;text-decoration:none;padding:14px 34px;">
              ${es ? 'Arma tu canastilla' : 'Build Your Box'}
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

export async function sendWelcomeSeries2Email({ customerEmail, segment, locale = 'en' }: { customerEmail: string; segment?: CopySegment; locale?: EmailLocale }) {
  const es = locale === 'es'
  const opener = es
    ? `Cada pieza de una canastilla Petite Lavande tiene su origen conocido — ropita de algodón orgánico de talleres certificados GOTS, cuidado botánico, lavanda de la Provenza. La tarjeta de cada canastilla cuenta la historia de cada pieza, para que quien recibe tu regalo sepa exactamente qué toca la piel de su bebé.`
    : pickOpener(
        WELCOME2_OPENERS,
        `Every item in a Petite Lavande box is traced to its source — organic cotton garments from GOTS-certified makers, botanical bath goods, Provence lavender. The printed card in each box tells the story of every item, so the person you're gifting knows exactly what's touching their baby's skin.`,
        segment
      )
  return sendEmail({
    from: FROM,
    to: customerEmail,
    headers: unsubHeaders(customerEmail),
    subject: es ? 'La historia detrás de cada canastilla 🌿' : 'The story behind every box 🌿',
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#ffffff;color:#3d2c1e;">
        ${brandHeader}
        <div style="background:#7A8E7C;padding:34px 32px;margin:0 4px 24px;">
          <h1 style="font-family:Georgia,serif;font-size:26px;font-weight:normal;color:#ffffff;text-align:center;margin:0 0 22px;">${es ? 'No curamos. Rastreamos.' : `We don't curate. We trace.`}</h1>
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#ffffff;margin:0 0 16px;">
            ${opener}
          </p>
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#ffffff;margin:0 0 24px;">
            ${es ? 'Armada a mano y terminada con listón de satén, sellada a mano.' : 'Hand-packed and finished with satin ribbon, sealed by hand.'}
          </p>
          <div style="text-align:center;">
            <a href="${utm(es ? '/es/canastillas' : '/boxes', 'welcome')}" style="display:inline-block;border:1px solid #ffffff;color:#ffffff;background:transparent;font-family:sans-serif;font-size:11px;font-weight:600;letter-spacing:3px;text-transform:uppercase;text-decoration:none;padding:14px 34px;">
              ${es ? 'Ver las canastillas' : 'See the Boxes'}
            </a>
          </div>
        </div>
        ${flowFooter(customerEmail)}
      </div>
    `,
  })
}

// Welcome series step 3 (D+4) — gentle nudge with the code reminder.
export async function sendWelcomeSeries3Email({ customerEmail, code, locale = 'en' }: { customerEmail: string; code?: string | null; locale?: EmailLocale }) {
  const es = locale === 'es'
  return sendEmail({
    from: FROM,
    to: customerEmail,
    headers: unsubHeaders(customerEmail),
    subject: es ? '¿Aún decidiendo? Te ayudamos ✨' : 'Still deciding? Let us help ✨',
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#ffffff;color:#3d2c1e;">
        ${brandHeader}
        <div style="background:#7A8E7C;padding:34px 32px;margin:0 4px 24px;">
          <h1 style="font-family:Georgia,serif;font-size:26px;font-weight:normal;color:#ffffff;text-align:center;margin:0 0 22px;">${es ? '¿No sabes cuál elegir?' : 'Not sure which box?'}</h1>
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#ffffff;margin:0 0 16px;">
            ${es ? 'Cuéntanos a quién le regalas y nuestra guía te llevará a la canastilla indicada — para una mamá reciente, un recién nacido o los dos. O arma la tuya desde cero, pieza por pieza.' : `Tell us who you're gifting and our gift guide will point you to the right box — for a new mama, a newborn, or both. Or build your own from scratch, item by item.`}
          </p>
          ${code ? `
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#ffffff;margin:0 0 8px;">
            Your personal code still takes 10% off your first order:
          </p>
          ${CODE(code)}` : ''}
          <div style="text-align:center;">
            <a href="${utm('/guide', 'welcome')}" style="display:inline-block;border:1px solid #ffffff;color:#ffffff;background:transparent;font-family:sans-serif;font-size:11px;font-weight:600;letter-spacing:3px;text-transform:uppercase;text-decoration:none;padding:14px 34px;">
              ${es ? 'Encuentra la canastilla' : 'Find the Right Box'}
            </a>
          </div>
        </div>
        ${flowFooter(customerEmail)}
      </div>
    `,
  })
}

// Win-back — one email when a customer's last order is 75+ days old.
export async function sendWinBackEmail({ customerName, customerEmail, segment, locale = 'en' }: { customerName?: string; customerEmail: string; segment?: CopySegment; locale?: EmailLocale }) {
  const es = locale === 'es'
  const greeting = customerName ? (es ? `Hola ${customerName},` : `Hi ${customerName},`) : (es ? 'Hola,' : 'Hi,')
  // ES sends one reviewed opener — segment variants exist in English only.
  const opener = es
    ? `Es probable que alguien cerca de ti esté esperando un bebé — una amiga, una colega, una hermana. Cuando llegue el momento, aquí seguimos, empacando a mano canastillas orgánicas que cuidan a la mamá tanto como al bebé.`
    : pickOpener(
        WINBACK_OPENERS,
        `Chances are someone around you is expecting — a friend, a colleague, a sister. When the moment comes, we're still here hand-packing organic gift boxes that care for the new parent as much as the baby.`,
        segment
      )
  return sendEmail({
    from: FROM,
    to: customerEmail,
    headers: unsubHeaders(customerEmail),
    subject: es ? 'Un poquito de lavanda, de nosotros para ti 💛' : 'A little lavender, from us to you 💛',
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#ffffff;color:#3d2c1e;">
        ${brandHeader}
        <div style="background:#7A8E7C;padding:34px 32px;margin:0 4px 24px;">
          <h1 style="font-family:Georgia,serif;font-size:26px;font-weight:normal;color:#ffffff;text-align:center;margin:0 0 22px;">${es ? 'Ha pasado un tiempo' : `It's been a while`}</h1>
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#ffffff;margin:0 0 16px;">
            ${greeting}
          </p>
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#ffffff;margin:0 0 24px;">
            ${opener}
          </p>
          <div style="text-align:center;">
            <a href="${utm(es ? '/es/canastillas' : '/boxes', 'winback')}" style="display:inline-block;border:1px solid #ffffff;color:#ffffff;background:transparent;font-family:sans-serif;font-size:11px;font-weight:600;letter-spacing:3px;text-transform:uppercase;text-decoration:none;padding:14px 34px;">
              ${es ? 'Ver lo nuevo' : `See What's New`}
            </a>
          </div>
        </div>
        ${flowFooter(customerEmail)}
      </div>
    `,
  })
}

// Build 17 — the recipient's digital gift note, sent once when their box
// ships. Transactional in nature but carries unsubscribe anyway. Gated by
// GIFTNOTE_ACTIVE via lib/gift-note.ts.
export async function sendGiftNoteEmail({ recipientEmail, recipientName, senderName, noteUrl, locale = 'en' }: {
  recipientEmail: string
  recipientName?: string
  senderName: string
  noteUrl: string
  locale?: EmailLocale
}) {
  const es = locale === 'es'
  const greeting = recipientName ? `${recipientName}, a` : 'A'
  return sendEmail({
    from: FROM,
    to: recipientEmail,
    headers: unsubHeaders(recipientEmail),
    subject: es ? `${senderName} te envió algo 🌿` : `${senderName} sent you something 🌿`,
    html: shell(
      es ? `${recipientName ? `${recipientName}, un` : 'Un'} regalo va en camino hacia ti` : `${greeting} gift is on its way to you`,
      P(es ? `<strong>${senderName}</strong> te envió una canastilla Petite Lavande — recuerdos orgánicos hechos a mano, en camino a tu puerta. Escribió una nota para ti.` : `<strong>${senderName}</strong> has sent you a Petite Lavande box — hand-packed organic keepsakes, on their way to your door. They wrote you a note to go with it.`) +
      BTN(noteUrl, es ? 'Leer tu nota' : 'Read Your Note') +
      P(`<span style="font-size:12px;color:rgba(255,255,255,0.8);">${es ? 'Somos Petite Lavande, un pequeño estudio de canastillas orgánicas para bebé y mamá. Este es el único correo que te enviaremos, a menos que quieras saber de nosotros.' : `We're Petite Lavande, a small studio making organic baby & new-mama gift boxes. This is the only email we'll send you unless you ask to hear from us.`}</span>`),
      flowFooter(recipientEmail)
    ),
  })
}

// Build 10 — first-purchase anniversary prompt (yearly, ANNIVERSARY_ACTIVE-
// gated via the scheduler; copy in MARKETING_COPY.md).
export async function sendAnniversaryEmail({ customerEmail, locale = 'en' }: { customerEmail: string; locale?: EmailLocale }) {
  const es = locale === 'es'
  return sendEmail({
    from: FROM,
    to: customerEmail,
    headers: unsubHeaders(customerEmail),
    subject: es ? 'La temporada vuelve a llegar 💛' : 'The season comes around again 💛',
    html: shell(
      es ? 'Ya pasó un año' : 'A year already',
      P(es
        ? `Por estas fechas el año pasado, le enviaste a alguien una canastilla Petite Lavande. Los bebés tienen la costumbre de multiplicar las ocasiones — un primer cumpleaños por aquí, una nueva llegada por allá — y seguimos empacando a mano una caja para cada una.`
        : `Around this time last year, you sent someone a Petite Lavande box. Babies have a way of multiplying the occasions — a first birthday here, a new arrival there — and we're still hand-packing boxes for every one of them.`) +
      P(es
        ? `Si alguien cerca de ti celebra pronto, nos encantaría ayudarte a decirlo bonito.`
        : `If someone around you is celebrating soon, we'd love to help you say it beautifully.`) +
      BTN(utm(es ? '/es/canastillas' : '/boxes', 'anniversary'), es ? 'Ver las canastillas' : 'See the Boxes'),
      flowFooter(customerEmail)
    ),
  })
}

// Build 12 — restock notification, sent in waitlist signup order when a
// product comes back. Copy in MARKETING_COPY.md; WAITLIST_ACTIVE-gated.
export async function sendRestockEmail({ customerEmail, productName, productId, locale = 'en' }: {
  customerEmail: string
  productName: string
  productId: string
  locale?: EmailLocale
}) {
  const es = locale === 'es'
  return sendEmail({
    from: FROM,
    to: customerEmail,
    headers: unsubHeaders(customerEmail),
    subject: es ? `Volvió — ${productName} 🌿` : `It's back — ${productName} 🌿`,
    html: shell(
      es ? 'De vuelta en el estudio' : 'Back in the studio',
      P(es
        ? `Buenas noticias: <strong>${productName}</strong> está de vuelta. Nos pediste avisarte, y la lista de espera se entera primero, así que el momento más tranquilo para ordenar es ahora.`
        : `Good news — <strong>${productName}</strong> is back. You asked us to let you know, and waitlist members hear first, so the quietest window to order is right now.`) +
      BTN(utm(es ? `/es/productos/${productId}` : `/products/${productId}`, 'restock'), es ? 'Verlo ahora' : 'See It Now'),
      flowFooter(customerEmail)
    ),
  })
}

// Build 8 — one-off campaign email, composed in Portal → Campaigns. Same
// shell as the flow emails so campaigns always look on-brand.
export async function sendCampaignEmail({ customerEmail, subject, heading, paragraphs, ctaLabel, ctaHref, campaign }: {
  customerEmail: string
  subject: string
  heading: string
  paragraphs: string[]
  ctaLabel?: string
  ctaHref?: string
  campaign: string
}) {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const body = paragraphs.map(p =>
    `<p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#ffffff;margin:0 0 16px;">${esc(p)}</p>`
  ).join('')
  const cta = ctaLabel && ctaHref ? `
          <div style="text-align:center;margin-top:8px;">
            <a href="${utm(ctaHref, `campaign-${campaign}`)}" style="display:inline-block;border:1px solid #ffffff;color:#ffffff;background:transparent;font-family:sans-serif;font-size:11px;font-weight:600;letter-spacing:3px;text-transform:uppercase;text-decoration:none;padding:14px 34px;">
              ${esc(ctaLabel)}
            </a>
          </div>` : ''
  return sendEmail({
    from: FROM,
    to: customerEmail,
    headers: unsubHeaders(customerEmail),
    subject,
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#ffffff;color:#3d2c1e;">
        ${brandHeader}
        <div style="background:#7A8E7C;padding:34px 32px;margin:0 4px 24px;">
          <h1 style="font-family:Georgia,serif;font-size:26px;font-weight:normal;color:#ffffff;text-align:center;margin:0 0 22px;">${esc(heading)}</h1>
          ${body}
          ${cta}
        </div>
        ${flowFooter(customerEmail)}
      </div>
    `,
  })
}

// Build 1 upgrade — second abandoned-cart touch, D+3 after the first. No
// discount on purpose (a rescue code would train cart-abandoning). Gated by
// CART_SEQUENCE_ACTIVE via the cron; copy in MARKETING_COPY.md.
export async function sendCartReminder2Email({ customerEmail, locale = 'en' }: { customerEmail: string; locale?: EmailLocale }) {
  const es = locale === 'es'
  return sendEmail({
    from: FROM,
    to: customerEmail,
    headers: unsubHeaders(customerEmail),
    subject: es ? 'Tu canastilla sigue guardada 🌿' : 'Your box is still saved 🌿',
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#ffffff;color:#3d2c1e;">
        ${brandHeader}
        <div style="background:#7A8E7C;padding:34px 32px;margin:0 4px 24px;">
          <h1 style="font-family:Georgia,serif;font-size:26px;font-weight:normal;color:#ffffff;text-align:center;margin:0 0 22px;">${es ? 'Justo donde la dejaste' : 'Right where you left it'}</h1>
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#ffffff;margin:0 0 16px;">
            ${es ? 'La canastilla que armaste sigue guardada, tal como la dejaste. Si el momento pasó, no hay problema — pero si ese regalo sigue en tu mente, todo está listo para terminar en un par de minutos.' : 'The box you built is still saved, exactly as you left it. If the moment passed, no worries at all — but if that gift is still on your mind, everything is ready to finish in a minute or two.'}
          </p>
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#ffffff;margin:0 0 24px;">
            ${es ? 'Armada a mano dentro de las 24 horas de tu pedido, terminada con listón de satén y sellada a mano.' : 'Hand-packed within 24 hours of your order, finished with satin ribbon and sealed by hand.'}
          </p>
          <div style="text-align:center;">
            <a href="${utm(es ? '/es/checkout' : '/checkout', 'cart')}" style="display:inline-block;border:1px solid #ffffff;color:#ffffff;background:transparent;font-family:sans-serif;font-size:11px;font-weight:600;letter-spacing:3px;text-transform:uppercase;text-decoration:none;padding:14px 34px;">
              ${es ? 'Retomar donde quedaste' : 'Pick Up Where You Left Off'}
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
export async function sendOccasionDueEmail({ customerEmail, locale = 'en' }: { customerEmail: string; locale?: EmailLocale }) {
  const es = locale === 'es'
  return sendEmail({
    from: FROM,
    to: customerEmail,
    headers: unsubHeaders(customerEmail),
    subject: es ? 'El gran día se acerca 🌿' : 'The big day is getting close 🌿',
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#ffffff;color:#3d2c1e;">
        ${brandHeader}
        <div style="background:#7A8E7C;padding:34px 32px;margin:0 4px 24px;">
          <h1 style="font-family:Georgia,serif;font-size:26px;font-weight:normal;color:#ffffff;text-align:center;margin:0 0 22px;">${es ? 'Ya casi es hora' : 'Almost time'}</h1>
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#ffffff;margin:0 0 16px;">
            ${es
              ? 'La llegada que nos pediste recordar está a unas pocas semanas. Si un regalo es parte del plan, esta es la ventana — cada canastilla se empaca a mano y llega con tiempo de sobra.'
              : 'The arrival you asked us to remember is only a few weeks away now. If a gift is part of the plan, this is the window — every box is packed by hand and ships with time to spare.'}
          </p>
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#ffffff;margin:0 0 24px;">
            ${es
              ? 'Recuerdos orgánicos, elegidos pieza por pieza, atados con listón y sellados a mano.'
              : 'Organic keepsakes, chosen piece by piece, ribbon-tied and sealed by hand.'}
          </p>
          <div style="text-align:center;">
            <a href="${utm(es ? '/es/build' : '/build', 'occasion')}" style="display:inline-block;border:1px solid #ffffff;color:#ffffff;background:transparent;font-family:sans-serif;font-size:11px;font-weight:600;letter-spacing:3px;text-transform:uppercase;text-decoration:none;padding:14px 34px;">
              ${es ? 'Armar su canastilla' : 'Build Their Box'}
            </a>
          </div>
        </div>
        ${flowFooter(customerEmail)}
      </div>
    `,
  })
}

// Build 3 — ~21 days before a remembered baby birthday, every year.
export async function sendOccasionBirthdayEmail({ customerEmail, locale = 'en' }: { customerEmail: string; locale?: EmailLocale }) {
  const es = locale === 'es'
  return sendEmail({
    from: FROM,
    to: customerEmail,
    headers: unsubHeaders(customerEmail),
    subject: es ? 'Se acerca un cumpleaños pequeñito 💛' : 'A little birthday is coming up 💛',
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#ffffff;color:#3d2c1e;">
        ${brandHeader}
        <div style="background:#7A8E7C;padding:34px 32px;margin:0 4px 24px;">
          <h1 style="font-family:Georgia,serif;font-size:26px;font-weight:normal;color:#ffffff;text-align:center;margin:0 0 22px;">${es ? 'Un día que merece celebrarse' : 'A day worth celebrating'}</h1>
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#ffffff;margin:0 0 16px;">
            ${es
              ? 'Un cumpleaños que nos pediste recordar está a unas semanas. Una canastilla de recuerdos orgánicos — cositas suaves para crecer, delicadas para el baño — es una manera hermosa de celebrar el día.'
              : 'A birthday you asked us to remember is a few weeks out. A box of organic keepsakes — soft things to grow into, gentle things for the bath — is a lovely way to mark the day.'}
          </p>
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#ffffff;margin:0 0 24px;">
            ${es
              ? 'Empacada a mano, con listón de satín y sellada a mano, con tu mensaje adentro.'
              : 'Hand-packed, finished with satin ribbon and sealed by hand, with your message inside.'}
          </p>
          <div style="text-align:center;">
            <a href="${utm(es ? '/es/canastillas' : '/boxes', 'occasion')}" style="display:inline-block;border:1px solid #ffffff;color:#ffffff;background:transparent;font-family:sans-serif;font-size:11px;font-weight:600;letter-spacing:3px;text-transform:uppercase;text-decoration:none;padding:14px 34px;">
              ${es ? 'Ver las canastillas' : 'See the Boxes'}
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
export async function sendReferralRewardEmail({ customerEmail, code, locale = 'en' }: { customerEmail: string; code: string; locale?: EmailLocale }) {
  const es = locale === 'es'
  return sendEmail({
    from: FROM,
    to: customerEmail,
    headers: unsubHeaders(customerEmail),
    subject: es ? 'Alguien usó tu código — aquí tienes $15, de nuestra parte 💛' : 'A friend used your code — here\'s $15, from us 💛',
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#ffffff;color:#3d2c1e;">
        ${brandHeader}
        <div style="background:#7A8E7C;padding:34px 32px;margin:0 4px 24px;">
          <h1 style="font-family:Georgia,serif;font-size:26px;font-weight:normal;color:#ffffff;text-align:center;margin:0 0 22px;">${es ? 'Tu regalo inspiró otro' : 'Your gift inspired another'}</h1>
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#ffffff;margin:0 0 16px;">
            ${es
              ? 'Alguien con quien compartiste Petite Lavande acaba de enviar su propia canastilla. Para darte las gracias, aquí tienes $15 de descuento en tu próximo pedido:'
              : `Someone you shared Petite Lavande with just sent a box of their own. As a thank-you, here's $15 off your next order:`}
          </p>
          <p style="text-align:center;margin:0 0 24px;">
            <span style="display:inline-block;font-family:monospace;font-size:20px;letter-spacing:3px;background:rgba(255,255,255,0.14);border:1px dashed rgba(255,255,255,0.6);padding:12px 26px;color:#ffffff;">${code}</span>
          </p>
          <div style="text-align:center;">
            <a href="${utm(es ? '/es/build' : '/build', 'referral')}" style="display:inline-block;border:1px solid #ffffff;color:#ffffff;background:transparent;font-family:sans-serif;font-size:11px;font-weight:600;letter-spacing:3px;text-transform:uppercase;text-decoration:none;padding:14px 34px;">
              ${es ? 'Armar mi próxima caja' : 'Build Your Next Box'}
            </a>
          </div>
        </div>
        ${flowFooter(customerEmail)}
      </div>
    `,
  })
}

// Review thank-you (verified buyers, any rating — see lib/review-rewards.ts).
export async function sendReviewRewardEmail({ customerEmail, code, locale = 'en' }: {
  customerEmail: string
  code: string
  locale?: EmailLocale
}) {
  const es = locale === 'es'
  return sendEmail({
    from: FROM,
    to: customerEmail,
    headers: unsubHeaders(customerEmail),
    subject: es
      ? 'Gracias por tu reseña — 20% de descuento para tu próxima caja'
      : 'Thank you for your review — 20% off your next box',
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#ffffff;color:#3d2c1e;">
        ${brandHeader}
        <div style="background:#7A8E7C;padding:34px 32px;margin:0 4px 24px;">
          <h1 style="font-family:Georgia,serif;font-size:26px;font-weight:normal;color:#ffffff;text-align:center;margin:0 0 22px;">${es ? 'Tu opinión nos importa' : 'Your words mean a lot'}</h1>
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#ffffff;margin:0 0 16px;">
            ${es
              ? 'Gracias por tomarte el tiempo de compartir tu experiencia. Como agradecimiento, aquí tienes 20% de descuento en tu próximo pedido:'
              : 'Thank you for taking the time to share your experience. As a thank-you, here\'s 20% off your next order:'}
          </p>
          <p style="text-align:center;margin:0 0 24px;">
            <span style="display:inline-block;font-family:monospace;font-size:20px;letter-spacing:3px;background:rgba(255,255,255,0.14);border:1px dashed rgba(255,255,255,0.6);padding:12px 26px;color:#ffffff;">${code}</span>
          </p>
          <div style="text-align:center;">
            <a href="${utm(es ? '/es/build' : '/build', 'review-reward')}" style="display:inline-block;border:1px solid #ffffff;color:#ffffff;background:transparent;font-family:sans-serif;font-size:11px;font-weight:600;letter-spacing:3px;text-transform:uppercase;text-decoration:none;padding:14px 34px;">
              ${es ? 'Armar mi próxima caja' : 'Build Your Next Box'}
            </a>
          </div>
        </div>
        <p style="font-family:sans-serif;font-size:12px;line-height:1.6;color:#8a7a6a;margin:0 4px 24px;padding:0 28px;">
          ${es
            ? 'Un solo uso, para un pedido futuro. Agradecemos todas las reseñas por igual, sin importar la calificación.'
            : 'One use, on a future order. We thank every review the same way, whatever the rating.'}
        </p>
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
  locale = 'en',
}: {
  customerName: string
  customerEmail: string
  orderId: string
  selectedItems: Array<{ id: string; name: string }>
  locale?: EmailLocale
}) {
  const es = locale === 'es'
  // Signed buyer identity — the review form passes it back so the API can
  // verify the purchase and send the 20% thank-you without ever asking the
  // customer to type an email on the site.
  const { reviewToken } = await import('./review-token')
  const rt = `&rt=${encodeURIComponent(reviewToken(orderId, customerEmail))}`
  const productPath = (id: string) => es ? `/es/productos/${id}` : `/products/${id}`
  const itemLinks = selectedItems.slice(0, 3).map(item =>
    `<li style="margin-bottom:8px;"><a href="${utm(productPath(item.id), 'postpurchase')}${rt}" style="font-family:sans-serif;font-size:14px;color:#ffffff;text-decoration:underline;">${item.name}</a></li>`
  ).join('')
  // CTA goes to the first item's product page — the review form lives there.
  const reviewHref = selectedItems[0]
    ? utm(productPath(selectedItems[0].id), 'postpurchase') + rt
    : utm(`/track?ref=${orderId.slice(-8).toUpperCase()}`, 'postpurchase')

  return sendEmail({
    from: FROM,
    to: customerEmail,
    headers: unsubHeaders(customerEmail),
    subject: es ? '¿Cómo llegó tu canastilla Petite Lavande? 🌿' : 'How was your Petite Lavande box? 🌿',
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#ffffff;color:#3d2c1e;">
        ${brandHeader}
        <div style="background:#7A8E7C;padding:34px 32px;margin:0 4px 24px;">
          <h1 style="font-family:Georgia,serif;font-size:26px;font-weight:normal;color:#ffffff;text-align:center;margin:0 0 22px;">${es ? 'Nos encantaría saber' : `We'd love your thoughts`}</h1>
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#ffffff;margin:0 0 16px;">
            ${es ? `Hola ${customerName}, esperamos que tu canastilla haya llegado hermosa y traído un poquito de alegría. Tu reseña ayuda a otras familias a descubrir estas piezas — significaría muchísimo para nosotros.` : `Hi ${customerName}, we hope your Petite Lavande box arrived beautifully and brought a little joy. Your review helps other families discover these products — it would mean the world to us.`}
          </p>
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#ffffff;margin:0 0 16px;">
            ${es
              ? 'Y para darte las gracias: cada reseña recibe un código único de 20% de descuento para tu próxima caja, sin importar la calificación.'
              : 'And as a thank-you, every review earns a one-time 20% code for your next box — whatever the rating.'}
          </p>
          ${selectedItems.length > 0 ? `<ul style="padding-left:20px;margin:0 0 24px;">${itemLinks}</ul>` : ''}
          <div style="text-align:center;">
            <a href="${reviewHref}" style="display:inline-block;border:1px solid #ffffff;color:#ffffff;background:transparent;font-family:sans-serif;font-size:11px;font-weight:600;letter-spacing:3px;text-transform:uppercase;text-decoration:none;padding:14px 34px;">
              ${es ? 'Escribir una reseña' : 'Leave a Review'}
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
  locale = 'en',
}: {
  customerName: string
  customerEmail: string
  orderId: string
  locale?: EmailLocale
}) {
  const es = locale === 'es'
  return sendEmail({
    from: FROM,
    to: customerEmail,
    headers: unsubHeaders(customerEmail),
    subject: es ? 'Tu canastilla te espera ✨' : 'Your Petite Lavande box is waiting ✨',
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#ffffff;color:#3d2c1e;">
        ${brandHeader}
        <div style="background:#7A8E7C;padding:34px 32px;margin:0 4px 24px;">
          <h1 style="font-family:Georgia,serif;font-size:26px;font-weight:normal;color:#ffffff;text-align:center;margin:0 0 22px;">${es ? 'Tu canastilla te espera' : 'Your box is waiting'}</h1>
          <p style="font-family: sans-serif; font-size: 14px; line-height: 1.7; color: #ffffff; margin: 0 0 16px;">
            ${es ? 'Hola' : 'Hi'} ${customerName},
          </p>
          <p style="font-family: sans-serif; font-size: 14px; line-height: 1.7; color: #ffffff; margin: 0 0 24px;">
            ${es ? 'Empezaste a armar una canastilla hermosa y quedó a medio camino. Tus selecciones están guardadas — solo falta finalizar la compra.' : `You started building a beautiful gift box but didn't quite finish. Your selections are saved — all you need to do is complete checkout.`}
          </p>
          <div style="text-align: center;">
            <a href="${utm(es ? '/es/build' : '/build', 'abandonedcart')}" style="display:inline-block;border:1px solid #ffffff;color:#ffffff;background:transparent;font-family:sans-serif;font-size:11px;font-weight:600;letter-spacing:3px;text-transform:uppercase;text-decoration:none;padding:14px 34px;">
              ${es ? 'Completar mi canastilla' : 'Complete My Box'}
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
  locale = 'en',
}: {
  recipientName: string
  recipientEmail: string
  senderName: string
  message?: string
  amount: number
  code: string
  locale?: EmailLocale
}) {
  const es = locale === 'es'
  const formatted = `$${(amount / 100).toFixed(0)}`
  return sendEmail({
    from: FROM,
    to: recipientEmail,
    subject: es ? `Un regalo para ti, de ${senderName}` : `A gift for you, from ${senderName}`,
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#ffffff;color:#3d2c1e;">
        ${brandHeader}
        <div style="background:#7A8E7C;padding:34px 32px;margin:0 4px 24px;">
          <h1 style="font-family:Georgia,serif;font-size:26px;font-weight:normal;color:#ffffff;text-align:center;margin:0 0 6px;">${es ? 'Recibiste un regalo' : `You've received a gift`}</h1>
          <p style="font-family:sans-serif;font-size:13px;text-align:center;color:rgba(255,255,255,0.85);margin:0 0 24px;">${es ? `De ${senderName}, con cariño` : `From ${senderName}, with love`}</p>
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#ffffff;margin:0 0 16px;">
            ${es ? 'Hola' : 'Hi'} ${recipientName},
          </p>
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#ffffff;margin:0 0 24px;">
            ${es ? `${senderName} te regaló una <strong>tarjeta Petite Lavande de ${formatted}</strong>. Usa el código de abajo para armar tu propia canastilla.` : `${senderName} has gifted you a <strong>${formatted} Petite Lavande gift card</strong>. Use the code below to build your own luxury baby gift box.`}
          </p>
          ${message ? `
          <div style="border-left:3px solid rgba(255,255,255,0.6);padding:12px 16px;margin-bottom:24px;">
            <p style="font-family:Georgia,serif;font-size:15px;font-style:italic;color:#ffffff;margin:0;">"${message}"</p>
          </div>
          ` : ''}
          <div style="background:rgba(255,255,255,0.14);border:1px dashed rgba(255,255,255,0.6);padding:24px;text-align:center;margin-bottom:24px;">
            <p style="font-family:sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.75);margin:0 0 8px;">${es ? 'Tu código de regalo' : 'Your Gift Code'}</p>
            <p style="font-family:monospace;font-size:28px;font-weight:bold;color:#ffffff;letter-spacing:4px;margin:0;">${code}</p>
            <p style="font-family:sans-serif;font-size:12px;color:rgba(255,255,255,0.75);margin:8px 0 0;">${es ? `Vale ${formatted} · No vence` : `Worth ${formatted} · Valid forever`}</p>
          </div>
          <div style="text-align:center;">
            <a href="${BASE_URL}${es ? '/es/build' : '/build'}" style="display:inline-block;border:1px solid #ffffff;color:#ffffff;background:transparent;font-family:sans-serif;font-size:11px;font-weight:600;letter-spacing:3px;text-transform:uppercase;text-decoration:none;padding:14px 34px;">
              ${es ? 'Arma tu canastilla' : 'Build Your Box'}
            </a>
          </div>
        </div>
        <p style="font-family:sans-serif;font-size:12px;text-align:center;color:#9c7c5a;margin:0 0 4px;">${es ? 'Escribe tu código al pagar para canjearlo.' : 'Enter your code at checkout to redeem it.'}</p>
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
  locale = 'en',
}: {
  customerName: string
  customerEmail: string
  recipientName?: string
  trackingNumber?: string
  trackingUrl?: string
  locale?: EmailLocale
}) {
  const es = locale === 'es'
  return sendEmail({
    from: FROM,
    to: customerEmail,
    subject: es ? 'Tu canastilla Petite Lavande va en camino 📦' : 'Your Petite Lavande box has shipped 📦',
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#ffffff;">
        ${brandHeader}
        <div style="background:#7A8E7C;padding:36px 32px;margin:0 4px 24px;">
          <h1 style="font-family:Georgia,serif;font-size:26px;font-weight:normal;color:#ffffff;text-align:center;margin:0 0 22px;">${es ? 'En camino' : 'On Its Way'}</h1>
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#ffffff;margin:0 0 6px;">${es ? 'Hola' : 'Hi'} ${customerName},</p>
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#ffffff;margin:0 0 6px;">
            ${es ? `Tu canastilla${recipientName ? ` para ${recipientName}` : ''} salió hoy y va en camino.` : `Your box${recipientName ? ` for ${recipientName}` : ''} shipped today and is on its way.`}
          </p>
          ${trackingNumber ? `
          <div style="border:1px dashed rgba(255,255,255,0.6);padding:20px;text-align:center;margin:22px 0 0;">
            <p style="font-family:sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.75);margin:0 0 6px;">${es ? 'Número de rastreo' : 'Tracking number'}</p>
            <p style="font-family:monospace;font-size:15px;letter-spacing:1px;color:#ffffff;margin:0;">${trackingNumber}</p>
            ${trackingUrl ? `
            <a href="${trackingUrl}" style="display:inline-block;border:1px solid #ffffff;color:#ffffff;background:transparent;font-family:sans-serif;font-size:11px;font-weight:600;letter-spacing:3px;text-transform:uppercase;text-decoration:none;padding:14px 34px;margin-top:18px;">${es ? 'Rastrear tu canastilla' : 'Track Your Box'}</a>` : ''}
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
  return sendEmail({
    from: FROM,
    to: email,
    subject: 'We received your corporate gifting inquiry 🌿',
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#ffffff;color:#3d2c1e;">
        ${brandHeader}
        <div style="background:#7A8E7C;padding:34px 32px;margin:0 4px 24px;">
          <h1 style="font-family:Georgia,serif;font-size:26px;font-weight:normal;color:#ffffff;text-align:center;margin:0 0 22px;">Thank you for reaching out</h1>
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#ffffff;margin:0 0 16px;">${greeting}</p>
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#ffffff;margin:0 0 16px;">
            We've received your corporate & team gifting inquiry and someone from our team will be in touch within one business day to help design the right gifting experience for you.
          </p>
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#ffffff;margin:0;">
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
  locale = 'en',
}: {
  customerName: string
  customerEmail: string
  amount: number
  orderId: string
  locale?: EmailLocale
}) {
  const es = locale === 'es'
  const formatted = `$${(amount / 100).toFixed(2)}`
  return sendEmail({
    from: FROM,
    to: customerEmail,
    subject: es ? 'Tu reembolso de Petite Lavande fue procesado' : 'Your Petite Lavande refund has been processed',
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#ffffff;color:#3d2c1e;">
        ${brandHeader}
        <div style="background:#7A8E7C;padding:34px 32px;margin:0 4px 24px;">
          <h1 style="font-family:Georgia,serif;font-size:26px;font-weight:normal;color:#ffffff;text-align:center;margin:0 0 22px;">${es ? 'Reembolso procesado' : 'Refund Processed'}</h1>
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#ffffff;margin:0 0 16px;">${es ? 'Hola' : 'Hi'} ${customerName},</p>
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#ffffff;margin:0 0 16px;">
            ${es ? `Procesamos un reembolso de <strong>${formatted}</strong> por tu pedido. Según tu banco, puede tardar de 5 a 10 días hábiles en reflejarse.` : `We've processed a refund of <strong>${formatted}</strong> for your order. Depending on your bank, it may take 5–10 business days to appear on your statement.`}
          </p>
          <div style="border-top:1px solid rgba(255,255,255,0.25);padding-top:16px;">
            <p style="font-family:sans-serif;font-size:12px;color:rgba(255,255,255,0.75);margin:0 0 4px;text-transform:uppercase;letter-spacing:1px;">${es ? 'Referencia del pedido' : 'Order Reference'}</p>
            <p style="font-family:monospace;font-size:14px;color:#ffffff;margin:0;">#${orderId.slice(-8).toUpperCase()}</p>
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
  locale = 'en',
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
  locale?: EmailLocale
}) {
  const es = locale === 'es'
  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`
  const ref = (trackingNumber ?? orderId).slice(-8).toUpperCase()
  // Only render images the caller resolved (guessed storage URLs 404 — real
  // files carry timestamp suffixes; the webhook looks them up from products).
  const imgOf = (i: { id?: string; image?: string | null }) => i.image || null

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
        <p style="font-family:sans-serif;font-size:11px;color:rgba(255,255,255,0.75);margin:0;">${es ? 'Cant.' : 'Qty'} ${qty}${i.price != null ? ` · ${formatPrice(i.price)} ${es ? 'c/u' : 'each'}` : ''}</p>
      </td>
      ${i.price != null ? `<td style="padding:9px 0;border-bottom:1px solid rgba(255,255,255,0.25);text-align:right;vertical-align:middle;font-family:sans-serif;font-size:13px;color:#ffffff;white-space:nowrap;">${formatPrice(i.price * qty)}</td>` : '<td style="border-bottom:1px solid rgba(255,255,255,0.25);"></td>'}
    </tr>`
  }).join('')

  return sendEmail({
    from: FROM,
    to: customerEmail,
    subject: es ? 'Tu pedido Petite Lavande está confirmado' : 'Your Petite Lavande order is confirmed',
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#ffffff;">
        ${brandHeader}
        <div style="background:#7A8E7C;padding:36px 32px;margin:0 4px 24px;">
          <h1 style="font-family:Georgia,serif;font-size:26px;font-weight:normal;color:#ffffff;text-align:center;margin:0 0 22px;">${es ? 'Pedido confirmado' : 'Order Confirmed'}</h1>
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#ffffff;margin:0 0 6px;">${es ? 'Hola' : 'Hi'} ${customerName},</p>
          <p style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#ffffff;margin:0 0 6px;">
            ${es ? `Gracias${recipientName ? ` — qué lindo detalle para ${recipientName}` : ' por tu pedido'}. Ya estamos preparando tu canastilla a mano.` : `Thank you${recipientName ? ` — what a lovely thing to send ${recipientName}` : ' for your order'}. We are preparing your box by hand now.`}
          </p>
          ${itemRows ? `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 0;border-top:1px solid rgba(255,255,255,0.25);">
            ${itemRows}
          </table>` : ''}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0 0;">
            <tr>
              <td style="font-family:sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.75);padding:6px 0;">${es ? 'Total del pedido' : 'Order total'}</td>
              <td style="font-family:Georgia,serif;font-size:20px;color:#ffffff;text-align:right;padding:6px 0;">${formatPrice(total)}</td>
            </tr>
            <tr>
              <td style="font-family:sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.75);padding:6px 0;">${es ? 'Referencia del pedido' : 'Order reference'}</td>
              <td style="font-family:monospace;font-size:13px;color:#ffffff;text-align:right;padding:6px 0;">${ref}</td>
            </tr>
          </table>
          ${trackingUrl ? `
          <div style="text-align:center;margin-top:26px;">
            <a href="${trackingUrl}" style="display:inline-block;border:1px solid #ffffff;color:#ffffff;background:transparent;font-family:sans-serif;font-size:11px;font-weight:600;letter-spacing:3px;text-transform:uppercase;text-decoration:none;padding:14px 34px;">${es ? 'Rastrear tu pedido' : 'Track Your Order'}</a>
          </div>` : ''}
        </div>
        ${referralCode ? `
        <div style="background:#7A8E7C;padding:24px 30px;margin:0 4px 24px;">
          <h2 style="font-family:Georgia,serif;font-size:19px;font-weight:normal;color:#ffffff;margin:0 0 8px;">${es ? 'Da $15, recibe $15' : 'Give $15, get $15'}</h2>
          <p style="font-family:sans-serif;font-size:13px;line-height:1.7;color:rgba(255,255,255,0.92);margin:0;">
            Your personal code <span style="font-family:monospace;letter-spacing:2px;background:rgba(255,255,255,0.14);border:1px solid rgba(255,255,255,0.5);border-radius:6px;padding:2px 8px;color:#ffffff;">${referralCode}</span> ${es ? 'le da a una amiga $15 en su primera canastilla — y cuando lo use, tú recibes $15 para la próxima.' : 'gives a friend $15 off their first box — and when they use it, you get $15 off your next one.'}
          </p>
        </div>` : ''}
        <p style="font-family:sans-serif;font-size:12px;text-align:center;color:#9c7c5a;margin:0 0 4px;">${es ? 'Te escribimos de nuevo en cuanto salga.' : 'We will email again the moment it ships.'}</p>
        ${brandFooter}
      </div>
    `,
  })
}
