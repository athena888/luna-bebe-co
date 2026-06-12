import { NextRequest, NextResponse } from 'next/server'
import { getScrims, saveScrims } from '@/lib/scrims'

export async function GET() {
  return NextResponse.json({ scrims: await getScrims() })
}

export async function PUT(req: NextRequest) {
  const { slotKey, hex, opacity } = await req.json() as { slotKey: string; hex: string; opacity: number }
  if (!slotKey || !hex || opacity == null) {
    return NextResponse.json({ error: 'slotKey, hex, and opacity required' }, { status: 400 })
  }
  const scrims = await getScrims()
  scrims[slotKey] = { hex, opacity }
  await saveScrims(scrims)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const slotKey = req.nextUrl.searchParams.get('slotKey')
  if (!slotKey) return NextResponse.json({ error: 'slotKey required' }, { status: 400 })
  const scrims = await getScrims()
  delete scrims[slotKey]
  await saveScrims(scrims)
  return NextResponse.json({ ok: true })
}
