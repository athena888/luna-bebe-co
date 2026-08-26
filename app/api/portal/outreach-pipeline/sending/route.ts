import { NextResponse } from 'next/server'
import { getSendingDashboard } from '@/lib/outreach/mailbox-usage'

// Daily sending usage for the admin portal: "Mailbox A: 12 / 50".
//
// Under /api/portal/, so middleware.ts already requires the portal session —
// this never needs its own auth check, and it must stay under that prefix.
// Read-only: it counts rows and returns numbers. Nothing here can send.
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return NextResponse.json(await getSendingDashboard())
  } catch (error) {
    console.error('sending dashboard failed:', error)
    return NextResponse.json({ error: 'Unavailable' }, { status: 503 })
  }
}
