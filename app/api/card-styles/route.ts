import { NextResponse } from 'next/server'
import { getCardStyles } from '@/lib/card-styles'

// Public: active card styles for the customer card picker.
export async function GET() {
  const styles = await getCardStyles(true)
  return NextResponse.json({ styles }, { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' } })
}
