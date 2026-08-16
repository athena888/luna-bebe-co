import { NextRequest, NextResponse } from 'next/server'
import { crawlPressContact } from '@/lib/press-crawl'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// Crawl ONE press contact (Claude + web_search). The portal loops over rows
// sequentially so each crawl stays inside the function budget. Published
// emails only — no guessing; empty fields stay empty for Emily.

export async function POST(req: NextRequest) {
  try {
    const { id } = (await req.json()) as { id?: string }
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    return NextResponse.json({ result: await crawlPressContact(id) })
  } catch (e) {
    console.error('press crawl error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Crawl failed' }, { status: 500 })
  }
}
