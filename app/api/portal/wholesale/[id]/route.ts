import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function authorized(req: NextRequest) {
  const session = req.cookies.get('portal_session')?.value
  return session && session === process.env.PORTAL_TOKEN
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const body = await req.json()
    const patch: Record<string, unknown> = {}
    if (body.status) patch.status = body.status
    if (body.tier) patch.tier = body.tier
    if (body.payment_terms) patch.payment_terms = body.payment_terms
    if (typeof body.credit_limit === 'number') patch.credit_limit = body.credit_limit
    if (body.status === 'approved') patch.approved_at = new Date().toISOString()

    const { error } = await supabaseAdmin.from('wholesale_accounts').update(patch).eq('id', id)
    if (error) {
      console.error('Wholesale update error:', error)
      return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Wholesale update error:', err)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}
