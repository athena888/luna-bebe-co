import { NextRequest, NextResponse } from 'next/server'
import { listUgcAssets, setUgcStatus } from '@/lib/ugc'

// Portal → UGC (cookie-authed via middleware). GET = grid data with signed
// viewing URLs; POST = status change (approve / reject / feature).
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return NextResponse.json({ assets: await listUgcAssets() })
  } catch (e) {
    console.error('ugc list error:', e)
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { id, status } = await req.json() as { id?: string; status?: 'new' | 'approved' | 'rejected' | 'featured' }
    if (!id || !status || !['new', 'approved', 'rejected', 'featured'].includes(status)) {
      return NextResponse.json({ error: 'id and valid status required' }, { status: 400 })
    }
    await setUgcStatus(id, status)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('ugc status error:', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
