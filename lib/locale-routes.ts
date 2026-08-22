// Locale routing — EN↔ES URL pairs.
//
// Deliberately dependency-free: the Header and Footer are client components,
// and lib/i18n.ts imports supabaseAdmin (built at module scope from
// SUPABASE_SERVICE_ROLE_KEY, which is undefined in the browser — createClient
// would throw on import). Keep this file free of server imports.

export type Locale = 'en' | 'es'

// One source of truth for "what is this page's Spanish URL". The Spanish
// slugs are localized (/boxes → /es/canastillas), so every nav link used to
// carry its own `isEs ? '/es/…' : '/…'` ternary — and the ones nobody
// remembered to write sent Spanish-labelled links to English pages
// ("Mi cuenta" → /account, "Términos" → /legal/terms). Adding a Spanish page
// is now a one-line edit here instead of a hunt through the chrome.
//
// Prefix pairs, so dynamic segments come along: /boxes/<slug>,
// /collections/<slug>, /products/<id>.
const ES_ROUTES: ReadonlyArray<readonly [en: string, es: string]> = [
  ['/legal/returns', '/es/legal/devoluciones'],
  ['/gift-cards', '/es/tarjetas-regalo'],
  ['/our-cotton', '/es/nuestro-algodon'],
  ['/collections', '/es/colecciones'],
  ['/products', '/es/productos'],
  ['/checkout', '/es/checkout'],
  ['/boxes', '/es/canastillas'],
  ['/story', '/es/historia'],
  ['/faq', '/es/faq'],
  ['/build', '/es/build'],
]

// Pages with NO Spanish twin, listed so the fallback is a decision rather than
// an oversight: /account, /track, /corporate, /press, /journal, /guide,
// /social, /gift-guides, /same-day-delivery, /legal/privacy, /legal/terms.
// These keep their English content on purpose — a half-translated legal page
// is worse than an English one. The link label still localizes; only the
// destination stays English. Give one of them a real /es/… page and its pair
// belongs in ES_ROUTES above.

/** Longest-prefix match wins, so /legal/returns beats a future /legal entry. */
function matchPrefix(path: string, index: 0 | 1): readonly [string, string] | undefined {
  return [...ES_ROUTES]
    .sort((a, b) => b[index].length - a[index].length)
    .find(pair => path === pair[index] || path.startsWith(pair[index] + '/'))
}

/**
 * The URL a link should point at for the current locale. Pass the English
 * path; Spanish visitors get the Spanish twin when one exists, and the
 * English page (deliberately) when it doesn't.
 */
export function localePath(enPath: string, isEs: boolean): string {
  if (!isEs) return enPath
  if (enPath === '/') return '/es'
  const pair = matchPrefix(enPath, 0)
  return pair ? pair[1] + enPath.slice(pair[0].length) : enPath
}

/** Inverse of localePath — the English path behind an /es/… URL. */
export function enPath(esPath: string): string {
  if (esPath === '/es') return '/'
  const pair = matchPrefix(esPath, 1)
  if (pair) return pair[0] + esPath.slice(pair[1].length)
  // An /es page with no pair listed (or an English-only page reached under
  // /es): strip the prefix and let the English route answer.
  return esPath.startsWith('/es/') ? esPath.slice(3) : esPath
}

/**
 * Where the language switcher should send someone standing on `pathname`.
 * Switching locale used to bounce everyone to the homepage; this keeps them
 * on the page they were reading whenever a twin exists.
 */
export function switchLocalePath(pathname: string, to: Locale): string {
  const currentlyEs = pathname === '/es' || pathname.startsWith('/es/')
  if (to === 'es') return currentlyEs ? pathname : localePath(pathname, true)
  return currentlyEs ? enPath(pathname) : pathname
}
