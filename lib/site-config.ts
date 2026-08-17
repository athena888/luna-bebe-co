// Single source of truth for site-wide brand constants.
// Import this wherever you need the contact email, brand name, or site URL —
// so a future address change is a one-line edit.

export const CONTACT_EMAIL = 'hello@petitelavande.com'
export const BRAND_NAME = 'Petite Lavande'
export const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com'

/**
 * Who owner/admin alerts go to (payment gaps, restock, weekly scorecard).
 * ADMIN_EMAIL may hold SEVERAL comma-separated addresses — Resend needs them
 * as an array, and passing the raw comma string would silently address one
 * invalid recipient. Falls back to the contact address when unset.
 */
export function adminRecipients(): string[] {
  const list = (process.env.ADMIN_EMAIL ?? '')
    .split(',')
    .map(e => e.trim())
    .filter(Boolean)
  return list.length ? list : [CONTACT_EMAIL]
}
