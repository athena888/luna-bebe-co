// Canonical list of standalone image slots the admin can manage.
// The admin UI renders these; pages read them by key via getSiteImage().
// All stored in the existing public 'home-images' bucket.
export interface ImageSlot {
  key: string
  label: string
  group: string
  ratio: string          // recommended aspect, e.g. '3:4'
  hint?: string          // recommended dimensions / guidance
}

export const IMAGE_SLOTS: ImageSlot[] = [
  // Story page
  { key: 'story.hero',    label: 'Story — Hero',         group: 'Story', ratio: '16:9', hint: 'Wide lifestyle banner, ~2000×1100' },
  { key: 'story.founder', label: 'Story — Founder photo', group: 'Story', ratio: '3:4',  hint: 'Portrait, ~900×1200' },
  { key: 'story.value.1', label: 'Story — Value 1',      group: 'Story', ratio: '1:1',  hint: 'Square, ~800×800' },
  { key: 'story.value.2', label: 'Story — Value 2',      group: 'Story', ratio: '1:1',  hint: 'Square, ~800×800' },
  { key: 'story.value.3', label: 'Story — Value 3',      group: 'Story', ratio: '1:1',  hint: 'Square, ~800×800' },

  // Build category banners
  { key: 'build.banner.swaddle',  label: 'Build — Swaddle & Blanket banner', group: 'Build', ratio: '21:9', hint: 'Wide band, ~2000×860' },
  { key: 'build.banner.garment',  label: 'Build — Baby Garment banner',      group: 'Build', ratio: '21:9', hint: 'Wide band, ~2000×860' },
  { key: 'build.banner.bath',     label: 'Build — Bath & Skincare banner',   group: 'Build', ratio: '21:9', hint: 'Wide band, ~2000×860' },
  { key: 'build.banner.keepsake', label: 'Build — Keepsake & Toy banner',    group: 'Build', ratio: '21:9', hint: 'Wide band, ~2000×860' },
  { key: 'build.banner.mom',      label: "Build — Mama's Gift banner",       group: 'Build', ratio: '21:9', hint: 'Wide band, ~2000×860' },

  // Guide + misc
  { key: 'guide.hero',     label: 'Gift Guide — Hero',     group: 'Guide', ratio: '16:9', hint: 'Wide banner, ~2000×1100' },
  { key: 'giftcard.visual', label: 'Gift Card — Visual',   group: 'Misc',  ratio: '3:2',  hint: 'Gift card art, ~1200×800' },
  { key: 'global.og_image', label: 'Global — Social share image (OG)', group: 'Misc', ratio: '1.91:1', hint: 'Link preview, 1200×630' },
]

export const SLOT_BUCKET = 'home-images'

export function slotsByGroup(): Record<string, ImageSlot[]> {
  const out: Record<string, ImageSlot[]> = {}
  for (const s of IMAGE_SLOTS) (out[s.group] ??= []).push(s)
  return out
}
