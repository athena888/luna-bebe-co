import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { blocksToText, textToBlocks, slugify, type JournalRow } from '@/lib/journal-db'

export const dynamic = 'force-dynamic'

// Admin CRUD for journal posts. Guarded by /api/portal/* middleware.

// List every post (drafts included), newest first, with body as editable text.
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('journal_posts')
    .select('*')
    .order('date', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const posts = (data ?? []).map((r: JournalRow) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    metaDescription: r.meta_description ?? '',
    excerpt: r.excerpt ?? '',
    date: r.date,
    readMins: r.read_mins ?? 3,
    published: r.published,
    bodyText: blocksToText(r.body ?? []),
  }))
  return NextResponse.json({ posts })
}

interface PostInput {
  id?: string
  title?: string
  slug?: string
  date?: string
  readMins?: number
  excerpt?: string
  metaDescription?: string
  bodyText?: string
  published?: boolean
}

function rowFromInput(b: PostInput) {
  return {
    slug: (b.slug && b.slug.trim()) ? slugify(b.slug) : slugify(b.title ?? ''),
    title: b.title ?? '',
    meta_description: b.metaDescription ?? '',
    excerpt: b.excerpt ?? '',
    date: b.date || new Date().toISOString().slice(0, 10),
    read_mins: Number(b.readMins) || 3,
    body: textToBlocks(b.bodyText ?? ''),
    published: !!b.published,
    updated_at: new Date().toISOString(),
  }
}

// Create
export async function POST(req: NextRequest) {
  const b = (await req.json()) as PostInput
  if (!b.title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  const row = rowFromInput(b)
  if (!row.slug) return NextResponse.json({ error: 'Could not derive a slug from the title' }, { status: 400 })
  const { data, error } = await supabaseAdmin.from('journal_posts').insert(row).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}

// Update
export async function PUT(req: NextRequest) {
  const b = (await req.json()) as PostInput
  if (!b.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await supabaseAdmin.from('journal_posts').update(rowFromInput(b)).eq('id', b.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// Delete
export async function DELETE(req: NextRequest) {
  const { id } = (await req.json()) as { id?: string }
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await supabaseAdmin.from('journal_posts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
