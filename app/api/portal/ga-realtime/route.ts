import { NextResponse } from 'next/server'
import { isGaConfigured, getRealtimeSnapshot } from '@/lib/ga'

export const dynamic = 'force-dynamic'

// A GA property the service account can't read is a SETUP state, not a server
// fault. This route used to answer 500, so an open portal tab painted the
// runtime logs red twice a minute and the deployment looked broken when the
// only thing missing was an access grant. Now it answers 200 with
// `connected: false` and says exactly what to fix.

type Reason = 'permission' | 'property' | 'unknown'
interface Failure { reason: Reason; hint: string }

// Remember a failure briefly: a misconfigured property should not be
// re-queried every 30s for as long as someone leaves the portal open. Each
// failed call is a real gRPC round-trip to Google.
let cachedFailure: { at: number; value: Failure } | null = null
const FAILURE_TTL_MS = 10 * 60 * 1000

function classify(error: unknown): Failure {
  const message = error instanceof Error ? error.message : String(error)
  const code = (error as { code?: number } | null)?.code
  if (code === 7 || /PERMISSION_DENIED/i.test(message)) {
    return {
      reason: 'permission',
      hint: "The service account can reach Google Analytics but isn't allowed to read this property. In GA4: Admin → Property access management → add the service account's client_email (from GA_SERVICE_ACCOUNT_JSON) with the Viewer role.",
    }
  }
  if (code === 3 || code === 5 || /INVALID_ARGUMENT|NOT_FOUND/i.test(message)) {
    return {
      reason: 'property',
      hint: 'GA_PROPERTY_ID looks wrong. It must be the numeric property id from GA4 Admin → Property details (e.g. 493820154), not the G-XXXXXXX measurement id.',
    }
  }
  return { reason: 'unknown', hint: message.slice(0, 200) }
}

export async function GET() {
  if (!isGaConfigured()) {
    return NextResponse.json({ configured: false })
  }

  const cached = cachedFailure && Date.now() - cachedFailure.at < FAILURE_TTL_MS
    ? cachedFailure.value
    : null
  if (cached) {
    return NextResponse.json({ configured: true, connected: false, ...cached })
  }

  try {
    const snapshot = await getRealtimeSnapshot()
    cachedFailure = null
    return NextResponse.json({ configured: true, connected: true, ...snapshot })
  } catch (error) {
    const failure = classify(error)
    cachedFailure = { at: Date.now(), value: failure }
    // warn, not error: nothing is broken in the app.
    console.warn(`GA realtime unavailable (${failure.reason}):`, error instanceof Error ? error.message : error)
    return NextResponse.json({ configured: true, connected: false, ...failure })
  }
}
