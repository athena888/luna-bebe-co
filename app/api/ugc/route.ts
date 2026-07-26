import { NextRequest, NextResponse } from 'next/server'
import { rateLimitByIp } from '@/lib/rate-limit'
import { createUgcSignedUpload, recordUgcAsset, UGC_CONSENT_TEXT, UGC_MAX_BYTES } from '@/lib/ugc'

// Build 9 — customer photo upload for reviews (UI ships after mock approval).
// GET → consent text + limits for the form. POST mode 'sign' → signed upload
// URL; mode 'record' → files the asset with verbatim consent.
export async function GET() {
  return NextResponse.json({ consentText: UGC_CONSENT_TEXT, maxBytes: UGC_MAX_BYTES })
}

export async function POST(req: NextRequest) {
  try {
    if (!await rateLimitByIp(req, 'ugc', 10, 3600)) {
      return NextResponse.json({ error: 'Too many uploads. Try again later.' }, { status: 429 })
    }
    const body = await req.json() as {
      mode?: 'sign' | 'record'
      filename?: string
      email?: string
      orderId?: string | null
      storagePath?: string
      mediaType?: 'image' | 'video'
      consentMarketing?: boolean
    }
    if (body.mode === 'sign') {
      if (!body.filename) return NextResponse.json({ error: 'filename required' }, { status: 400 })
      return NextResponse.json(await createUgcSignedUpload(body.filename))
    }
    if (body.mode === 'record') {
      if (!body.email || !body.storagePath || !body.mediaType) {
        return NextResponse.json({ error: 'email, storagePath and mediaType required' }, { status: 400 })
      }
      const res = await recordUgcAsset({
        email: body.email, orderId: body.orderId, storagePath: body.storagePath,
        mediaType: body.mediaType, consentMarketing: !!body.consentMarketing,
      })
      if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: 'Unknown mode' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Upload failed' }, { status: 400 })
  }
}
