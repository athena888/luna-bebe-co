import { supabaseAdmin } from './supabase.ts'
import { JOURNAL_POSTS, getJournalPost as getHardcoded, type JournalPost, type Block } from './journal.ts'

// DB-backed journal. Posts created in the portal live in `journal_posts`; the
// in-code JOURNAL_POSTS remain as built-in starters. Reads merge the two (DB
// wins by slug) and fail soft to the hardcoded set if the table isn't there.

export interface JournalRow {
  id: string
  slug: string
  title: string
  meta_description: string
  excerpt: string
  date: string
  read_mins: number
  body: Block[]
  related: { label: string; href: string }[]
  published: boolean
  sort_order: number
}

function fromRow(r: JournalRow): JournalPost {
  return {
    slug: r.slug,
    title: r.title,
    metaDescription: r.meta_description ?? '',
    excerpt: r.excerpt ?? '',
    date: r.date,
    readMins: r.read_mins ?? 3,
    body: Array.isArray(r.body) ? r.body : [],
    related: Array.isArray(r.related) ? r.related : [],
  }
}

// ── Body ⇄ plain text (the portal editor uses a simple "## heading / - bullet /
// blank-line paragraph" syntax instead of raw JSON blocks) ──────────────────
export function blocksToText(body: Block[]): string {
  return (body ?? []).map(b => {
    if ('h2' in b) return `## ${b.h2}`
    if ('ul' in b) return b.ul.map(li => `- ${li}`).join('\n')
    return b.p
  }).join('\n\n')
}

export function textToBlocks(text: string): Block[] {
  const blocks: Block[] = []
  let para: string[] = []
  let list: string[] = []
  const flushPara = () => { if (para.length) { blocks.push({ p: para.join(' ').trim() }); para = [] } }
  const flushList = () => { if (list.length) { blocks.push({ ul: list.slice() }); list = [] } }
  for (const raw of (text ?? '').replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim()
    if (!line) { flushPara(); flushList(); continue }
    if (line.startsWith('## ')) { flushPara(); flushList(); blocks.push({ h2: line.slice(3).trim() }); continue }
    if (line.startsWith('- ')) { flushPara(); list.push(line.slice(2).trim()); continue }
    flushList(); para.push(line)
  }
  flushPara(); flushList()
  return blocks
}

export function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// ── Public reads (merge DB published posts over the built-in starters) ───────
export async function getJournalPosts(): Promise<JournalPost[]> {
  let dbPosts: JournalPost[] = []
  try {
    const { data } = await supabaseAdmin.from('journal_posts').select('*').eq('published', true)
    dbPosts = (data ?? []).map(r => fromRow(r as JournalRow))
  } catch { /* table missing — fall back to hardcoded only */ }
  const dbSlugs = new Set(dbPosts.map(p => p.slug))
  const merged = [...dbPosts, ...JOURNAL_POSTS.filter(p => !dbSlugs.has(p.slug))]
  return merged.sort((a, b) => (a.date < b.date ? 1 : -1))
}

export async function getJournalPostBySlug(slug: string): Promise<JournalPost | null> {
  try {
    const { data } = await supabaseAdmin.from('journal_posts').select('*').eq('slug', slug).eq('published', true).maybeSingle()
    if (data) return fromRow(data as JournalRow)
  } catch { /* fall through */ }
  return getHardcoded(slug) ?? null
}
