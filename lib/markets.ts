// ── Internationalization config ──────────────────────────────────────────────
// Single source of truth for locales, currencies, and per-market settings.
// Launching a new market should be editing THIS file (+ enabling Stripe methods
// in the dashboard), not changing code elsewhere.

export type Locale = 'en-US' | 'en-GB' | 'fr-FR'
export type Currency = 'USD' | 'GBP' | 'EUR'

export const DEFAULT_LOCALE: Locale = 'en-US'
export const LOCALES: Locale[] = ['en-US', 'en-GB', 'fr-FR']

export interface MarketConfig {
  locale: Locale
  label: string                 // shown in the switcher, e.g. "United Kingdom (GBP)"
  country: string               // "United States"
  currency: Currency
  enabled: boolean              // false ⇒ browse-only + waitlist banner, no checkout
  shipCountries: ('US' | 'GB' | 'FR')[]   // ISO-3166 ship-to allowlist (Stripe)
  stripeLocale: 'en' | 'en-GB' | 'fr'     // Stripe Checkout `locale`
}

// Initial state: only en-US is live. en-GB and fr-FR are scaffolded (enabled:false).
export const MARKETS: Record<Locale, MarketConfig> = {
  'en-US': { locale: 'en-US', label: 'United States (USD)',   country: 'United States', currency: 'USD', enabled: true,  shipCountries: ['US'], stripeLocale: 'en' },
  'en-GB': { locale: 'en-GB', label: 'United Kingdom (GBP)',  country: 'United Kingdom', currency: 'GBP', enabled: false, shipCountries: ['GB'], stripeLocale: 'en-GB' },
  'fr-FR': { locale: 'fr-FR', label: 'France (EUR)',          country: 'France',        currency: 'EUR', enabled: false, shipCountries: ['FR'], stripeLocale: 'fr' },
}

// Country-specific domains FORCE their locale (priority over the cookie). The
// generic .com is intentionally NOT listed, so on it the footer switcher /
// pl_locale cookie chooses (falling back to Accept-Language, then en-US).
export const DOMAIN_LOCALE: Record<string, Locale> = {
  'petitelavande.co.uk': 'en-GB',
  'www.petitelavande.co.uk': 'en-GB',
  // 'petitelavande.fr': 'fr-FR',
}

export const LOCALE_COOKIE = 'pl_locale'
export const CURRENCY_SYMBOL: Record<Currency, string> = { USD: '$', GBP: '£', EUR: '€' }

export function isLocale(x: unknown): x is Locale {
  return typeof x === 'string' && (LOCALES as string[]).includes(x)
}
export function marketFor(locale: Locale): MarketConfig { return MARKETS[locale] }
export function currencyFor(locale: Locale): Currency { return MARKETS[locale].currency }

// Resolve the active locale: (1) domain mapping, (2) explicit cookie choice,
// (3) Accept-Language header, else default.
export function resolveLocale(opts: { host?: string | null; cookie?: string | null; acceptLanguage?: string | null }): Locale {
  const host = (opts.host || '').toLowerCase().replace(/:\d+$/, '')
  if (host && DOMAIN_LOCALE[host]) return DOMAIN_LOCALE[host]
  if (isLocale(opts.cookie)) return opts.cookie
  const al = (opts.acceptLanguage || '').toLowerCase()
  if (/(^|[,;\s])fr\b/.test(al) || al.includes('fr-fr')) return 'fr-FR'
  if (al.includes('en-gb')) return 'en-GB'
  return DEFAULT_LOCALE
}

// Locale-aware currency formatting via Intl, with a safe fallback.
export function formatMoney(minorUnits: number, currency: Currency, locale: Locale = DEFAULT_LOCALE): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(minorUnits / 100)
  } catch {
    return `${CURRENCY_SYMBOL[currency] ?? ''}${(minorUnits / 100).toFixed(2)}`
  }
}
