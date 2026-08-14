import { NextRequest, NextResponse } from 'next/server'
import { createLookbookUploadTarget, finalizeLookbookUpload, listVersions } from '@/lib/lookbook/versions'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Lookbook versions (portal-authed). Emily uploads her own PDF — no generator.
// POST { action: 'sign' } → { path, token, version } (browser then PUTs the
//   PDF straight to Supabase Storage via uploadToSignedUrl)
// POST { action: 'finalize', path, version } → records it as current
// GET → all versions, newest first, each with a signed download URL.

export async function POST(req: NextRequest) {
  try {
    const b = (await req.json()) as { action?: string; path?: string; version?: number }
    if (b.action === 'sign') {
      return NextResponse.json(await createLookbookUploadTarget())
    }
    if (b.action === 'finalize') {
      if (!b.path || !b.version) return NextResponse.json({ error: 'path + version required' }, { status: 400 })
      await finalizeLookbookUpload(b.path, b.version)
      return NextResponse.json({ ok: true, version: b.version, stableUrl: '/corporate/lookbook.pdf' })
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    console.error('lookbook upload error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Upload failed' }, { status: 500 })
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
