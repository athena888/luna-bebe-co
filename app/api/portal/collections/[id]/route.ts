import { NextRequest, NextResponse } from 'next/server'
import { getCollection, updateCollection } from '@/lib/collections-db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const collection = await getCollection(id)
    if (!collection) return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    return NextResponse.json({ collection })
  } catch (error) {
    console.error('Get collection error:', error)
    return NextResponse.json({ error: 'Failed to fetch collection' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  try {
    await updateCollection(id, body)
    const updated = await getCollection(id)
    return NextResponse.json({ collection: updated })
  } catch (error) {
    console.error('Update collection error:', error)
    return NextResponse.json({ error: 'Failed to update collection' }, { status: 500 })
  }
}
