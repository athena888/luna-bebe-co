import { NextRequest, NextResponse } from 'next/server'
import { buildPlanPayload } from '@/lib/cockpit'
import { suggestAddons } from '@/lib/cockpit-ai'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Free-form "what else can I do?" — grounds the AI in today's real data and
// returns a short reply + a few concrete, addable marketing tasks.
export async function POST(req: NextRequest) {
  try {
    const { question } = (await req.json()) as { question?: string }
    if (!question?.trim()) return NextResponse.json({ error: 'Ask a question' }, { status: 400 })
    const payload = await buildPlanPayload()
    const result = await suggestAddons(question, payload)
    if (!result) return NextResponse.json({ error: 'No suggestions right now' }, { status: 502 })
    return NextResponse.json(result)
  } catch (e) {
    console.error('cockpit ask error:', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
