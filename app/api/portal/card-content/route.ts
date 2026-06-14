import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getCardItemContents, saveCardItemContents, type CardItemContent } from '@/lib/card-content'

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get('orderId')
  const [items, order] = await Promise.all([
    getCardItemContents(),
    orderId ? fetchOrderWithStyle(orderId) : Promise.resolve(null),
  ])
  return NextResponse.json({ items, order })
}

async function fetchOrderWithStyle(orderId: string) {
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, customer_name, recipient_name, letter_content, letter_version, selected_items, card_style, special_note, letter_zone')
    .eq('id', orderId)
    .maybeSingle()
  if (!order) return null

  let card_style_data = null
  if (order.card_style) {
    const { data: style } = await supabaseAdmin
      .from('card_styles')
      .select('id, name, image_url, size_label')
      .or(`id.eq.${order.card_style},name.ilike.${encodeURIComponent(order.card_style)}`)
      .maybeSingle()
    card_style_data = style ?? null
  }

  return { ...order, card_style_data }
}

export async function PUT(req: NextRequest) {
  try {
    const { productId, content } = await req.json() as { productId: string; content: CardItemContent }
    if (!productId || !content?.title) {
      return NextResponse.json({ error: 'productId and content.title required' }, { status: 400 })
    }
    const current = await getCardItemContents()
    current[productId] = content
    await saveCardItemContents(current)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
