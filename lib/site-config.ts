// Single source of truth for site-wide brand constants.
// Import this wherever you need the contact email, brand name, or site URL —
// so a future address change is a one-line edit.

export const CONTACT_EMAIL = 'hello@petitelavande.com'
export const BRAND_NAME = 'Petite Lavande'
export const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com'
