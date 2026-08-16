import { NextRequest, NextResponse } from 'next/server'
import { generatePitchDrafts } from '@/lib/press-pitch'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// Generate personalized pitch DRAFTS into Gmail for the selected contacts.
// One Anthropic call per contact; suppression + completeness + weekly cap
// enforced inside. Nothing here (or anywhere in the press system) can SEND.

export async function POST(req: NextRequest) {
  try {
    const { ids } = (await req.json()) as { ids?: string[] }
    if (!Array.isArray(ids) || !ids.length) return NextResponse.json({ error: 'ids required' }, { status: 400 })
    const results = await generatePitchDrafts(ids.slice(0, 10))
    return NextResponse.json({ results })
  } catch (e) {
    console.error('press generate error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Generation failed' }, { status: 500 })
  }
}
