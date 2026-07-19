import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// CRUD for the creator gifting tracker (Portal → Morning Review → Creators).

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('creators')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ creators: data })
}

export async function POST(req: NextRequest) {
  try {
    const { handle, platform, followers, niche, email, notes } = await req.json()
    if (!handle?.trim()) return NextResponse.json({ error: 'Handle required' }, { status: 400 })
    const { data, error } = await supabaseAdmin.from('creators').insert({
      handle: handle.trim().replace(/^@/, ''),
      platform: (platform || 'instagram').trim(),
      followers: followers ? Math.max(0, Math.round(Number(followers)) || 0) : null,
      niche: niche?.trim() || null,
      email: email?.trim().toLowerCase() || null,
      notes: notes?.trim() || null,
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ creator: data })
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, ...fields } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const allowed = ['handle', 'platform', 'followers', 'niche', 'email', 'gifted_at', 'posted', 'post_url', 'content_rights', 'notes']
    const patch: Record<string, unknown> = {}
    for (const k of allowed) if (k in fields) patch[k] = fields[k]
    if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    const { data, error } = await supabaseAdmin.from('creators').update(patch).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ creator: data })
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await supabaseAdmin.from('creators').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
