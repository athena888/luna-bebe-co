import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getCatalogProduct, deleteProduct } from '@/lib/products-db'
import type { ProductCert } from '@/lib/certifications'

// Merge source products INTO a target product: combine galleries, variants
// (stock adds for matching color+size), certifications, and flat inventory.
// Sources are deleted when safe, otherwise unpublished.
export async function POST(req: NextRequest) {
  try {
    const { targetId, sourceIds } = await req.json() as { targetId: string; sourceIds: string[] }
    if (!targetId || !Array.isArray(sourceIds) || sourceIds.length === 0) {
      return NextResponse.json({ error: 'Pick a target and at least one other product' }, { status: 400 })
    }
    const sources = sourceIds.filter(s => s && s !== targetId)
    if (sources.length === 0) return NextResponse.json({ error: 'Nothing to merge' }, { status: 400 })

    const target = await getCatalogProduct(targetId)
    if (!target) return NextResponse.json({ error: 'Target product not found' }, { status: 404 })

    let anyVariants = !!target.has_variants
    const certByKey = new Map<string, ProductCert>()
    ;(target.certifications ?? []).forEach(c => certByKey.set(c.key, c))
    const notes: string[] = []

    for (const sid of sources) {
      // 1) Move gallery images to the target (keep target's primary)
      await supabaseAdmin.from('product_gallery')
        .update({ product_id: targetId, is_primary: false })
        .eq('product_id', sid)

      // 2) Move variants — additive on matching color+size
      const { data: vars } = await supabaseAdmin
        .from('product_variants')
        .select('color, color_code, color_hex, style, size, quantity, unit_price')
        .eq('product_id', sid)
      for (const v of vars ?? []) {
        anyVariants = true
        await supabaseAdmin.rpc('upsert_product_variant', {
          p_product_id: targetId,
          p_color: v.color,
          p_size: v.size,
          p_quantity: v.quantity ?? 0,
          p_color_hex: v.color_hex ?? null,
          p_unit_price: v.unit_price ?? null,
          p_color_code: v.color_code ?? null,
          p_style: v.style ?? '',
        })
      }
      await supabaseAdmin.from('product_variants').delete().eq('product_id', sid)

      // 3) Add flat inventory
      const { data: inv } = await supabaseAdmin.from('inventory').select('quantity').eq('product_id', sid).maybeSingle()
      if (inv?.quantity) {
        const { data: tInv } = await supabaseAdmin.from('inventory').select('quantity').eq('product_id', targetId).maybeSingle()
        await supabaseAdmin.from('inventory')
          .upsert({ product_id: targetId, quantity: (tInv?.quantity ?? 0) + inv.quantity }, { onConflict: 'product_id' })
      }

      // 4) Union certifications
      const src = await getCatalogProduct(sid)
      ;(src?.certifications ?? []).forEach(c => { if (!certByKey.has(c.key)) certByKey.set(c.key, c) })

      // 5) Remove the source product (safe delete; else unpublish)
      const del = await deleteProduct(sid)
      if (!del.ok) {
        await supabaseAdmin.from('products').update({ active: false }).eq('id', sid)
        notes.push(`${sid}: kept but unpublished (${del.reason ?? 'in use'})`)
      }
    }

    // Persist combined certs + variant flag + flag for review
    await supabaseAdmin.from('products')
      .update({ certifications: Array.from(certByKey.values()), has_variants: anyVariants, needs_review: true })
      .eq('id', targetId)

    return NextResponse.json({ ok: true, targetId, merged: sources.length, notes })
  } catch (error) {
    console.error('Merge error:', error)
    const msg = error instanceof Error ? error.message : 'Merge failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
