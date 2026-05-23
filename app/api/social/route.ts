import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET — list posts (active only by default; ?all=1 returns all for portal)
export async function GET(req: NextRequest) {
  const all = req.nextUrl.searchParams.get('all') === '1'
  let query = supabaseAdmin
    .from('social_posts')
    .select('*')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (!all) query = query.eq('active', true)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ posts: data ?? [] })
}

// PATCH — toggle active / update caption
export async function PATCH(req: NextRequest) {
  const { id, active, caption } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const update: Record<string, unknown> = {}
  if (active !== undefined) update.active = active
  if (caption !== undefined) update.caption = caption

  const { error } = await supabaseAdmin.from('social_posts').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE — remove a post
export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  // Also try to remove the file from storage
  const { data: post } = await supabaseAdmin.from('social_posts').select('media_url').eq('id', id).single()
  if (post?.media_url) {
    const fileName = post.media_url.split('/').pop()
    if (fileName) await supabaseAdmin.storage.from('social-media').remove([fileName])
  }

  const { error } = await supabaseAdmin.from('social_posts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
