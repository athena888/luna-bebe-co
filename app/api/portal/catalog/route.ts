import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Phase 6 — portal CRUD for the products-with-variants catalog (§46).
// Hard rule enforced server-side: the salt jar (8.5cm) only fits baskets
// with depth ≥ 8.5cm — save is blocked with an explanation, per the spec.
const SALT_JAR_ID = 'mom-botanical-postpartum-bath-saltz'
const JAR_DEPTH = 8.5

export async function GET() {
  try {
    const [{ data: products }, { data: variants }, { data: items }, { data: pkg }, { data: lbl }] = await Promise.all([
      supabaseAdmin.from('catalog_products').select('*').order('sort_order'),
      supabaseAdmin.from('catalog_variants').select('*').order('sort_order'),
      supabaseAdmin.from('products').select('id, name, price, cost_cents, category, image, active').order('name'),
      supabaseAdmin.from('site_content').select('value').eq('key', 'catalog.packaging_cents').maybeSingle(),
      supabaseAdmin.from('site_content').select('value').eq('key', 'catalog.label_cents').maybeSingle(),
    ])
    const packaging = typeof pkg?.value === 'number' ? pkg.value : 850  // basket $5 + mailer $3 + kraft $0.50
    const label = typeof lbl?.value === 'number' ? lbl.value : 1200      // worst-case absorbed USPS label
    return NextResponse.json({ products: products ?? [], variants: variants ?? [], items: items ?? [], packaging, label })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'load failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const action = body.action as string

    if (action === 'save-product') {
      const { slug, patch } = body
      const allowed = ['name', 'subtitle', 'variant_label', 'seasonal', 'visible', 'active', 'sort_order', 'faqs', 'story']
      const clean = Object.fromEntries(Object.entries(patch ?? {}).filter(([k]) => allowed.includes(k)))
      const { error } = await supabaseAdmin.from('catalog_products').update(clean).eq('slug', slug)
      if (error) throw error
      import('@/lib/auto-translate').then(({ autoTranslate }) =>
        autoTranslate('catalog_product', slug, { name: clean.name as string, subtitle: clean.subtitle as string })).catch(() => {})
      return NextResponse.json({ success: true })
    }

    if (action === 'save-variant' || action === 'add-variant') {
      const v = body.variant
      const contents = Array.isArray(v.contents) ? v.contents : []
      const depth = Number(v.basket_depth_cm) || null
      if (contents.some((c: { item_id: string }) => c.item_id === SALT_JAR_ID) && (depth ?? 0) < JAR_DEPTH) {
        return NextResponse.json({
          error: `The bath-salts jar is ${JAR_DEPTH}cm tall — this basket is ${depth ?? '?'}cm deep, so the lid wouldn't close. Deepen the basket or remove the jar.`,
        }, { status: 400 })
      }
      const row = {
        product_slug: v.product_slug, key: v.key, label: v.label,
        price: Math.round(Number(v.price) || 0), basket: v.basket ?? '',
        basket_depth_cm: depth, adds: v.adds ?? '', contents,
        images: Array.isArray(v.images) ? v.images.filter(Boolean) : [],
        active: v.active !== false, sort_order: Number(v.sort_order) || 0,
      }
      const { error } = await supabaseAdmin.from('catalog_variants').upsert(row, { onConflict: 'product_slug,key' })
      if (error) throw error
      import('@/lib/auto-translate').then(({ autoTranslate }) =>
        autoTranslate('catalog_variant', row.product_slug + ':' + row.key, { label: row.label, adds: row.adds })).catch(() => {})
      return NextResponse.json({ success: true })
    }

    if (action === 'delete-variant') {
      const { error } = await supabaseAdmin.from('catalog_variants')
        .delete().eq('product_slug', body.product_slug).eq('key', body.key)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (action === 'save-packaging') {
      const cents = Math.round(Number(body.packaging_cents)) || 0
      const key = body.which === 'label' ? 'catalog.label_cents' : 'catalog.packaging_cents'
      const { error } = await supabaseAdmin.from('site_content')
        .upsert({ key, value: cents })
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (action === 'save-item-cost') {
      const { error } = await supabaseAdmin.from('products')
        .update({ cost_cents: Math.round(Number(body.cost_cents)) || null }).eq('id', body.item_id)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'save failed' }, { status: 500 })
  }
}
