import { NextResponse } from 'next/server'
import { currentVersionSignedUrl } from '@/lib/lookbook/versions'

export const dynamic = 'force-dynamic'

// The ONE public lookbook URL — printed in outreach emails, so it must never
// rot. 302s to a fresh 1-hour signed URL of whatever version is current;
// before anything is published it falls back to the corporate page.

export async function GET() {
  try {
    const url = await currentVersionSignedUrl()
    if (url) return NextResponse.redirect(url, 302)
  } catch (e) {
    console.error('lookbook.pdf route error:', e)
  }
  const base = (process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com').replace(/\/$/, '')
  return NextResponse.redirect(`${base}/corporate`, 302)
}
