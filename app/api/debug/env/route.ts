import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// TEMPORARY diagnostic — reports whether key env vars are visible to the running
// server (booleans + names only, never values). Used to debug GOOGLE_SA_KEY not
// being seen. Safe to expose briefly; remove after debugging.
export async function GET() {
  const has = (k: string) => Boolean(process.env[k] && String(process.env[k]).length > 0)
  return NextResponse.json({
    google_sa_key_present: has('GOOGLE_SA_KEY'),
    google_sa_key_length: (process.env.GOOGLE_SA_KEY || '').length,
    gmail_sender: process.env.GMAIL_SENDER || null,
    cron_secret_present: has('CRON_SECRET'),
    anthropic_present: has('ANTHROPIC_API_KEY'),
    stripe_present: has('STRIPE_SECRET_KEY'),
    // Any env var name containing GOOGLE/GMAIL — reveals typos / trailing spaces.
    google_gmail_var_names: Object.keys(process.env).filter(k => /GOOGLE|GMAIL/i.test(k)),
  })
}
