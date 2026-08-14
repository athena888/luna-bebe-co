// Catalog restructure Phase 9 seed — DRAFT recipes from Emily's spec PDF,
// loaded as data (all portal-editable later). Idempotent: upserts by slug/key.
// Missing items are created as placeholder rows: active=false (not sold solo
// yet), standalone=false (box-only, no /products page when that flag ships).
// Run: node scripts/seed-catalog.mjs   (after §46)
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// ——— Placeholder items the recipes need but the catalog lacks (DRAFT prices) ———
const NEW_ITEMS = [
  { id: 'garment-henley-bodysuit',       name: 'Organic Henley Bodysuit',            category: 'garment',  price: 1899 },
  { id: 'mom-fuzzy-socks',               name: 'Cloud-Soft Lounge Socks',            category: 'mom',      price: 1200 },
  { id: 'mom-porcelain-cup',             name: 'Porcelain Petite Cup',               category: 'mom',      price: 2200 },
  { id: 'keepsake-reindeer-doll',        name: 'Little Reindeer Doll',               category: 'keepsake', price: 2500 },
  { id: 'swaddle-winter-knit-blanket',   name: 'Winter Colorway Knit Blanket',       category: 'swaddle',  price: 2999 },
  { id: 'keepsake-farmhouse-rattle',     name: 'Farmhouse Beechwood Rattle',         category: 'keepsake', price: 899 },
  { id: 'swaddle-lemon-knit-blanket',    name: 'Little Lemon Knit Blanket',          category: 'swaddle',  price: 2999 },
  { id: 'swaddle-farmhouse-knit-blanket', name: 'Farmhouse Knit Blanket',            category: 'swaddle',  price: 2999 },
]

// ——— Existing-item shorthand ———
const OAT_SWADDLE = 'garment-bla09f-b'                       // Organic Oat Muslin Blanket
const BUNNY_LOVEY = 'swaddle-bunny-lovey-comforter'
const SACHET      = 'swaddle-dried-lavender-drawstring-sachet'
const RATTLE_PAIR = 'swaddle-beechwood-rattle-pair'
const CLIP        = 'swaddle-braided-cotton-pacifier-clip'
const ROMPER      = 'garment-bubble-romper-2'                // Gathered Muslin Long-Sleeve Romper
const BATH_MELTS  = 'swaddle-botanical-bath-melt-set'
const KNIT_BLANKET = 'garment-fj-055-2'                      // Fine Knit Pointelle Blanket (color choice)
const CROCHET_BUNNY = 'swaddle-crochet-bunny-companion'
const BOUQUET     = 'mom-dried-botanical-bouquet'
const SILK_MASK   = 'swaddle-100-mulberry-silk-seep-mask'
const SALT_JAR    = 'mom-botanical-postpartum-bath-saltz'    // the 8.5cm jar
const EYE_PILLOW  = 'mom-lavender-eye-pillow'
const HENLEY      = 'garment-henley-bodysuit'

const it = (item_id, extra = {}) => ({ item_id, qty: 1, ...extra })

