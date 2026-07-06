import { NextRequest, NextResponse } from 'next/server'
import { createSignedUpload } from '@/lib/lookbook/images'

export const dynamic = 'force-dynamic'

// Step 1 of upload: mint a signed upload URL so the browser PUTs the original
// (up to 15MB) straight to Supabase Storage — Vercel's ~4.5MB request-body
// limit never sees the file. POST { filename } → { path, token }.

export async function POST(req: NextRequest) {
  try {
    const { filename } = (await req.json()) as { filename?: string }
    if (!filename) return NextResponse.json({ error: 'filename required' }, { status: 400 })
    const signed = await createSignedUpload(filename)
    return NextResponse.json(signed)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Sign failed' }, { status: 400 })
  }
}
