import { createHmac } from 'crypto'

// Signed link identity for the post-delivery review ask (2026-07-27 decision:
// the 20% thank-you is EMAIL-DRIVEN only — the public review form never asks
// for an email or mentions the reward). The ask email appends ?rt=<token> to
// its product links; the form passes it back untouched; the API recovers the
// buyer's email from it server-side. No deps beyond crypto so resend.ts can
// import it without dragging Stripe in.

const SECRET = process.env.CRON_SECRET || 'pl-review-token'
const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000

export function reviewToken(orderId: string, email: string, expMs = Date.now() + NINETY_DAYS): string {
  const payload = `rvw:${orderId}:${email.trim().toLowerCase()}:${expMs}`
  const sig = createHmac('sha256', SECRET).update(payload).digest('base64url').slice(0, 24)
  return `${Buffer.from(payload).toString('base64url')}.${sig}`
}

export function verifyReviewToken(token: string): { orderId: string; email: string } | null {
  try {
    const [b64, sig] = token.split('.')
    const payload = Buffer.from(b64, 'base64url').toString()
    const expected = createHmac('sha256', SECRET).update(payload).digest('base64url').slice(0, 24)
    if (sig !== expected) return null
    const [tag, orderId, email, expStr] = payload.split(':')
    if (tag !== 'rvw' || !orderId || !email) return null
    if (Date.now() > Number(expStr)) return null
    return { orderId, email }
  } catch {
    return null
  }
}
