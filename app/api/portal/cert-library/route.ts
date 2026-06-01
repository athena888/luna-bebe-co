import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { invalidateCertCache } from '@/lib/certifications'

export async function GET() {
  const { data, error } = await supabaseAdmin.from('cert_library').select('*').order('sort_order')
  // If table doesn't exist yet return empty list (migration not run) instead of erroring
  if (error) return NextResponse.json({ certs: [] })
  return NextResponse.json({ certs: data ?? [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { key, name, full_name, blurb, region, valid_until } = body
  if (!key || !name) return NextResponse.json({ error: 'key and name required' }, { status: 400 })

  // Get next sort order
  const { data: last } = await supabaseAdmin
    .from('cert_library').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle()
  const sort_order = ((last as { sort_order?: number } | null)?.sort_order ?? 0) + 1

  const { data, error } = await supabaseAdmin
    .from('cert_library')
    .insert({ key, name, full_name: full_name ?? '', blurb: blurb ?? '', region: region ?? '', valid_until: valid_until ?? null, sort_order })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  invalidateCertCache()
  return NextResponse.json({ cert: data })
}
