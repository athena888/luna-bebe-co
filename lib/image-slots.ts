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
  { key: 'story.french_bg',  label: 'French apothecary photo', group: 'Story', where: 'Right half of the "French Apothecary Soul" closing band (left half is a cream text panel)', ratio: '16:9', hint: 'Landscape lifestyle — keep the subject toward the right · ~2000×1130' },

  // ── Shop ───────────────────────────────────────────────────────────────────
  { key: 'shop.header_bg', label: 'Header background', group: 'Shop', where: 'Sits behind the title at the top of the Shop page', ratio: '21:9', hint: 'Wide & soft (text sits on top) · ~2000×860', mobile: { ratio: '4:5', hint: 'Taller phone crop · ~1000×1250' } },

  // ── Gift Cards ──────────────────────────────────────────────────────────────
  { key: 'giftcards.header_bg', label: 'Header background', group: 'Gift Cards', where: 'Sits behind the Gift Cards header / form panel', ratio: '21:9', hint: 'Wide & soft · ~2000×860', mobile: { ratio: '4:5', hint: 'Taller phone crop · ~1000×1250' }, scrimDefault: { hex: '#FAF9F8', opacity: 0.55 } },
  { key: 'giftcard.visual',     label: 'Gift card artwork',  group: 'Gift Cards', where: 'The card image in the live gift-card preview', ratio: '3:2', hint: 'Gift card art · ~1200×800' },

  // ── Build Your Box ──────────────────────────────────────────────────────────
  { key: 'build.header_bg',   label: 'Hero background',           group: 'Build Your Box', where: 'Tall hero at the very top of Build Your Box', ratio: '16:9', hint: 'Fills a tall hero — keep the subject centered · ~2400×1500', mobile: { ratio: '4:5', hint: 'Taller phone crop · ~1100×1400' }, scrimDefault: { hex: '#181716', opacity: 0.75 } },

  // ── Corporate ──────────────────────────────────────────────────────────────
  { key: 'corporate.hero_bg', label: 'Hero background', group: 'Corporate', where: 'Background behind the "When your people become parents" hero', ratio: '21:9', hint: 'Wide & soft · ~2000×860', mobile: { ratio: '4:5', hint: 'Taller phone crop · ~1000×1250' }, scrimDefault: { hex: '#FAF9F8', opacity: 0.40 } },
  { key: 'corporate.points_bg', label: 'Three-points background', group: 'Corporate', where: 'Behind the "One less thing / Traceable / Simple to run" band (photo above the olive panel on phones)', ratio: '21:9', hint: 'Shown full width, uncropped on desktop · ~2000×860', mobile: { ratio: '4:5', hint: 'Taller phone crop · ~1000×1250 — phones crop the desktop image to 4:5 otherwise' }, scrimDefault: { hex: '#181716', opacity: 0 } },
  { key: 'corporate.form_bg', label: 'Lead-form background', group: 'Corporate', where: 'Behind the "Tell us about your team" inquiry form at the bottom of /corporate', ratio: '21:9', hint: 'Wide & soft — the form card sits on top · ~2000×860', mobile: { ratio: '4:5', hint: 'Taller phone crop · ~1000×1250' }, scrimDefault: { hex: '#FAF9F8', opacity: 0.55 } },

  // ── Press ───────────────────────────────────────────────────────────────────
  { key: 'press.hero_bg', label: 'Hero background', group: 'Press', where: 'Background behind the Press Kit header (title + one-liner + contact)', ratio: '21:9', hint: 'Wide & soft — text sits on top · ~2000×860', mobile: { ratio: '4:5', hint: 'Taller phone crop · ~1000×1250' }, scrimDefault: { hex: '#FBF7F0', opacity: 0.70 } },
  { key: 'press.images_bg', label: 'Image-grid background', group: 'Press', where: 'Behind the downloadable press photo grid', ratio: '21:9', hint: 'Very soft — the photo cards sit on top · ~2000×860', mobile: { ratio: '4:5', hint: 'Taller phone crop · ~1000×1250' }, scrimDefault: { hex: '#FBF7F0', opacity: 0.88 } },
  { key: 'press.linesheet_bg', label: 'Line-sheet background', group: 'Press', where: 'Behind the tier/price line sheet at the bottom of /press', ratio: '21:9', hint: 'Very soft — the white table sits on top · ~2000×860', mobile: { ratio: '4:5', hint: 'Taller phone crop · ~1000×1250' }, scrimDefault: { hex: '#FBF7F0', opacity: 0.88 } },

  // ── Legal Pages ─────────────────────────────────────────────────────────────
  { key: 'legal.bg', label: 'Page background', group: 'Legal Pages', where: 'Behind Privacy Policy, Terms of Service and Returns (one shared image)', ratio: '21:9', hint: 'Wide & soft — the text sits on top · ~2000×860', mobile: { ratio: '9:16', hint: 'Taller phone crop · ~1080×1920' }, scrimDefault: { hex: '#FAF9F8', opacity: 0.85 } },

  // ── Ready-Made Boxes ────────────────────────────────────────────────────────
  { key: 'boxes.custom_cta_bg', label: 'Build-your-own CTA background', group: 'Ready-Made Boxes', where: 'Background behind the "Prefer to choose yourself?" CTA', ratio: '21:9', hint: 'Wide & soft · ~2000×860', mobile: { ratio: '4:5', hint: 'Taller phone crop · ~1000×1250' }, scrimDefault: { hex: '#FAF9F8', opacity: 0.70 } },

  // ── Homepage ────────────────────────────────────────────────────────────────
  { key: 'home.collection', label: '"The Collection" photo', group: 'Homepage', where: 'Right half of The Collection split, next to the "Create Something Unforgettable" panel', ratio: '1:1', hint: 'Shown FULL and uncropped at the panel\'s width · ~1500×1500', mobile: { ratio: '1:1', hint: 'Separate phone image, also shown uncropped — any shape works' } },
  { key: 'home.special_bg', label: '"What makes it special" photo', group: 'Homepage', where: 'Full-bleed lifestyle photo behind the "What makes it special" heading (below Best Sellers)', ratio: '21:9', hint: 'Wide editorial lifestyle — text overlays the bottom · ~2200×950', mobile: { ratio: '4:5', hint: 'Taller phone crop · ~1000×1250' }, scrimDefault: { hex: '#181716', opacity: 0 } },
  { key: 'home.testimonials_bg', label: 'Testimonials background', group: 'Homepage', where: 'Background behind the reviews carousel section', ratio: '21:9', hint: 'Soft, light lifestyle · ~2000×860', mobile: { ratio: '4:5', hint: 'Taller phone crop · ~1000×1250' }, scrimDefault: { hex: '#FAF9F8', opacity: 0.85 } },

  // ── Gifting (2026-09 conversion redesign) ──────────────────────────────────
  // The ten photographs the gifting pages are built around. Full crop, subject
  // and purpose specification lives in docs/PHOTO_ASSETS.md — that file is the
  // brief the photographs get shot from, this list is where they get uploaded.
  // Every section using one of these renders a typographic fallback when the
  // slot is empty, so the site is never waiting on a photo to be correct.
  { key: 'gift.hero', label: 'PHOTO 01 — Homepage hero', group: 'Gifting', where: 'The homepage hero. A complete gifting moment: open basket, a companion, a baby item, a Mama item, ribbon and card, human hands', ratio: '16:9', hint: 'Warm, daylight, gift-forward — NOT a white-background product shot · ~2400×1350', mobile: { ratio: '4:5', hint: 'REQUIRED — the desktop crop loses the Mama item on a phone, which loses the whole point · ~1200×1500' }, scrimDefault: { hex: '#4B3F37', opacity: 0.34 } },
  { key: 'gift.occasion.baby_shower', label: 'PHOTO 02 — Baby shower', group: 'Gifting', where: '"Shop by Moment" card 1 and the /baby-shower-gifts hero', ratio: '4:5', hint: 'The finished gift presented on a table at a shower — copy sits over the bottom 40% · ~1200×1500' },
  { key: 'gift.occasion.new_mama', label: 'PHOTO 03 — New mama', group: 'Gifting', where: '"Shop by Moment" card 2 and the /new-mama-gifts hero', ratio: '4:5', hint: 'Intimate, quiet — the Mama item is the subject, the baby item is secondary · ~1200×1500' },
  { key: 'gift.occasion.new_arrival', label: 'PHOTO 04 — New arrival', group: 'Gifting', where: '"Shop by Moment" card 3 and the /newborn-gifts hero', ratio: '4:5', hint: 'Soft newborn gifting environment — bassinet edge, folded muslin, morning light · ~1200×1500' },
  { key: 'gift.occasion.team', label: 'PHOTO 05 — From the team', group: 'Gifting', where: '"Shop by Moment" card 4 and the /team-new-parent-gifts hero', ratio: '4:5', hint: 'The most restrained of the four: neutral surface, one signed card. No pastels, no nursery props · ~1200×1500' },
  { key: 'gift.basket_reuse', label: 'PHOTO 06 — Basket reuse', group: 'Gifting', where: 'The "wrapping becomes part of the gift" band', ratio: '3:2', hint: 'The ACTUAL seagrass basket in a nursery weeks later — books, rolled muslin, small toys. Ribbon gone · ~1800×1200', mobile: { ratio: '4:5', hint: 'Taller phone crop · ~1100×1375' } },
  { key: 'gift.companions', label: 'PHOTO 07 — Little companions', group: 'Gifting', where: 'The "Meet the little companions" band', ratio: '3:2', hint: 'One crochet doll in a small built scene — windowsill, book, dried lavender. Shallow depth of field · ~1800×1200', mobile: { ratio: '1:1', hint: 'Square phone crop · ~1200×1200' } },
  { key: 'gift.material', label: 'PHOTO 08 — Material close-up', group: 'Gifting', where: 'The "Chosen for how it feels" band (first frame)', ratio: '3:2', hint: 'Macro texture: woven seagrass, cotton, embroidery, ribbon, card stock, knit · ~1800×1200' },
  { key: 'gift.material.2', label: 'PHOTO 08b — Material close-up 2', group: 'Gifting', where: 'The "Chosen for how it feels" band (second frame)', ratio: '3:2', hint: 'Same light and grade as PHOTO 08 so the row reads as one set · ~1800×1200' },
  { key: 'gift.material.3', label: 'PHOTO 08c — Material close-up 3', group: 'Gifting', where: 'The "Chosen for how it feels" band (third frame)', ratio: '3:2', hint: 'Same light and grade as PHOTO 08 · ~1800×1200' },
  { key: 'gift.packing', label: 'PHOTO 09 — Packing', group: 'Gifting', where: 'Beside the three "how it works" steps', ratio: '3:2', hint: 'Hands tying ribbon, writing the card, or setting it into the basket · ~1800×1200', mobile: { ratio: '4:5', hint: 'Taller phone crop · ~1100×1375' } },
  { key: 'gift.mama_and_baby', label: 'Mama + baby pairing', group: 'Gifting', where: 'The "Most baby gifts are for the baby" differentiator band', ratio: '3:2', hint: 'One baby item and one Mama item together in a single frame — the whole argument in one photo · ~1800×1200', mobile: { ratio: '4:5', hint: 'Taller phone crop · ~1100×1375' } },

  // ── Footer ──────────────────────────────────────────────────────────────────
  { key: 'footer.bg', label: 'Footer background', group: 'Footer', where: 'Sits behind the whole site footer (every page)', ratio: '21:9', hint: 'Wide & soft · ~2000×860', mobile: { ratio: '4:5', hint: 'Taller phone crop · ~1000×1250' }, scrimDefault: { hex: '#F4F2EF', opacity: 0.30 } },

  // ── Sign In ─────────────────────────────────────────────────────────────────
  { key: 'signin.bg', label: 'Sign-in background', group: 'Sign In', where: 'Behind the admin sign-in form on the login page', ratio: '16:9', hint: 'Soft lifestyle image · ~1920×1080', mobile: { ratio: '4:5', hint: 'Taller phone crop · ~1000×1250' }, scrimDefault: { hex: '#181716', opacity: 0.45 } },

  // ── Global ──────────────────────────────────────────────────────────────────
  { key: 'global.logo',     label: 'Logo / seal',             group: 'Global', where: 'Shown in the site header & footer', ratio: '1:1', hint: 'Transparent PNG · ~600×600' },
  { key: 'global.og_image', label: 'Social-share image (OG)', group: 'Global', where: 'Link preview when the site is shared on social', ratio: '1.91:1', hint: 'Link preview · 1200×630' },
]

export const SLOT_BUCKET = 'home-images'

// Box detail pages (/boxes/<slug> and its /es twin) each get their own optional
// background photo. These aren't in IMAGE_SLOTS because the box lineup lives in
// the catalog — the portal builds them from the live product list so a new box
// gets its slot automatically. The scrim keeps the product copy readable; Emily
// can tune it per box from the same card.
export const boxSlotKey = (slug: string) => `box.${slug}.bg`

export function boxPageSlot(slug: string, name: string): ImageSlot {
  return {
    key: boxSlotKey(slug),
    label: name,
    group: 'Box Pages',
    where: `Background behind the whole /boxes/${slug} page (and its Spanish twin)`,
    ratio: '16:9',
    hint: 'Soft, light lifestyle — product copy sits on top · ~2000×1130',
    mobile: { ratio: '4:5', hint: 'Taller phone crop · ~1000×1250' },
    scrimDefault: { hex: '#FFFFFF', opacity: 0.88 },
  }
}

export function slotsByGroup(): Record<string, ImageSlot[]> {
  const out: Record<string, ImageSlot[]> = {}
  for (const s of IMAGE_SLOTS) (out[s.group] ??= []).push(s)
  return out
}