const PRODUCTS = [
  {
    slug: 'signature', name: 'The Signature', subtitle: 'Notre boîte signature',
    variant_param: 'tier', variant_label: 'Tier', sort_order: 0,
    variants: [
      { key: 'tier-1', label: 'Tier 1', price: 8500,  basket: '22×16×6.5', basket_depth_cm: 6.5,
        contents: [it(OAT_SWADDLE), it(HENLEY), it(BUNNY_LOVEY), it(SACHET)],
        adds: '' },
      { key: 'tier-2', label: 'Tier 2', price: 10500, basket: '25×19×7', basket_depth_cm: 7,
        contents: [it(OAT_SWADDLE), it(HENLEY), it(BUNNY_LOVEY), it(SACHET), it(RATTLE_PAIR), it(CLIP)],
        adds: 'Adds a beechwood rattle and braided pacifier clip.' },
      { key: 'tier-3', label: 'Tier 3', price: 12500, basket: '25×19×7', basket_depth_cm: 7,
        contents: [it(OAT_SWADDLE), it(ROMPER), it(BUNNY_LOVEY), it(SACHET), it(RATTLE_PAIR), it(CLIP), it(BATH_MELTS, { pieces: 2 })],
        adds: 'The garment upgrades to a muslin romper; adds a bath melt duo.' },
      { key: 'tier-4', label: 'Tier 4', price: 15000, basket: '27×22×8', basket_depth_cm: 8,
        contents: [it(KNIT_BLANKET, { color_choice: true }), it(ROMPER), it(BUNNY_LOVEY), it(SACHET), it(RATTLE_PAIR), it(CLIP), it(BATH_MELTS, { pieces: 2 })],
        adds: 'A knit blanket in your choice of color replaces the swaddle.' },
      { key: 'tier-5', label: 'Tier 5', price: 17500, basket: '32×27×8.5', basket_depth_cm: 8.5,
        contents: [it(KNIT_BLANKET, { color_choice: true }), it(ROMPER), it(CROCHET_BUNNY), it(SACHET), it(RATTLE_PAIR), it(CLIP), it(BATH_MELTS, { pieces: 2 }), it(BOUQUET)],
        adds: 'A crochet bunny replaces the lovey; adds a dried lavender bouquet.' },
      { key: 'tier-6', label: 'Tier 6', price: 20000, basket: '34×29×9', basket_depth_cm: 9,
        contents: [it(KNIT_BLANKET, { color_choice: true }), it(OAT_SWADDLE), it(HENLEY), it(ROMPER), it(CROCHET_BUNNY), it(RATTLE_PAIR), it(CLIP), it(SACHET), it(SILK_MASK), it(SALT_JAR)],
        adds: 'Everything — both garments, blanket and swaddle, plus a silk eye mask and bath salts for mama.' },
    ],
  },
  {
    slug: 'la-collection', name: 'La Collection', subtitle: 'Un thème, raconté en douceur',
    variant_param: 'theme', variant_label: 'Theme', sort_order: 1,
    variants: [
      { key: 'strawberry', label: 'Strawberry', price: 14000, basket: '27×22×8', basket_depth_cm: 8,
        contents: [it('swaddle-strawberry-fields-knit-blanket'), it('swaddle-little-strawberry-teething-ring'), it(BUNNY_LOVEY), it(OAT_SWADDLE), it(CLIP), it(SACHET)] },
      { key: 'lemon', label: 'Lemon', price: 14000, basket: '27×22×8', basket_depth_cm: 8,
        contents: [it('swaddle-lemon-knit-blanket'), it('swaddle-lemon-crochet-rattle-teether'), it('keepsake-little-cat-muslin-lovey'), it(OAT_SWADDLE), it(CLIP), it(SACHET)] },
      { key: 'sheep', label: 'Sheep', price: 14000, basket: '27×22×8', basket_depth_cm: 8,
        contents: [it('swaddle-the-little-sheep-knit-blanket'), it(RATTLE_PAIR), it(BUNNY_LOVEY), it(OAT_SWADDLE), it(CLIP), it(SACHET)] },
      { key: 'acorn', label: 'Acorn', price: 14000, basket: '27×22×8', basket_depth_cm: 8,
        contents: [it('swaddle-the-little-squirrel-pinecone-knit-blanket'), it('keepsake-acorn-oak-teething-ring'), it(CROCHET_BUNNY), it(OAT_SWADDLE), it(CLIP), it(SACHET)] },
      { key: 'farmhouse', label: 'Farmhouse', price: 14000, basket: '27×22×8', basket_depth_cm: 8,
        contents: [it('swaddle-farmhouse-knit-blanket'), it('keepsake-farmhouse-rattle'), it('swaddle-little-house-teething-ring'), it(OAT_SWADDLE), it(CLIP), it(SACHET)] },
    ],
  },
  {
    slug: 'mama', name: 'The Mama Box', subtitle: 'Pour elle, d’abord',
    variant_param: 'set', variant_label: 'Set', sort_order: 2,
    variants: [
      { key: 'wellness', label: 'Wellness', price: 13500, basket: '28×24×8.5', basket_depth_cm: 8.5,
        contents: [it(EYE_PILLOW), it('mom-porcelain-cup'), it(SALT_JAR), it(BATH_MELTS, { pieces: 3 }), it(SACHET), it(BOUQUET)] },
      { key: 'postpartum', label: 'Postpartum', price: 14500, basket: '28×24×8.5', basket_depth_cm: 8.5,
        contents: [it(SILK_MASK), it('mom-fuzzy-socks'), it(SALT_JAR), it(BATH_MELTS, { pieces: 3 }), it(SACHET), it(KNIT_BLANKET, { color_choice: true })] },
    ],
  },
  {
    slug: 'mama-et-bebe', name: 'Mama et Bébé', subtitle: 'Pour la maman et le bébé',
    variant_param: 'v', variant_label: '', sort_order: 3,
    variants: [
      // Tier-2 baby contents + the Wellness set minus the salt jar (basket
      // depth); price = ($105 + $135) − ~10% ≈ $216.
      { key: 'default', label: 'Mama et Bébé', price: 21600, basket: '34×29×9', basket_depth_cm: 9,
        contents: [it(OAT_SWADDLE), it(HENLEY), it(BUNNY_LOVEY), it(RATTLE_PAIR), it(CLIP), it(EYE_PILLOW), it('mom-porcelain-cup'), it(BATH_MELTS, { pieces: 3 }), it(SACHET), it(BOUQUET)],
        adds: 'Save about 10% vs buying the Tier 2 and Wellness boxes separately.' },
    ],
  },
  {
    slug: 'noel', name: 'Noël', subtitle: 'L’hiver, embrassé', seasonal: true, sort_order: 4,
    variant_param: 'v', variant_label: '',
    variants: [
      { key: 'default', label: 'Noël', price: 16000, basket: '27×22×8', basket_depth_cm: 8,
        contents: [it('keepsake-reindeer-doll'), it('swaddle-winter-knit-blanket'), it(ROMPER), it(CLIP), it(SACHET)] },
    ],
  },
  {
    slug: 'entry', name: 'The Petite', subtitle: 'Un premier bonjour', active: false, sort_order: 5,
    variant_param: 'v', variant_label: '',
    variants: [
      { key: 'default', label: 'The Petite', price: 5000, basket: '22×16×6.5', basket_depth_cm: 6.5,
        contents: [it('keepsake-farmhouse-rattle'), it(BUNNY_LOVEY), it(OAT_SWADDLE), it(SACHET)] },
    ],
  },
]

