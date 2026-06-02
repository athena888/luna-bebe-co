import { NextRequest, NextResponse } from 'next/server'
import { getCollections } from '@/lib/collections-db'

export async function GET(_req: NextRequest) {
  try {
    const collections = await getCollections()
    return NextResponse.json({ collections })
  } catch (error) {
    console.error('Get collections error:', error)
    return NextResponse.json({ error: 'Failed to fetch collections' }, { status: 500 })
  }
}
