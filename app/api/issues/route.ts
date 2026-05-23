import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const { data: issues, error } = await supabaseAdmin
      .from('customer_issues')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Issues fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch issues' }, { status: 500 })
    }

    return NextResponse.json({ issues: issues ?? [] })
  } catch (error) {
    console.error('Issues route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
