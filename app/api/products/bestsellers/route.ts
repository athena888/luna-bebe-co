import { NextResponse } from 'next/server'
import { getBestsellerProducts } from '@/lib/bestsellers'

// The exact products shown in the Bestsellers carousel (shared logic).
export async function GET() {
  try {
    const { products } = await getBestsellerProducts(8)
    return NextResponse.json({ products })
  } catch (error) {
    console.error('Bestsellers fetch error:', error)
    return NextResponse.json({ error: 'Failed to load bestsellers' }, { status: 500 })
  }
}
