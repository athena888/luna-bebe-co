import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAllProducts } from '@/lib/products'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const base = getAllProducts().find(p => p.id === id)
  if (!base) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  const [overrideRes, galleryRes] = await Promise.all([
    supabaseAdmin.from('product_overrides').select('*').eq('product_id', id).single(),
    supabaseAdmin.from('product_gallery').select('*').eq('product_id', id).order('sort_order'),
  ])

  const override = overrideRes.data ?? {}
  const gallery = galleryRes.data ?? []

  return NextResponse.json({
    product: {
      ...base,
      ...Object.fromEntries(Object.entries(override).filter(([, v]) => v !== null)),
    },
    gallery,
  })
}
