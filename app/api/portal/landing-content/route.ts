import { NextRequest, NextResponse } from 'next/server'
import { getAllGuides, saveLandingContent, type LandingOverride } from '@/lib/landing-content'

export const dynamic = 'force-dynamic'

// All guides, merged over defaults, for the Gift Guides editor.
export async function GET() {
  try {
    const guides = await getAllGuides()
    return NextResponse.json({ guides })
  } catch (error) {
    console.error('landing-content GET error:', error)
    return NextResponse.json({ error: 'Failed to load guides' }, { status: 500 })
  }
}

// Save one guide's overrides. Body: { slug, override }
export async function PUT(req: NextRequest) {
  try {
    const { slug, override } = (await req.json()) as { slug?: string; override?: LandingOverride }
    if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 })
    await saveLandingContent(slug, override ?? {})
    const guides = await getAllGuides()
    return NextResponse.json({ ok: true, guides })
  } catch (error) {
    console.error('landing-content PUT error:', error)
    return NextResponse.json({ error: 'Failed to save guide' }, { status: 500 })
  }
}
