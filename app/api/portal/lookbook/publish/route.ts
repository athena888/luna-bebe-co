import { NextRequest, NextResponse } from 'next/server'
import { publishLookbook, listVersions, type ImageMap } from '@/lib/lookbook/versions'
import type { LookbookCopy } from '@/lib/lookbook/copy'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// Publish + version history (portal-authed).
// POST { copy, imageMap } → banned-phrase gate → render → store vN → flip
//   is_current. 422 with violations when the gate blocks.
// GET → all versions, newest first, each with a signed download URL.

export async function POST(req: NextRequest) {
  try {
    const { copy, imageMap } = (await req.json()) as { copy: LookbookCopy; imageMap: ImageMap }
    if (!copy) return NextResponse.json({ error: 'copy required' }, { status: 400 })
    const result = await publishLookbook(copy, imageMap ?? {})
    if (!result.ok) {
      return NextResponse.json({ error: 'Blocked by compliance check', violations: result.violations }, { status: 422 })
    }
    return NextResponse.json({ ok: true, version: result.version, stableUrl: '/corporate/lookbook.pdf' })
  } catch (e) {
    console.error('publish error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Publish failed' }, { status: 500 })
  }
}

export async function GET() {
  try {
    return NextResponse.json({ versions: await listVersions() })
  } catch (e) {
    console.error('versions GET error:', e)
    return NextResponse.json({ error: 'Failed to list versions' }, { status: 500 })
  }
}
