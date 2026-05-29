import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

async function userFromAuthHeader(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice(7)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data } = await supabase.auth.getUser()
  return data.user
}

export async function GET(req: NextRequest) {
  try {
    const user = await userFromAuthHeader(req)
    if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let { data: account } = await supabaseAdmin
      .from('wholesale_accounts')
      .select('*')
      .ilike('contact_email', user.email)
      .maybeSingle()

    if (!account) return NextResponse.json({ error: 'No wholesale account found' }, { status: 404 })

    if (!account.user_id) {
      const { data: updated } = await supabaseAdmin
        .from('wholesale_accounts')
        .update({ user_id: user.id })
        .eq('id', account.id)
        .select()
        .single()
      if (updated) account = updated
    }

    const { data: orders } = await supabaseAdmin
      .from('wholesale_orders')
      .select('id, created_at, po_number, total, payment_method, payment_status, status, due_at')
      .eq('account_id', account.id)
      .order('created_at', { ascending: false })
      .limit(50)

    return NextResponse.json({ account, orders: orders ?? [] })
  } catch (err) {
    console.error('Wholesale invoices error:', err)
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 })
  }
}
