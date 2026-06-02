import { NextRequest, NextResponse } from 'next/server'
import { resend } from '@/lib/resend'
import { rateLimitByIp } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    if (!await rateLimitByIp(req, 'newsletter', 5, 3600)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    const { email } = await req.json()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    const audienceId = process.env.RESEND_AUDIENCE_ID
    if (audienceId) {
      await resend.contacts.create({ email, audienceId, unsubscribed: false })
    } else {
      // Fallback: just log — still returns success to the user
      console.log('Newsletter signup (no RESEND_AUDIENCE_ID set):', email)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    // Duplicate contact = already subscribed — treat as success
    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json({ ok: true })
    }
    console.error('Newsletter subscribe error:', error)
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
  }
}
