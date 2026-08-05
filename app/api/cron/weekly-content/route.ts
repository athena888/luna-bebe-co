import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { textToBlocks } from '@/lib/journal-db'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Weekly content worker (Emily, 2026-07-29: "I don't want to manage — publish
// one a week yourself, I review"). Every run researches a fresh SEO angle the
// journal doesn't cover yet and publishes ONE post — alternating weeks lean
// gift-guide-style vs. parenting/editorial — with internal links into money
// pages. Auto-published; Emily reviews/edits/unpublishes any time in
// Portal → Pages & Content → Guides & Journal.

const MONEY_LINKS = [
  '/boxes/signature', '/boxes/la-collection', '/boxes/mama', '/boxes/mama-et-bebe',
  '/build', '/gift-cards', '/gifts/organic-baby-shower-gifts', '/gifts/new-mom-gift-ideas',
  '/gifts/organic-newborn-gift-box', '/corporate',
]

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return NextResponse.json({ error: 'no API key' }, { status: 500 })

  // Idempotence: at most one auto post per 6 days, whatever the cron does.
  const { data: recent } = await supabaseAdmin
    .from('journal_posts').select('slug, title, date')
    .order('date', { ascending: false }).limit(60)
  const sixDaysAgo = Date.now() - 6 * 24 * 60 * 60 * 1000
  if ((recent ?? []).some(r => r.slug.startsWith('auto-') && new Date(r.date as string).getTime() > sixDaysAgo)) {
    return NextResponse.json({ skipped: 'already published this week' })
  }
  const existingTitles = (recent ?? []).map(r => r.title).join('; ')
  const guideWeek = new Date().getUTCDate() % 2 === 0

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 3500,
      system: `You write for Petite Lavande's journal — a luxury organic baby & new-mama gift box brand (petitelavande.com). Voice: warm, honest, mother-first, never listicle-clickbait. SEO goal: rank for long-tail queries around baby gifting, postpartum care, organic baby products, baby showers. Hard rules: never the words "wax seal" (say "signature seal"); factual claims only (organic cotton, GOTS-certified makers, hand-packed in Seattle); include 2-3 natural internal links as markdown [text](path) chosen ONLY from: ${MONEY_LINKS.join(', ')}. Body format: plain text where "## " starts a heading, "- " starts a bullet, blank lines separate paragraphs. 600-900 words.`,
      messages: [{
        role: 'user',
        content: `Existing posts (do NOT overlap these topics): ${existingTitles || 'none'}.\n\nWrite ONE new ${guideWeek ? 'gift-guide-style piece (a specific gifting situation or recipient, with concrete picks)' : 'editorial piece (postpartum, new-parent life, or baby-care topic with search demand)'}.\n\nRespond ONLY as JSON: {"title":"...","slug":"kebab-case-slug","meta_description":"≤150 chars","excerpt":"1-2 sentences","body":"the full body text"}`,
      }],
    }),
  })
  if (!res.ok) return NextResponse.json({ error: `AI ${res.status}` }, { status: 502 })
  const data = await res.json() as { content?: Array<{ type: string; text?: string }> }
  const text = data.content?.find(c => c.type === 'text')?.text ?? ''
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) return NextResponse.json({ error: 'no JSON from model' }, { status: 502 })
  const post = JSON.parse(m[0]) as { title: string; slug: string; meta_description: string; excerpt: string; body: string }

  const slug = `auto-${post.slug.replace(/[^a-z0-9-]/g, '').slice(0, 70)}`
  const words = post.body.split(/\s+/).length
  const { error } = await supabaseAdmin.from('journal_posts').insert({
    slug,
    title: post.title,
    meta_description: post.meta_description.slice(0, 155),
    excerpt: post.excerpt,
    date: new Date().toISOString().slice(0, 10),
    read_mins: Math.max(2, Math.round(words / 220)),
    body: textToBlocks(post.body),
    related: [],
    published: true,
    sort_order: 0,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ published: slug, title: post.title, kind: guideWeek ? 'guide' : 'editorial' })
}
