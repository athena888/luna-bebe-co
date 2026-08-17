// Copy rules for the Merchant feed, kept dependency-free so they can be unit
// tested without pulling in Supabase (lib/google-feed-tsv.ts imports them).
// Both scrubs rewrite FEED text only — the website says whatever Emily wants.

// GOTS wording is held out of the FEED until the Transaction Certificate
// confirms per-product certification (gots_certified, §49).
// "GOTS-certified organic cotton" must become "certified organic cotton" —
// the eager first replacement alone produced "certified organic organic".
export const scrubGots = (s: string) => s
  .replace(/GOTS[- ]certified\s+organic\b/gi, 'certified organic')
  .replace(/GOTS[- ]certified/gi, 'certified organic')
  .replace(/\bGOTS\b/g, 'certified organic')

// Google flagged "Personalized advertising: personal hardships" (2026-08-17),
// limiting visibility in the US: postpartum recovery reads as a health
// condition and pain relief as a personal difficulty, and ads may not be keyed
// to either. Order matters — multi-word phrases run first so a phrase can't be
// half-replaced. Gentle comfort words ("soothing", "calming") are deliberately
// left alone; only condition- and pain-oriented wording is rewritten.
// Replacements must READ WELL — these strings are the ad copy a shopper sees,
// so a blunt find-and-replace ("New Mom new-mother Gift Box") is not good
// enough. Capitalization is carried across from the word being replaced.
const newMom = (m: string) => (/^[A-Z]/.test(m) ? 'New Mom' : 'new mom')

export const scrubHardship = (s: string) => s
  // Health conditions / recovery
  .replace(/\bpost-?partum\s+(?:recovery|care|healing)\b/gi, m => `${newMom(m)} Care`)
  .replace(/\bpost-?partum\b/gi, newMom)
  .replace(/\b(?:c-section|cesarean)\b/gi, newMom)
  // "Sitz Salt Soak" must not become "Bath Soak Soak" — keep the noun that
  // follows and replace only the clinical word in front of it.
  .replace(/\bsitz\s+(salts?|soak)\b/gi, (_m, noun: string) => `Bath ${noun[0].toUpperCase()}${noun.slice(1)}`)
  .replace(/\bsitz\s+bath\b/gi, m => (/^[A-Z]/.test(m) ? 'Bath Soak' : 'bath soak'))
  .replace(/\bsitz\b/gi, m => (/^[A-Z]/.test(m) ? 'Bath' : 'bath'))
  .replace(/\brecovery\b/gi, m => (/^[A-Z]/.test(m) ? 'Comfort' : 'comfort'))
  .replace(/\bhealing\b/gi, m => (/^[A-Z]/.test(m) ? 'Nourishing' : 'nourishing'))
  // A phrase like "New Mom Postpartum Gift" would otherwise double up
  .replace(/\bnew mom\s+new mom\b/gi, m => newMom(m))
  // Pain / difficulty
  .replace(/\bsore\s+gums\b/gi, 'little gums')
  .replace(/\bsore\s+(?:nipples|muscles|body)\b/gi, 'tired body')
  .replace(/\bsoreness\b/gi, 'tenderness')
  .replace(/\bsore\b/gi, 'tender')
  .replace(/\b(?:aches?|aching)\b/gi, 'tiredness')
  .replace(/\bpain\s+relief\b/gi, 'comfort')
  .replace(/\brelief\b/gi, 'comfort')
  .replace(/\bpainful\b/gi, 'uncomfortable')
  .replace(/\bpains?\b/gi, 'discomfort')
  // Tidy any double spaces the replacements leave behind
  .replace(/\s{2,}/g, ' ')
