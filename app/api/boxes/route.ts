import { NextRequest, NextResponse } from 'next/server'
import { getBoxes } from '@/lib/prebuilt-boxes-db'

export const dynamic = 'force-dynamic'

// Public catalog of prebuilt boxes (active only). ?featured=true for homepage.
export async function GET(req: NextRequest) {
  try {
    const featuredOnly = req.nextUrl.searchParams.get('featured') === 'true'
    const boxes = await getBoxes({ featuredOnly })
    return NextResponse.json({ boxes })
  } catch (error) {
    console.error('Boxes fetch error:', error)
    return NextResponse.json({ boxes: [] }, { status: 500 })
  }
}
