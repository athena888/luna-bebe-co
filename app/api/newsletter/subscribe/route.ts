import { NextRequest, NextResponse } from 'next/server'
import { resend, sendWelcomeEmail } from '@/lib/resend'
import { rateLimitByIp } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    if (!await rateLimitByIp(req, 'newsletter', 5, 3600)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    const { email, phone } = await req.json()
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

    // Optional phone — Resend contacts have no phone field, so keep it in our
    // own table. Best-effort: signup still succeeds if the table isn't there.
    if (phone && typeof phone === 'string' && phone.trim()) {
      try {
        const { supabaseAdmin } = await import('@/lib/supabase')
        await supabaseAdmin.from('newsletter_phones').upsert({ email, phone: phone.trim() }, { onConflict: 'email' })
      } catch (e) {
        console.log('Newsletter phone (table missing or insert failed):', email, phone, e instanceof Error ? e.message : '')
      }
    }

    // Fresh subscribe — send the welcome email with the WELCOME10 code.
    // Wrapped so a send failure never fails the subscription itself.
    // (Duplicate contacts throw above and are handled in catch, so they skip this.)
    try {
      await sendWelcomeEmail({ customerEmail: email })
    } catch (e) {
      console.error('Welcome email send failed:', e)
    }

    // Schedule welcome series steps 2 (D+2) and 3 (D+4) — sent by the daily
    // flows cron. Best-effort: works only once §31 (email_events) is run.
    try {
      const { scheduleWelcomeSeries } = await import('@/lib/email-flows')
      await scheduleWelcomeSeries(email)
    } catch (e) {
      console.error('Welcome series scheduling failed (email_events table ready?):', e)
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
