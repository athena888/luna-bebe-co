import { NextRequest, NextResponse } from 'next/server'
import { getShipments, confirmShipmentSize, markShipmentShipped } from '@/lib/first-year-db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return NextResponse.json({ shipments: await getShipments() })
  } catch (e) {
    console.error('shipments GET error:', e)
    return NextResponse.json({ shipments: [] })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, action, size } = await req.json()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    if (action === 'confirm') await confirmShipmentSize(id, String(size ?? ''))
    else if (action === 'ship') await markShipmentShipped(id)
    else return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('shipments PATCH error:', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
