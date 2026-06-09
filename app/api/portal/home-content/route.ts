import { NextRequest, NextResponse } from 'next/server'
import { getHomeContent, saveHomeContent, type HomeContent } from '@/lib/home-content'

export const dynamic = 'force-dynamic'

// Read the current (merged-over-defaults) homepage copy for the editor.
export async function GET() {
  try {
    const content = await getHomeContent()
    return NextResponse.json({ content })
  } catch (error) {
    console.error('home-content GET error:', error)
    return NextResponse.json({ error: 'Failed to load content' }, { status: 500 })
  }
}

// Save one or more blocks. Body: { perks?, why?, reviews? }
export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<HomeContent>
    await saveHomeContent(body)
    const content = await getHomeContent()
    return NextResponse.json({ ok: true, content })
  } catch (error) {
    console.error('home-content PUT error:', error)
    return NextResponse.json({ error: 'Failed to save content' }, { status: 500 })
  }
}
