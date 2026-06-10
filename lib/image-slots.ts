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
}

export const IMAGE_SLOTS: ImageSlot[] = [
  // ── Story ──────────────────────────────────────────────────────────────────
  { key: 'story.hero',    label: 'Hero banner',       group: 'Story', where: 'Wide photo across the very top of the Story page', ratio: '21:9', hint: 'Soft, wide lifestyle shot · ~2000×860', mobile: { ratio: '4:5', hint: 'Taller crop so faces aren’t cut off on phones · ~1000×1250' } },
  { key: 'story.founder', label: 'Founder portrait',  group: 'Story', where: 'Portrait that floats beside the founder’s letter', ratio: '3:4', hint: 'Portrait · ~900×1200' },
  { key: 'story.value.1', label: 'Value icon — “Purely Organic”', group: 'Story', where: 'Round icon above the “Purely Organic” value', ratio: '1:1', hint: 'Square, centered subject · ~800×800' },
  { key: 'story.value.2', label: 'Value icon — “Artisan-Made”',   group: 'Story', where: 'Round icon above the “Artisan-Made” value', ratio: '1:1', hint: 'Square, centered subject · ~800×800' },
  { key: 'story.value.3', label: 'Value icon — “Every Detail”',   group: 'Story', where: 'Round icon above the “Every Detail” value', ratio: '1:1', hint: 'Square, centered subject · ~800×800' },
  { key: 'story.founder_bg', label: 'Founder letter background', group: 'Story', where: 'Background behind the founder letter section', ratio: '16:9', hint: 'Soft, light lifestyle · ~2000×1130', mobile: { ratio: '4:5', hint: 'Taller phone crop · ~1000×1250' } },
  { key: 'story.values_bg', label: 'Values section background',   group: 'Story', where: 'Background behind the “What We Stand For” section', ratio: '16:9', hint: 'Soft, airy background · ~2000×1130', mobile: { ratio: '4:5', hint: 'Taller phone crop · ~1000×1250' } },

  // ── Shop ───────────────────────────────────────────────────────────────────
  { key: 'shop.header_bg', label: 'Header background', group: 'Shop', where: 'Sits behind the title at the top of the Shop page', ratio: '21:9', hint: 'Wide & soft (text sits on top) · ~2000×860', mobile: { ratio: '4:5', hint: 'Taller phone crop · ~1000×1250' } },

  // ── Gift Guide ──────────────────────────────────────────────────────────────
  { key: 'guide.header_bg', label: 'Header background', group: 'Gift Guide', where: 'Sits behind the title at the top of the Gift Guide page', ratio: '21:9', hint: 'Wide & soft · ~2000×860', mobile: { ratio: '4:5', hint: 'Taller phone crop · ~1000×1250' } },

  // ── Gift Cards ──────────────────────────────────────────────────────────────
  { key: 'giftcards.header_bg', label: 'Header background', group: 'Gift Cards', where: 'Sits behind the Gift Cards header / form panel', ratio: '21:9', hint: 'Wide & soft · ~2000×860', mobile: { ratio: '4:5', hint: 'Taller phone crop · ~1000×1250' } },
  { key: 'giftcard.visual',     label: 'Gift card artwork', group: 'Gift Cards', where: 'The card image in the live gift-card preview', ratio: '3:2', hint: 'Gift card art · ~1200×800' },

  // ── Build Your Box ──────────────────────────────────────────────────────────
  { key: 'build.header_bg',       label: 'Hero background', group: 'Build Your Box', where: 'Tall hero at the very top of Build Your Box', ratio: '16:9', hint: 'Fills a tall hero — keep the subject centered · ~2400×1500', mobile: { ratio: '4:5', hint: 'Taller phone crop · ~1100×1400' } },
  { key: 'build.banner.swaddle',  label: 'Banner — Swaddle & Blanket', group: 'Build Your Box', where: 'Wide banner above the Swaddle & Blanket category', ratio: '21:9', hint: 'Wide band · ~2000×860' },
  { key: 'build.banner.garment',  label: 'Banner — Baby Garment',      group: 'Build Your Box', where: 'Wide banner above the Baby Garment category', ratio: '21:9', hint: 'Wide band · ~2000×860' },
  { key: 'build.banner.bath',     label: 'Banner — Bath & Skincare',   group: 'Build Your Box', where: 'Wide banner above the Bath & Skincare category', ratio: '21:9', hint: 'Wide band · ~2000×860' },
  { key: 'build.banner.keepsake', label: 'Banner — Keepsake & Toy',    group: 'Build Your Box', where: 'Wide banner above the Keepsake & Toy category', ratio: '21:9', hint: 'Wide band · ~2000×860' },
  { key: 'build.banner.mom',      label: 'Banner — Mama’s Gift',       group: 'Build Your Box', where: 'Wide banner above the Mama’s Gift category', ratio: '21:9', hint: 'Wide band · ~2000×860' },

  // ── Gift Guides ─────────────────────────────────────────────────────────────
  { key: 'gifts.organic-newborn-gift-box.hero',    label: 'Organic Newborn — Hero',       group: 'Gift Guides', where: 'Background behind the hero on /gifts/organic-newborn-gift-box',    ratio: '21:9', hint: 'Wide & soft · ~2000×860', mobile: { ratio: '4:5', hint: '~1000×1250' } },
  { key: 'gifts.gender-neutral-baby-gift-box.hero', label: 'Gender-Neutral — Hero',       group: 'Gift Guides', where: 'Background behind the hero on /gifts/gender-neutral-baby-gift-box', ratio: '21:9', hint: 'Wide & soft · ~2000×860', mobile: { ratio: '4:5', hint: '~1000×1250' } },
  { key: 'gifts.postpartum-care-package.hero',      label: 'Postpartum Care — Hero',      group: 'Gift Guides', where: 'Background behind the hero on /gifts/postpartum-care-package',      ratio: '21:9', hint: 'Wide & soft · ~2000×860', mobile: { ratio: '4:5', hint: '~1000×1250' } },
  { key: 'gifts.organic-baby-clothes-gift-set.hero',label: 'Organic Clothes — Hero',      group: 'Gift Guides', where: 'Background behind the hero on /gifts/organic-baby-clothes-gift-set', ratio: '21:9', hint: 'Wide & soft · ~2000×860', mobile: { ratio: '4:5', hint: '~1000×1250' } },
  { key: 'gifts.french-baby-gifts.hero',            label: 'French Baby Gifts — Hero',    group: 'Gift Guides', where: 'Background behind the hero on /gifts/french-baby-gifts',            ratio: '21:9', hint: 'Wide & soft · ~2000×860', mobile: { ratio: '4:5', hint: '~1000×1250' } },
  { key: 'gifts.luxury-baby-shower-gift.hero',      label: 'Luxury Shower Gift — Hero',   group: 'Gift Guides', where: 'Background behind the hero on /gifts/luxury-baby-shower-gift',      ratio: '21:9', hint: 'Wide & soft · ~2000×860', mobile: { ratio: '4:5', hint: '~1000×1250' } },

  // ── Ready-Made Boxes ────────────────────────────────────────────────────────
  { key: 'boxes.custom_cta_bg', label: 'Build-your-own CTA background', group: 'Ready-Made Boxes', where: 'Background behind the “Prefer to choose yourself?” CTA', ratio: '21:9', hint: 'Wide & soft · ~2000×860', mobile: { ratio: '4:5', hint: 'Taller phone crop · ~1000×1250' } },

  // ── Homepage ────────────────────────────────────────────────────────────────
  { key: 'home.testimonials_bg', label: 'Testimonials background', group: 'Homepage', where: 'Background behind the reviews carousel section', ratio: '21:9', hint: 'Soft, light lifestyle · ~2000×860', mobile: { ratio: '4:5', hint: 'Taller phone crop · ~1000×1250' } },

  // ── Footer ──────────────────────────────────────────────────────────────────
  { key: 'footer.bg', label: 'Footer background', group: 'Footer', where: 'Sits behind the whole site footer (every page)', ratio: '21:9', hint: 'Wide & soft · ~2000×860', mobile: { ratio: '4:5', hint: 'Taller phone crop · ~1000×1250' } },

  // ── Global ──────────────────────────────────────────────────────────────────
  { key: 'global.logo',     label: 'Logo / seal',          group: 'Global', where: 'Shown in the site header & footer', ratio: '1:1', hint: 'Transparent PNG · ~600×600' },
  { key: 'global.og_image', label: 'Social-share image (OG)', group: 'Global', where: 'Link preview when the site is shared on social', ratio: '1.91:1', hint: 'Link preview · 1200×630' },
]

export const SLOT_BUCKET = 'home-images'

export function slotsByGroup(): Record<string, ImageSlot[]> {
  const out: Record<string, ImageSlot[]> = {}
  for (const s of IMAGE_SLOTS) (out[s.group] ??= []).push(s)
  return out
}