// Salt-jar rule (hard validation, encoded here until the portal form ships)
const JAR_DEPTH = 8.5
for (const p of PRODUCTS) for (const v of p.variants) {
  if (v.contents.some(c => c.item_id === SALT_JAR) && (v.basket_depth_cm ?? 0) < JAR_DEPTH) {
    console.error(`BLOCKED: ${p.slug}/${v.key} contains the salt jar but basket depth ${v.basket_depth_cm} < ${JAR_DEPTH}cm`)
    process.exit(1)
  }
}

// ——— Seed ———
let createdItems = 0
for (const n of NEW_ITEMS) {
  const { data: exists } = await db.from('products').select('id').eq('id', n.id).maybeSingle()
  if (exists) continue
  const { error } = await db.from('products').insert({
    id: n.id, name: n.name, category: n.category, price: n.price,
    description: `${n.name} — coming soon.`, active: false, standalone: false,
    image_emoji: '🎁', sort_order: 999,
  })
  if (error) { console.error(`item ${n.id}:`, error.message); process.exit(1) }
  createdItems++
}
console.log(`placeholder items created: ${createdItems}/${NEW_ITEMS.length}`)

for (const p of PRODUCTS) {
  const { variants, ...row } = p
  const { error } = await db.from('catalog_products').upsert({
    active: true, seasonal: false, visible: true, ...row,
  }, { onConflict: 'slug' })
  if (error) { console.error(`product ${p.slug}:`, error.message); process.exit(1) }
  for (let i = 0; i < variants.length; i++) {
    const v = variants[i]
    const { error: ve } = await db.from('catalog_variants').upsert({
      product_slug: p.slug, sort_order: i, adds: '', ...v,
    }, { onConflict: 'product_slug,key' })
    if (ve) { console.error(`variant ${p.slug}/${v.key}:`, ve.message); process.exit(1) }
  }
  console.log(`seeded ${p.slug}: ${variants.length} variant(s)`)
}
console.log('DONE')
