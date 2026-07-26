import { createHmac } from 'crypto'
import { supabaseAdmin } from './supabase'
import { isOptedOut } from './unsubscribe'

// Build 17 — recipient gift-note loop. When a gift order ships and the buyer
// provided the recipient's email (optional checkout field, UI pending mock
// approval), the recipient gets ONE digital gift note: who it's from, the
// message, a soft brand introduction. Never more than once — enforced by
// orders.gift_note_sent_at in code, not policy. Suppression honored.
// Gated by GIFTNOTE_ACTIVE until the note page + checkout field ship.

export const GIFTNOTE_ACTIVE = process.env.GIFTNOTE_ACTIVE === 'true'

const SECRET = process.env.CRON_SECRET || 'pl-gift-note'
const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000

/** Signed, expiring token for the public note page (/note/<token>). */
export function giftNoteToken(orderId: string, expMs = Date.now() + NINETY_DAYS): string {
  const payload = `${orderId}.${expMs}`
  const sig = createHmac('sha256', SECRET).update(payload).digest('base64url').slice(0, 24)
  return `${Buffer.from(payload).toString('base64url')}.${sig}`
}

export function verifyGiftNoteToken(token: string): string | null {
  try {
    const [b64, sig] = token.split('.')
    const payload = Buffer.from(b64, 'base64url').toString()
    const [orderId, expStr] = payload.split('.')
    const expected = createHmac('sha256', SECRET).update(payload).digest('base64url').slice(0, 24)
    if (sig !== expected) return null
    if (Date.now() > Number(expStr)) return null
    return orderId
  } catch {
    return null
  }
}

/**
 * Send the recipient's gift note for a shipped order. Idempotent and
 * self-guarding: needs the flag, a recipient email, and an unsent state.
 */
export async function sendGiftNoteIfDue(orderId: string): Promise<boolean> {
  if (!GIFTNOTE_ACTIVE) return false
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, recipient_email, recipient_name, customer_name, gift_note_sent_at')
    .eq('id', orderId).maybeSingle()
  if (!order?.recipient_email || order.gift_note_sent_at) return false
  const email = (order.recipient_email as string).trim().toLowerCase()
  if (await isOptedOut(email)) return false

  const { sendGiftNoteEmail } = await import('./resend')
  await sendGiftNoteEmail({
    recipientEmail: email,
    recipientName: (order.recipient_name as string) || undefined,
    senderName: (order.customer_name as string) || 'Someone who loves you',
    noteUrl: `${(process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com').replace(/\/$/, '')}/note/${giftNoteToken(order.id as string)}`,
  })
  await supabaseAdmin.from('orders').update({ gift_note_sent_at: new Date().toISOString() }).eq('id', orderId)
  return true
}
