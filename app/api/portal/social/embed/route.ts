import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function detectType(url: string): 'instagram' | 'tiktok' | null {
  if (url.includes('instagram.com')) return 'instagram'
  if (url.includes('tiktok.com')) return 'tiktok'
  return null
}

export async function POST(req: NextRequest) {
  try {
    const { embed_url, caption } = await req.json()

    if (!embed_url) {
      return NextResponse.json({ error: 'embed_url is required' }, { status: 400 })
    }

    const type = detectType(embed_url)
    if (!type) {
      return NextResponse.json({ error: 'URL must be from Instagram or TikTok' }, { status: 400 })
    }

    const { data: post, error } = await supabaseAdmin
      .from('social_posts')
      .insert({ type, embed_url, caption: caption ?? '', active: true, display_order: 0 })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ post })
  } catch (err) {
    console.error('Embed route error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
