import { NextRequest, NextResponse } from 'next/server'
import { listImages, retagImage, deleteImage } from '@/lib/lookbook/images'

export const dynamic = 'force-dynamic'

// Image library reads + row mutations (portal-authed via middleware).
// GET → all images with 1h signed preview URLs.
// PATCH { id, kind?, tier?, tags? } → re-tag override.
// DELETE ?id= → remove storage object + row.

export async function GET() {
  try {
    return NextResponse.json({ images: await listImages() })
  } catch (e) {
    console.error('lookbook images GET error:', e)
    return NextResponse.json({ error: 'Failed to list images' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as { id?: string; kind?: string | null; tier?: string | null; tags?: string[] }
    if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await retagImage(body.id, { kind: body.kind, tier: body.tier, tags: body.tags })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('lookbook images PATCH error:', e)
    return NextResponse.json({ error: 'Re-tag failed' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await deleteImage(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('lookbook images DELETE error:', e)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
