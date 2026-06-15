import { NextRequest, NextResponse } from 'next/server'
import { createDiscount, listDiscounts, setDiscountActive, type DiscountInput } from '@/lib/stripe-discounts'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return NextResponse.json({ codes: await listDiscounts() })
  } catch (e) {
    console.error('discounts GET error:', e)
    return NextResponse.json({ codes: [], error: e instanceof Error ? e.message : 'Failed' })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as DiscountInput
    if (!body.code?.trim()) return NextResponse.json({ error: 'Enter a code' }, { status: 400 })
    if (!(Number(body.value) > 0)) return NextResponse.json({ error: 'Enter a discount value' }, { status: 400 })
    const result = await createDiscount(body)
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    console.error('discounts POST error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to create code' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, active } = (await req.json()) as { id: string; active: boolean }
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    await setDiscountActive(id, Boolean(active))
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('discounts PATCH error:', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
