import { NextRequest, NextResponse } from 'next/server'
import { processUpload } from '@/lib/lookbook/images'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// Step 2 of upload: normalize the just-uploaded original (HEIC→JPEG, EXIF
// orientation applied then metadata stripped, long edge capped) and auto-tag it
// with one vision call. POST { path } → the new brand_images row.

export async function POST(req: NextRequest) {
  try {
    const { path } = (await req.json()) as { path?: string }
    if (!path || !path.startsWith('library/incoming/')) {
      return NextResponse.json({ error: 'valid incoming path required' }, { status: 400 })
    }
    const image = await processUpload(path)
    return NextResponse.json({ ok: true, image })
  } catch (e) {
    console.error('lookbook process error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Processing failed' }, { status: 500 })
  }
}
