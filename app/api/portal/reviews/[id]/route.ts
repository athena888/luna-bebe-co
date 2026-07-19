import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params
    const { approved }: { approved: boolean } = await req.json()

    if (typeof approved !== 'boolean') {
      return NextResponse.json({ error: 'Missing approved field' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('reviews')
      .update({ approved })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Review update error:', error)
      return NextResponse.json({ error: 'Failed to update review' }, { status: 500 })
    }

    return NextResponse.json({ review: data })
  } catch (error) {
    console.error('Review PATCH route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params
    const { error } = await supabaseAdmin.from('reviews').delete().eq('id', id)

    if (error) {
      console.error('Review delete error:', error)
      return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Review DELETE route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
