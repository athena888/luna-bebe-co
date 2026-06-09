import { NextRequest, NextResponse } from 'next/server'
import { getStoryContent, saveStoryContent, type StoryContent } from '@/lib/story-content'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return NextResponse.json({ content: await getStoryContent() })
  } catch (e) {
    console.error('story-content GET error:', e)
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as StoryContent
    await saveStoryContent(body)
    return NextResponse.json({ ok: true, content: await getStoryContent() })
  } catch (e) {
    console.error('story-content PUT error:', e)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
