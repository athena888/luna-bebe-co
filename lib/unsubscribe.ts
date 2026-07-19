import crypto from 'crypto'
import { supabaseAdmin } from './supabase'

// Signed unsubscribe links for customer flow emails (welcome series, review
// ask, win-back). The token is an HMAC of the email so links can't be forged
// to opt other people out.
const SECRET = process.env.UNSUBSCRIBE_SECRET || process.env.CRON_SECRET || 'pl-unsubscribe'
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

export function unsubscribeToken(email: string): string {
  return crypto.createHmac('sha256', SECRET).update(email.trim().toLowerCase()).digest('hex').slice(0, 24)
}

export function unsubscribeUrl(email: string): string {
  return `${BASE_URL}/api/email/unsubscribe?e=${encodeURIComponent(email.trim().toLowerCase())}&t=${unsubscribeToken(email)}`
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  const expected = unsubscribeToken(email)
  return token.length === expected.length && crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected))
}

/** True when the address opted out of flow emails. Fails open (false) so a
 *  missing table never blocks transactional sends — the cron double-checks. */
export async function isOptedOut(email: string): Promise<boolean> {
  try {
    const { data } = await supabaseAdmin
      .from('email_optouts')
      .select('email')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle()
    return !!data
  } catch { return false }
}
