import { NextRequest, NextResponse } from 'next/server'
import { anthropic, LUNA_SYSTEM_PROMPT } from '@/lib/anthropic'
import { slugify } from '@/lib/journal-db'

// Draft the metadata for a journal post from its title + body: an on-brand
// excerpt (shown in the list), an SEO meta description, and a clean slug.
// Admin-guarded by /api/portal/* middleware.
//
// Body: { title: string, bodyText?: string }

export async function POST(req: NextRequest) {
  try {
    const { title, bodyText } = await req.json()
    if (!title?.trim() && !bodyText?.trim()) {
      return NextResponse.json({ error: 'Add a title or some body text first.' }, { status: 400 })
    }

    // Keep the prompt lean — the opening of the post is plenty of signal.
    const body = String(bodyText ?? '').trim().slice(0, 4000)

    const prompt =
      `This is a blog post for the Petite Lavande journal (luxury organic baby & new-mama gifts).\n\n` +
      `TITLE: ${title || '(untitled)'}\n\n` +
      `BODY:\n${body || '(no body yet — infer from the title)'}\n\n` +
      `Write three pieces of metadata for it:\n` +
      `1. "excerpt" — one warm, inviting sentence (15–25 words) shown under the title in the journal list. No quotes, no trailing ellipsis.\n` +
      `2. "metaDescription" — an SEO meta description, 140–160 characters, naturally including the post's main topic/keywords, compelling enough to earn a click.\n` +
      `3. "slug" — a short, lowercase, hyphenated URL slug (3–7 words, no stop-word padding).\n` +
      `Stay in the brand's calm, tender voice. Return ONLY a JSON object: {"excerpt": "...", "metaDescription": "...", "slug": "..."}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      system: LUNA_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = message.content[0]?.type === 'text' ? message.content[0].text.trim() : ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    let parsed: { excerpt?: string; metaDescription?: string; slug?: string } = {}
    if (jsonMatch) {
      try { parsed = JSON.parse(jsonMatch[0]) } catch { /* fall through */ }
    }

    const excerpt = (parsed.excerpt ?? '').toString().trim()
    const metaDescription = (parsed.metaDescription ?? '').toString().trim()
    // Always normalize the slug the same way the save route will.
    const slug = slugify((parsed.slug ?? '').toString() || title || '')

    if (!excerpt && !metaDescription && !slug) {
      return NextResponse.json({ error: 'Could not generate suggestions. Try again.' }, { status: 500 })
    }

    return NextResponse.json({ excerpt, metaDescription, slug })
  } catch (e) {
    console.error('journal ai-suggest error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
