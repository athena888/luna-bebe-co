import { NextResponse } from 'next/server'
import { isGaConfigured, getRealtimeSnapshot } from '@/lib/ga'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!isGaConfigured()) {
    return NextResponse.json({ configured: false })
  }
  try {
    const snapshot = await getRealtimeSnapshot()
    return NextResponse.json({ configured: true, ...snapshot })
  } catch (error) {
    console.error('GA realtime error:', error)
    return NextResponse.json(
      { configured: true, error: 'Could not load analytics. Check the service account has Viewer access to the GA property.' },
      { status: 500 }
    )
  }
}
