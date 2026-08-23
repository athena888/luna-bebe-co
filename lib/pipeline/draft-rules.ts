// The hard rules every cold draft is judged by, kept dependency-free so they
// can be unit tested. drafter.ts imports them; importing drafter.ts directly
// builds a Supabase client at module load, which a test has no business doing.

export const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length

/**
 * How many LINKS a body contains. Exactly one is allowed.
 *
 * An EMAIL ADDRESS IS NOT A LINK. Emily's signature carries both
 * hello@petitelavande.com and petitelavande.com/corporate, and the bare domain
 * inside the address counted as a second link — so every cold template failed
 * the one-link rule and the drafter silently produced zero drafts. Morning
 * Review sat empty from 2026-08-20 until this was found. Addresses are stripped
 * before counting; the rule itself is unchanged.
 *
 * Whole URLs are matched, not URL-ish fragments. The previous pattern counted
 * "https://" and "petitelavande.com" as two separate hits, so a template
 * written with a full https:// link would have been rejected as well — a
 * second way to fail the same rule that had simply never been triggered,
 * because the templates use the bare petitelavande.com/corporate form.
 */
export const linkCount = (s: string) =>
  (s.replace(/[\w.+-]+@[\w.-]+\.\w+/g, ' ')
    .match(/(?:https?:\/\/|www\.)\S+|petitelavande\.com\S*/gi) ?? []).length
