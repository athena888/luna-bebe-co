// Compliance gate for lookbook copy. Enforced at PUBLISH time server-side —
// the copy-assist system prompt has the same constraints, but the prompt is
// advice and this check is law. A violation blocks publish, full stop.
//
// Approved GOTS phrasing (garments only): "organic cotton, made by a
// GOTS-certified manufacturer" — variants naming the *maker/manufacturer* as
// GOTS-certified are fine; calling a product/box/brand "GOTS certified" is not.

export interface Violation { field: string; phrase: string; excerpt: string }

const APPROVED_GOTS = /GOTS[-\s]certified\s+(manufacturer|maker|makers|mill|facility)/i

const BANNED: { phrase: string; re: RegExp; allow?: RegExp }[] = [
  { phrase: 'GOTS certified (outside approved phrasing)', re: /GOTS[-\s]certified/gi, allow: APPROVED_GOTS },
  { phrase: 'therapy', re: /\btherapy\b/gi },
  { phrase: 'therapeutic', re: /\btherapeutic\b/gi },
  { phrase: 'cures', re: /\bcures?\b/gi },
  { phrase: 'treats', re: /\btreats?\b/gi },
]

function* stringsOf(value: unknown, path: string): Generator<[string, string]> {
  if (typeof value === 'string') { yield [path, value]; return }
  if (Array.isArray(value)) { for (let i = 0; i < value.length; i++) yield* stringsOf(value[i], `${path}[${i}]`); return }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) yield* stringsOf(v, path ? `${path}.${k}` : k)
  }
}

/** Scan every string field of the copy object. Empty array = clean. */
export function checkBannedPhrases(copy: unknown): Violation[] {
  const violations: Violation[] = []
  for (const [field, text] of stringsOf(copy, '')) {
    for (const rule of BANNED) {
      rule.re.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = rule.re.exec(text)) !== null) {
        // Whitelisted context (e.g. "made by a GOTS-certified manufacturer")?
        const ctx = text.slice(Math.max(0, m.index - 20), m.index + m[0].length + 30)
        if (rule.allow && rule.allow.test(ctx)) continue
        violations.push({ field, phrase: rule.phrase, excerpt: ctx.trim() })
      }
    }
  }
  return violations
}
