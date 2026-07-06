import { NextRequest, NextResponse } from 'next/server'
import { getBox, updateBox, deleteBox, type UpdateBoxInput } from '@/lib/prebuilt-boxes-db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const box = await getBox(slug)
  if (!box) return NextResponse.json({ error: 'Box not found' }, { status: 404 })
  return NextResponse.json({ box })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const body = (await req.json()) as UpdateBoxInput
  try {
    await updateBox(slug, body)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Update box error:', error)
    return NextResponse.json({ error: 'Failed to save box' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  try {
    await deleteBox(slug)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Delete box error:', error)
    return NextResponse.json({ error: 'Failed to delete box' }, { status: 500 })
  }
}
