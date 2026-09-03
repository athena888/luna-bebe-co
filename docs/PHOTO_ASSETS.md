# Photo Asset Requirements — Petite Lavande

Ten photographs the redesign is built around. Each one has a **slot key**: upload
the file in Portal → Site Images against that key and it appears on the site
immediately — no deploy, no code change. Every slot also accepts an optional
phone crop at `<key>.mobile`; when one is present, phones use it and desktop
uses the wide file.

Nothing here is a nice-to-have. Each photo answers a question a cold Instagram
visitor is asking at that exact point on the page. Until a slot is filled, its
section renders a typographic fallback on the parchment palette — never a
placeholder graphic, never an invented product shot.

## How to read the specs

- **Desktop crop** — the aspect the wide file is displayed at.
- **Mobile crop** — the aspect phones display; upload a separate `.mobile` file
  when the desktop framing would lose the subject.
- **Safe text area** — the region HTML text sits over. Keep it quiet: no
  high-contrast detail, no faces, no product edges.
- **Subject position** — where the thing that sells the photo must sit so that
  neither crop removes it.

## Global rules

- Shoot in daylight. Warm, slightly underexposed, never blown-out white.
- Colour-grade toward the palette: parchment `#F5EFE5`, cream `#FBF7F0`, oat
  `#DED1BE`, dusty rose `#CDA8A1`, soft sage `#A8AD91`, espresso `#4B3F37`.
- **Do not over-retouch the products.** Basket weave, cotton slub, knit texture
  and true colour must survive the edit. A customer comparing the photo to what
  arrives has to see the same object.
- Export JPEG or WebP, quality ~80, long edge as specified. Under 400 KB each
  except the hero (under 600 KB).
- **No baked-in text.** Headlines, prices, CTAs, product names, reviews and
  shipping information all stay as HTML — that is what makes them responsive,
  translatable, indexable, accessible and A/B-testable.
- Canva is for cropping, exposure, white-balance matching, subtle paper or
  textile texture, and ad creative. It is not for building website graphics.

---

## PHOTO 01 — Homepage hero

- **Slot:** `gift.hero` · **File:** `homepage-hero-gifting.jpg`
- **Job:** in under a second, "this is a gift, and it is for two people."
- **Desktop crop:** 16:9 · 2400 × 1350
- **Mobile crop:** 4:5 · 1200 × 1500 (`gift.hero.mobile`) — **required**, not
  optional. The desktop framing loses the Mama item on a phone, which loses the
  entire differentiator.
- **Safe text area:** desktop — left 42% of the frame, vertically centred.
  Mobile — bottom 38%.
- **Subject position:** the open basket sits right-of-centre on desktop and in
  the upper 55% on mobile.
- **Must contain:** the open basket; a crochet companion visible; one baby item;
  **one item clearly for Mama**; ribbon and the card; hands or another human
  cue.
- **Must not be:** an isolated white-background product shot, a flat-lay with no
  human context, or a shot where the Mama item is ambiguous.
- This is the LCP image. It is the only image on the page loaded eagerly with
  `fetchPriority="high"`.

## PHOTO 02 — Baby shower

- **Slot:** `gift.occasion.baby_shower` · **File:** `occasion-baby-shower.jpg`
- **Job:** "I can carry this into a shower and it will be the gift people
  remember."
