// Canonical list of standalone image slots the admin can manage, grouped by the
// PAGE they appear on (in site order) so the portal reads like the website.
// Pages read them by key via getSiteImage(); all stored in the 'home-images'
// bucket. A slot with a `mobile` config can also hold a separate phone crop,
// stored under `${key}.mobile` and shown on small screens.
export interface ImageSlot {
  key: string
  label: string
  group: string          // page / location, shown as a section heading
  where: string          // one-line "where it appears on the site"
  ratio: string          // recommended web aspect, e.g. '21:9'
  hint?: string          // recommended web dimensions / guidance
  mobile?: { ratio: string; hint?: string }  // present → supports an optional phone crop
  scrimDefault?: { hex: string; opacity: number }  // present → slot has a colour overlay the admin can tune
}

export const IMAGE_SLOTS: ImageSlot[] = [
  // ── Story ──────────────────────────────────────────────────────────────────
  { key: 'story.hero',       label: 'Hero banner',            group: 'Story', where: 'Wide photo across the very top of the Story page', ratio: '21:9', hint: 'Soft, wide lifestyle shot · ~2000×860', mobile: { ratio: '4:5', hint: 'Taller crop so faces aren\'t cut off on phones · ~1000×1250' } },
  { key: 'story.hero_bg',    label: 'Hero background',        group: 'Story', where: 'Background behind the opening hero (logo + heading)', ratio: '16:9', hint: 'Soft, light lifestyle · ~2000×1130', mobile: { ratio: '4:5', hint: 'Taller phone crop · ~1000×1250' }, scrimDefault: { hex: '#FBF7F0', opacity: 0.92 } },
  { key: 'story.founder',    label: 'Founder portrait',       group: 'Story', where: 'Portrait that floats beside the founder\'s letter', ratio: '3:4', hint: 'Portrait · ~900×1200' },
  { key: 'story.value.1',    label: 'Value icon — 1',         group: 'Story', where: 'Round icon above the first brand value', ratio: '1:1', hint: 'Square, centered subject · ~800×800' },
  { key: 'story.value.2',    label: 'Value icon — 2',         group: 'Story', where: 'Round icon above the second brand value', ratio: '1:1', hint: 'Square, centered subject · ~800×800' },
  { key: 'story.value.3',    label: 'Value icon — 3',         group: 'Story', where: 'Round icon above the third brand value', ratio: '1:1', hint: 'Square, centered subject · ~800×800' },
  { key: 'story.values_bg',  label: 'Values section background', group: 'Story', where: 'Background behind the "What We Stand For" section', ratio: '16:9', hint: 'Soft, airy background · ~2000×1130', mobile: { ratio: '4:5', hint: 'Taller phone crop · ~1000×1250' }, scrimDefault: { hex: '#3D2F28', opacity: 0.85 } },
  { key: 'story.french_bg',  label: 'French apothecary background', group: 'Story', where: 'Background behind the "French Apothecary Soul" closing section', ratio: '16:9', hint: 'Soft, light lifestyle · ~2000×1130', mobile: { ratio: '4:5', hint: 'Taller phone crop · ~1000×1250' }, scrimDefault: { hex: '#FBF7F0', opacity: 0.92 } },

  // ── Shop ───────────────────────────────────────────────────────────────────
  { key: 'shop.header_bg', label: 'Header background', group: 'Shop', where: 'Sits behind the title at the top of the Shop page', ratio: '21:9', hint: 'Wide & soft (text sits on top) · ~2000×860', mobile: { ratio: '4:5', hint: 'Taller phone crop · ~1000×1250' } },

  // ── Gift Cards ──────────────────────────────────────────────────────────────
  { key: 'giftcards.header_bg', label: 'Header background', group: 'Gift Cards', where: 'Sits behind the Gift Cards header / form panel', ratio: '21:9', hint: 'Wide & soft · ~2000×860', mobile: { ratio: '4:5', hint: 'Taller phone crop · ~1000×1250' }, scrimDefault: { hex: '#FAF9F8', opacity: 0.55 } },
  { key: 'giftcard.visual',     label: 'Gift card artwork',  group: 'Gift Cards', where: 'The card image in the live gift-card preview', ratio: '3:2', hint: 'Gift card art · ~1200×800' },

  // ── Build Your Box ──────────────────────────────────────────────────────────
  { key: 'build.header_bg',   label: 'Hero background',           group: 'Build Your Box', where: 'Tall hero at the very top of Build Your Box', ratio: '16:9', hint: 'Fills a tall hero — keep the subject centered · ~2400×1500', mobile: { ratio: '4:5', hint: 'Taller phone crop · ~1100×1400' }, scrimDefault: { hex: '#181716', opacity: 0.75 } },
  { key: 'build.products_bg', label: 'Products area background',  group: 'Build Your Box', where: 'Background behind the product category list on /build', ratio: '16:9', hint: 'Soft, light — cards sit on top · ~2000×1130', mobile: { ratio: '4:5', hint: 'Taller phone crop · ~1000×1250' }, scrimDefault: { hex: '#FAF9F8', opacity: 0.80 } },

  // ── Corporate ──────────────────────────────────────────────────────────────
  { key: 'corporate.hero_bg', label: 'Hero background', group: 'Corporate', where: 'Background behind the "When your people become parents" hero', ratio: '21:9', hint: 'Wide & soft · ~2000×860', mobile: { ratio: '4:5', hint: 'Taller phone crop · ~1000×1250' }, scrimDefault: { hex: '#FAF9F8', opacity: 0.40 } },
  { key: 'corporate.form_bg', label: 'Lead form background', group: 'Corporate', where: 'Background behind the "Tell us about your team" contact form', ratio: '16:9', hint: 'Soft, light — form sits on top · ~2000×1130', mobile: { ratio: '4:5', hint: 'Taller phone crop · ~1000×1250' }, scrimDefault: { hex: '#FAF9F8', opacity: 0.85 } },
  { key: 'corporate.points_bg', label: 'Three-points background', group: 'Corporate', where: 'Behind the dark "One less thing / Traceable / Simple to run" band (white text)', ratio: '21:9', hint: 'Shown WHOLE (not cropped) on a dark band — use a wide image · ~2000×860', scrimDefault: { hex: '#181716', opacity: 0 } },

  // ── Ready-Made Boxes ────────────────────────────────────────────────────────
  { key: 'boxes.custom_cta_bg', label: 'Build-your-own CTA background', group: 'Ready-Made Boxes', where: 'Background behind the "Prefer to choose yourself?" CTA', ratio: '21:9', hint: 'Wide & soft · ~2000×860', mobile: { ratio: '4:5', hint: 'Taller phone crop · ~1000×1250' }, scrimDefault: { hex: '#FAF9F8', opacity: 0.70 } },

  // ── Homepage ────────────────────────────────────────────────────────────────
  { key: 'home.occasions_bg', label: 'Shop by Occasion background', group: 'Homepage', where: 'Background behind the "Shop by Occasion" collections section', ratio: '21:9', hint: 'Soft, light lifestyle · ~2000×860', mobile: { ratio: '4:5', hint: 'Taller phone crop · ~1000×1250' }, scrimDefault: { hex: '#FAF9F8', opacity: 0.80 } },
  { key: 'home.testimonials_bg', label: 'Testimonials background', group: 'Homepage', where: 'Background behind the reviews carousel section', ratio: '21:9', hint: 'Soft, light lifestyle · ~2000×860', mobile: { ratio: '4:5', hint: 'Taller phone crop · ~1000×1250' }, scrimDefault: { hex: '#FAF9F8', opacity: 0.85 } },

  // ── Footer ──────────────────────────────────────────────────────────────────
  { key: 'footer.bg', label: 'Footer background', group: 'Footer', where: 'Sits behind the whole site footer (every page)', ratio: '21:9', hint: 'Wide & soft · ~2000×860', mobile: { ratio: '4:5', hint: 'Taller phone crop · ~1000×1250' }, scrimDefault: { hex: '#F4F2EF', opacity: 0.30 } },

  // ── Sign In ─────────────────────────────────────────────────────────────────
  { key: 'signin.bg', label: 'Sign-in background', group: 'Sign In', where: 'Behind the admin sign-in form on the login page', ratio: '16:9', hint: 'Soft lifestyle image · ~1920×1080', mobile: { ratio: '4:5', hint: 'Taller phone crop · ~1000×1250' }, scrimDefault: { hex: '#181716', opacity: 0.85 } },

  // ── Global ──────────────────────────────────────────────────────────────────
  { key: 'global.logo',     label: 'Logo / seal',             group: 'Global', where: 'Shown in the site header & footer', ratio: '1:1', hint: 'Transparent PNG · ~600×600' },
  { key: 'global.og_image', label: 'Social-share image (OG)', group: 'Global', where: 'Link preview when the site is shared on social', ratio: '1.91:1', hint: 'Link preview · 1200×630' },
]

export const SLOT_BUCKET = 'home-images'

export function slotsByGroup(): Record<string, ImageSlot[]> {
  const out: Record<string, ImageSlot[]> = {}
  for (const s of IMAGE_SLOTS) (out[s.group] ??= []).push(s)
  return out
}
