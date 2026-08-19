// The ONE decision for "may this browser send analytics?" — used by every
// client event helper (lib/analytics-events.ts) and mirrored by the loader
// gate in app/layout.tsx. Events are blocked, not merely tagged, because a
// GA4 internal-traffic filter only works if someone remembers to activate it
// in GA4 admin; blocked events need no admin setting to stay out of reports.
//
// A browser may send analytics only when ALL of these hold:
//   1. It is the production storefront host (localhost, previews, and any
//      other deployment never reach the production GA4 property).
//   2. The page is customer-facing (the /portal admin area is excluded).
//   3. The browser is not flagged internal (see markThisBrowserInternal
//      instructions in docs/analytics-tracking.md).
//   4. The visitor did not decline the cookie banner.

export const PRODUCTION_HOSTS = ['petitelavande.com', 'www.petitelavande.com']

// Staff/admin routes only — customer-facing routes never belong here.
export const EXCLUDED_PATH_PREFIXES = ['/portal']

// pl_internal_analytics is the documented owner flag; pl_internal is the
// legacy key the portal layout has always set — both mean "this browser is
// ours". Set via the browser console, never via URL parameters (a shared
// link must not be able to silence a customer's analytics).
export const INTERNAL_FLAG_KEYS = ['pl_internal_analytics', 'pl_internal']

export interface GateEnv {
  hostname: string
  pathname: string
  /** localStorage-style reader; may throw (private mode) — callers wrap it. */
  getItem: (key: string) => string | null
}

/** Pure decision, injectable for tests. */
export function gateDecision(env: GateEnv): { allowed: boolean; reason: string } {
  const host = (env.hostname || '').toLowerCase()
  if (!PRODUCTION_HOSTS.includes(host)) return { allowed: false, reason: 'non-production-host' }
  if (EXCLUDED_PATH_PREFIXES.some(p => env.pathname === p || env.pathname.startsWith(p + '/')))
    return { allowed: false, reason: 'internal-route' }
  for (const key of INTERNAL_FLAG_KEYS) {
    let v: string | null = null
    try { v = env.getItem(key) } catch { v = null }
    if (v === '1') return { allowed: false, reason: 'internal-browser-flag' }
  }
  let consent: string | null = null
  try { consent = env.getItem('cookie_consent') } catch { consent = null }
  if (consent === 'declined') return { allowed: false, reason: 'consent-declined' }
  return { allowed: true, reason: 'ok' }
}

/** May THIS browser send analytics right now? Always false on the server. */
export function shouldTrackAnalytics(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return gateDecision({
      hostname: window.location.hostname,
      pathname: window.location.pathname,
      getItem: k => { try { return window.localStorage.getItem(k) } catch { return null } },
    }).allowed
  } catch {
    return false
  }
}