- **Desktop crop:** 4:5 · 1200 × 1500 · **Mobile crop:** 4:5, same file works
- **Safe text area:** bottom 40% (the card's copy and CTA sit over a gradient)
- **Subject position:** finished, ribbon-tied basket in the upper two-thirds,
  slightly left of centre.
- **Must contain:** the gift finished and presented on a table — a shower
  setting readable at a glance (a few glasses, flowers, a linen cloth). Enough
  context to say "party", not so much that the basket stops being the subject.

## PHOTO 03 — New mama

- **Slot:** `gift.occasion.new_mama` · **File:** `occasion-new-mama.jpg`
- **Job:** prove "for her, too" with one frame.
- **Desktop crop:** 4:5 · 1200 × 1500 · **Mobile crop:** 4:5, same file
- **Safe text area:** bottom 40%
- **Subject position:** the Mama item — tea, balm, the lavender kit — held or
  resting in the upper two-thirds; a baby item softly present but secondary.
- **Tone:** intimate and quiet. A morning, not a party. Warmer and closer than
  PHOTO 02.

## PHOTO 04 — New arrival

- **Slot:** `gift.occasion.new_arrival` · **File:** `occasion-new-arrival.jpg`
- **Job:** "this is what arrives at their door after the baby comes."
- **Desktop crop:** 4:5 · 1200 × 1500 · **Mobile crop:** 4:5, same file
- **Safe text area:** bottom 40%
- **Subject position:** basket upper two-thirds, in a soft newborn environment —
  a bassinet edge, a folded muslin, morning light on a nursery floor.

## PHOTO 05 — From the team

- **Slot:** `gift.occasion.team` · **File:** `occasion-team-gifting.jpg`
- **Job:** "I can send this from twelve coworkers without it being weird."
- **Desktop crop:** 4:5 · 1200 × 1500 · **Mobile crop:** 4:5, same file
- **Safe text area:** bottom 40%
- **Subject position:** basket centred, upper two-thirds.
- **Tone:** the most restrained of the four. Neutral surface, one signed card,
  clean linen. **No pastels, no nursery props, no toys in frame.** It should read
  as something an office manager is comfortable putting on a purchase order.

## PHOTO 06 — Basket reuse

- **Slot:** `gift.basket_reuse` · **File:** `basket-nursery-reuse.jpg`
- **Job:** turn the seagrass basket from a packaging cost into part of what is
  bought. Commercially the highest-leverage photo on this list.
- **Desktop crop:** 3:2 · 1800 × 1200 · **Mobile crop:** 4:5 · 1100 × 1375
  (`gift.basket_reuse.mobile`)
- **Safe text area:** desktop — right 45%. Mobile — none; copy sits below.
- **Subject position:** basket left-of-centre on desktop, centred on mobile.
- **Must contain:** the **actual seagrass basket we ship**, lid off, in a real
  nursery, holding everyday things — board books, a rolled muslin, a small toy,
  folded blankets. Ribbon gone. The unboxing is over; this is week six.
- **Must not:** imply any sustainability or waste claim. The photo says "you keep
  using it", and that is the whole message.

## PHOTO 07 — Little companions

- **Slot:** `gift.companions` · **File:** `little-companions-story.jpg`
- **Job:** begin the Petite Lavande character world. The doll is a companion,
  not a SKU.
- **Desktop crop:** 3:2 · 1800 × 1200 · **Mobile crop:** 1:1 · 1200 × 1200
  (`gift.companions.mobile`)
- **Safe text area:** desktop — left 40%. Mobile — below the image.
- **Subject position:** the doll sits right-of-centre on desktop, centred on
  mobile, small in the frame — scale is what makes it storybook.
- **Must contain:** one crochet doll placed in a small built environment: on a
  windowsill with a folded blanket, beside a book, under a sprig of dried
  lavender. Shallow depth of field. It should look like a scene from a story, not
  a product listing.
- **Must not:** state or imply materials, origin or manufacturing method. Copy
  around this photo names no material claim.

## PHOTO 08 — Material close-up

- **Slot:** `gift.material` · **File:** `material-seagrass-closeup.jpg`
- **Job:** make the site feel like something you could touch.
- **Desktop crop:** 3:2 · 1800 × 1200 · **Mobile crop:** 3:2, same file
- **Safe text area:** none — copy sits beside or below.
- **Subject position:** fills the frame.
- **Must contain:** macro texture — woven seagrass, cotton weave, embroidery
  stitching, ribbon edge, card stock, knit. One material per frame reads best;
  if shooting several, keep the light and grade identical so they can sit in a
  row.
- Additional frames may be uploaded as `gift.material.2`, `gift.material.3`.

## PHOTO 09 — Packing

- **Slot:** `gift.packing` · **File:** `packing-hands.jpg`
- **Job:** a person prepares this. Trust, immediately before the "how it works"
  steps.
- **Desktop crop:** 3:2 · 1800 × 1200 · **Mobile crop:** 4:5 · 1100 × 1375
  (`gift.packing.mobile`)
- **Safe text area:** desktop — right 40%.
- **Subject position:** hands left-of-centre.
- **Must contain:** hands tying the ribbon, writing the card, or setting the card
  into the basket. Real hands, real workspace, slight imperfection welcome.

## PHOTO 10 — UGC

- **Slot:** managed through the existing UGC pipeline, **not** a site-image slot.
- **Job:** social proof that does not look art-directed.
- **Source:** customer photos uploaded with a review. They land in the private
  `ugc` bucket with verbatim consent text recorded per asset, and appear on the
  site only after being marked **featured** in Portal → UGC.
- **Format:** whatever the customer sent. Phone-shot, 4:5 or 1:1, unretouched.
- **What to feature:** opening the basket, lifting out the doll, reading the
  card, the basket in place in a nursery.
- The UGC row renders **only** when at least one asset is marked featured. It is
  never filled with studio photography pretending to be a customer photo.

---

## Cropping quick reference

| Photo | Slot | Desktop | Mobile | Separate mobile file |
|---|---|---|---|---|
| 01 Hero | `gift.hero` | 16:9 2400×1350 | 4:5 1200×1500 | **Required** |
| 02 Baby shower | `gift.occasion.baby_shower` | 4:5 1200×1500 | 4:5 | no |
| 03 New mama | `gift.occasion.new_mama` | 4:5 1200×1500 | 4:5 | no |
| 04 New arrival | `gift.occasion.new_arrival` | 4:5 1200×1500 | 4:5 | no |
| 05 From the team | `gift.occasion.team` | 4:5 1200×1500 | 4:5 | no |
| 06 Basket reuse | `gift.basket_reuse` | 3:2 1800×1200 | 4:5 1100×1375 | recommended |
| 07 Companions | `gift.companions` | 3:2 1800×1200 | 1:1 1200×1200 | recommended |
| 08 Material | `gift.material` | 3:2 1800×1200 | 3:2 | no |
| 09 Packing | `gift.packing` | 3:2 1800×1200 | 4:5 1100×1375 | recommended |
| 10 UGC | Portal → UGC | as supplied | as supplied | n/a |

## Ad creative (Canva) — separate from the website

Build these in Canva from the same photographs, and keep the promise identical
to the landing page each ad points at. Message match is the whole point of the
four landing pages.

| Ad set | Creative source | Lands on |
|---|---|---|
| Baby shower | PHOTO 02 | `/baby-shower-gifts` |
| New mama | PHOTO 03 | `/new-mama-gifts` |
| New arrival | PHOTO 04 | `/newborn-gifts` |
| Team / coworkers | PHOTO 05 | `/team-new-parent-gifts` |
| Basket reuse (retargeting) | PHOTO 06 | `/baby-shower-gifts` |
| Companions (top of funnel) | PHOTO 07 | `/` |
| UGC (proof) | PHOTO 10 | the page the first ad sent them to |

Ad text may be set in Canva. Website text may not.
