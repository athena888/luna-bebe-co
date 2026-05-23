import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function DELETE(req: NextRequest) {
  try {
    const { slot } = await req.json()
    if (!slot || typeof slot !== 'string') {
      return NextResponse.json({ error: 'slot is required' }, { status: 400 })
    }

    const fileName = `${slot}.jpg`
    const { error } = await supabaseAdmin.storage.from('home-images').remove([fileName])

    if (error) {
      console.error('Supabase delete error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Delete route error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
