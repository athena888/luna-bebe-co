import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getCatalogProduct, createProduct } from '@/lib/products-db'
import type { ProductCategory } from '@/types'

function titleCase(s: string) { return s.replace(/\b\w/g, c => c.toUpperCase()) }

// Split a product into one NEW (unpublished) product per color. Moves each
// color's variants to its own product and copies the primary photo as a start.
// The original is unpublished afterward (kept, not deleted).
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const product = await getCatalogProduct(id)
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    const { data: variants } = await supabaseAdmin
      .from('product_variants')
      .select('color, color_code, color_hex, size, quantity, unit_price')
      .eq('product_id', id)

    const colors = Array.from(new Set((variants ?? []).map(v => v.color))).filter(Boolean)
    if (colors.length < 2) {
      return NextResponse.json({ error: 'Need at least 2 colors to split' }, { status: 400 })
    }

    // Grab the primary image (or first) to seed each new product
    const { data: gallery } = await supabaseAdmin
      .from('product_gallery')
      .select('image_url, is_primary, sort_order')
      .eq('product_id', id)
      .order('sort_order')
    const primaryImg = (gallery ?? []).find(g => g.is_primary)?.image_url ?? gallery?.[0]?.image_url ?? null

    const created: { id: string; color: string }[] = []

    for (const color of colors) {
      const newProduct = await createProduct({
        name: `${product.name} — ${titleCase(color)}`,
        category: product.category as ProductCategory,
        price: product.price,
        description: product.description ?? '',
        ingredients: product.ingredients ?? null,
        active: false, // unpublished draft for review
        imageEmoji: product.imageEmoji,
      })

      // Carry over certifications + variant flag + review flag + image
      await supabaseAdmin.from('products')
        .update({
          certifications: product.certifications ?? [],
          has_variants: true,
          needs_review: true,
          image: primaryImg,
        })
        .eq('id', newProduct.id)

      // Move this color's variants to the new product
      await supabaseAdmin.from('product_variants')
        .update({ product_id: newProduct.id })
        .eq('product_id', id)
        .eq('color', color)

      // Seed the gallery with the shared primary image
      if (primaryImg) {
        await supabaseAdmin.from('product_gallery').insert({
          product_id: newProduct.id, image_url: primaryImg, label: null, is_primary: true, sort_order: 0,
        })
      }

      created.push({ id: newProduct.id, color })
    }

    // The original is now empty of variants — unpublish it for cleanup/review
    await supabaseAdmin.from('products').update({ active: false, needs_review: true }).eq('id', id)

    return NextResponse.json({ ok: true, created })
  } catch (error) {
    console.error('Split error:', error)
    const msg = error instanceof Error ? error.message : 'Split failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
