import { NextRequest, NextResponse } from 'next/server'
import { getFirstYearProduct, saveFirstYearProduct } from '@/lib/first-year-db'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ product: await getFirstYearProduct() })
}

export async function PUT(req: NextRequest) {
  try {
    const { name, description, priceCents } = await req.json()
    await saveFirstYearProduct({
      name, description,
      priceCents: Number.isFinite(Number(priceCents)) ? Math.round(Number(priceCents)) : undefined,
    })
    return NextResponse.json({ ok: true, product: await getFirstYearProduct() })
  } catch (e) {
    console.error('first-year PUT error:', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
