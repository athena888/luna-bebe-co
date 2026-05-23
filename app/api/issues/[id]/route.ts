import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import type { IssueStatus } from '@/types'

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params
    const { status }: { status: IssueStatus } = await req.json()

    if (!status) {
      return NextResponse.json({ error: 'Missing status field' }, { status: 400 })
    }

    const validStatuses: IssueStatus[] = ['open', 'in_progress', 'resolved']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('customer_issues')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Issue update error:', error)
      return NextResponse.json({ error: 'Failed to update issue' }, { status: 500 })
    }

    return NextResponse.json({ issue: data })
  } catch (error) {
    console.error('Issue PATCH route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
