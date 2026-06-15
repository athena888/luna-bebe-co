import { NextRequest, NextResponse } from 'next/server'
import { confirmSizeByToken } from '@/lib/first-year-db'

export const dynamic = 'force-dynamic'

// Login-free size confirmation (Task 6). Token-gated.
export async function POST(req: NextRequest) {
  try {
    const { token, size } = await req.json()
    if (!token || !String(size ?? '').trim()) return NextResponse.json({ error: 'Pick a size' }, { status: 400 })
    const ok = await confirmSizeByToken(String(token), String(size))
    if (!ok) return NextResponse.json({ error: 'This link is no longer valid' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('first-year confirm error:', e)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
