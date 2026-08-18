import { NextRequest, NextResponse } from 'next/server'
import { runGmailSync, isReadScopeConfigured } from '@/lib/outreach/gmail-sync'
import { getConfig } from '@/lib/pipeline/config'

// Manual + cron trigger for Gmail reply/bounce synchronization.
//
// This must run in PRODUCTION: the service-account key (GOOGLE_SA_KEY) only
// exists in the Vercel environment, so the sync cannot be exercised locally.
//
// It reads the threads we already sent into and records what came back. It
// never sends, never drafts a reply, and only ever moves a prospect to a
// terminal state (replied / bounced / suppressed).
//
// Auth: either the portal cookie (manual click) or the cron bearer token.

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function authorized(req: NextRequest): boolean {
  const cron = req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`
  const portal = req.cookies.get('portal')?.value === process.env.PORTAL_TOKEN
  return cron || portal
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dry = req.nextUrl.searchParams.get('dry') === '1'
  const limit = Number(req.nextUrl.searchParams.get('limit') ?? 200)

  // Report the scope state explicitly — a silent no-op is exactly how the
  // original inbound webhook stayed broken for weeks without anyone noticing.
  const scopeOk = await isReadScopeConfigured()
  if (!scopeOk) {
    return NextResponse.json({
      ok: false,
      scope_configured: false,
      hint: 'Grant https://www.googleapis.com/auth/gmail.readonly to the service account in Google Admin → Security → API controls → Domain Wide Delegation, then retry.',
    }, { status: 200 })
  }

  const flags = await getConfig<{ reply_sync_enabled?: boolean }>('quality_v3')

  try {
    const stats = await runGmailSync({ dry, limit })
    return NextResponse.json({
      ok: true,
      scope_configured: true,
      reply_sync_flag: flags?.reply_sync_enabled ?? false,
      ...stats,
    })
  } catch (e) {
    console.error('gmail sync failed:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'sync failed' }, { status: 500 })
  }
}
