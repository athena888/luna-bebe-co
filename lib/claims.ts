// Customer-facing claim guards (Merchant Center "Misrepresentation" review).
// Client-safe: no server imports.
import { scrubGots } from './feed-copy.ts'

// Tags that read as unsubstantiated safety/testing claims. Retired from the
// admin tag list; any product still carrying one in the database simply shows
// no tag instead.
const RETIRED_TAGS = new Set(['dermatologist tested', 'eczema safe'])

export function publicTag(tag: string | null | undefined): string | undefined {
  const t = (tag ?? '').trim()
  return t && !RETIRED_TAGS.has(t.toLowerCase()) ? t : undefined
}

// No GOTS or "certified organic" claims anywhere on the site. Owner/AI-written
// copy stored in the database can still contain them, so scrub it wherever
// that copy renders — same rule as the Merchant feed (lib/feed-copy.ts):
// "100% GOTS Organic Cotton" → "100% Organic Cotton"; "certified organic" → "organic".
export function stripGots(s?: string | null): string {
  return scrubGots(s ?? '').trim()
}
