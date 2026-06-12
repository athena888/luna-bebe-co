import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const revalidate = 0

function mediaType(url: string): 'video' | 'image' {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url) ? 'video' : 'image'
}

export async function GET() {
  const { data } = await supabaseAdmin
    .from('site_images')
    .select('id, public_url, sort_order')
    .eq('slot_key', 'home.editorial')
    .order('sort_order')
  return NextResponse.json({
    items: (data ?? []).map(r => ({ id: r.id, url: r.public_url, type: mediaType(r.public_url) })),
  })
}
