// Customer-facing claim guards (Merchant Center "Misrepresentation" review).
// Client-safe: no server imports.

// Tags that read as unsubstantiated safety/testing claims. Retired from the
// admin tag list; any product still carrying one in the database simply shows
// no tag instead.
const RETIRED_TAGS = new Set(['dermatologist tested', 'eczema safe'])

export function publicTag(tag: string | null | undefined): string | undefined {
  const t = (tag ?? '').trim()
  return t && !RETIRED_TAGS.has(t.toLowerCase()) ? t : undefined
}

// GOTS is not claimed anywhere on the site. Owner/AI-written copy stored in
// the database can still contain it, so strip it wherever that copy renders:
// "100% GOTS Organic Cotton" → "100% Organic Cotton"; "GOTS-certified cotton" → "cotton".
export function stripGots(s?: string | null): string {
  return (s ?? '')
    .replace(/GOTS[-‑\s]*certified\s*/gi, '')
    .replace(/\bGOTS\b[-\s]*/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}
