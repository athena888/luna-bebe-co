import { anthropic } from '../anthropic'
import { supabaseAdmin } from '../supabase'
import { bumpDailyStats } from './config'
import { getPressConfig } from './press-prospector'
import { getCurrentPressKit } from '../press-kit'
import { renderPipelineTemplate, getPipelineTemplates } from './drafter'

// Press drafting. Two hard rules enforced in CODE, not prompts:
//  1. No guide, no pitch — a prospect without a captured guide URL + title
//     parks as 'needs_human_personalization' (Emily finishes or discards it in
//     the review UI). The AI-written {{guide_reference}} sentence must contain
//     the guide's actual title, or it parks too.
//  2. No press kit, no pitch — until an image is tagged is_press, prospects
//     park as 'awaiting_press_kit' (auto-released once the kit exists).

const MODEL = 'claude-sonnet-4-6'

/** Template for a press prospect: freelancers → D; T3 → C/C2 by the founder-
 *  story flag; T4 → E; T1/2 → A in the holiday-guide window (Jul–Sep) else B. */
export function selectPressTemplateKey(
  tier: number | null, freelancer: boolean, founderStory: boolean, month: number, // month 0-11
): string {
  if (freelancer) return 'press-D'
  if (tier === 3) return founderStory ? 'press-C' : 'press-C2'
  if (tier === 4) return 'press-E'
  return month >= 6 && month <= 8 ? 'press-A' : 'press-B'
}

export function founderStoryEnabled(configValue: boolean): boolean {
  const env = (process.env.FOUNDER_STORY_ENABLED ?? '').trim().toLowerCase()
  if (env === 'true') return true
  if (env === 'false') return false
  return configValue
}

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/** One sentence referencing the editor's ACTUAL guide. Must contain the guide
 *  title (checked in code) — anything else returns null and the prospect parks. */
export async function draftGuideReference(p: { guide_title: string; guide_url: string | null; outlet: string | null }): Promise<string | null> {
  try {
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 200,
      system: `You write the single opening sentence of a short, warm press pitch to a gift-guide writer. You are given the exact title (and URL) of a guide they actually wrote.

Rules:
- ONE sentence, under 25 words, plain text, no greeting, no exclamation marks.
- It MUST quote the guide's exact title verbatim, in double quotes.
- Reference only what the title itself says — never invent details, opinions about its quality, or anything not visible in the title.
- If you cannot write it under these rules, reply with exactly: GENERIC`,
      messages: [{ role: 'user', content: `Outlet: ${p.outlet ?? ''}\nGuide title: ${p.guide_title}\nGuide URL: ${p.guide_url ?? ''}` }],
    })
    const text = res.content.filter(b => b.type === 'text').map(b => (b as { text: string }).text).join(' ').trim()
    if (!text || /^GENERIC$/i.test(text)) return null
    if (text.split(/\s+/).length > 30) return null
    // Hard check: the sentence must actually contain the guide title.
    if (!squash(text).includes(squash(p.guide_title))) return null
    return text.replace(/[\r\n]+/g, ' ')
  } catch (e) {
    console.error('guide reference draft failed:', e)
    return null
  }
}

export interface PressDrafterStats {
  pressDrafted: number
  parkedPersonalization: number
  parkedAwaitingKit: number
  releasedFromAwaitingKit: number
}

interface PressProspectRow {
  id: string; outlet: string | null; tier: number | null; person_name: string | null
  guide_url: string | null; guide_title: string | null; freelancer: boolean
  email: string | null; email_grade: string | null
}

export async function runPressDrafter(opts: { dry?: boolean; deadline: number }): Promise<PressDrafterStats> {
  const stats: PressDrafterStats = { pressDrafted: 0, parkedPersonalization: 0, parkedAwaitingKit: 0, releasedFromAwaitingKit: 0 }
  const dry = Boolean(opts.dry)

  const cfg = await getPressConfig()
  if (!cfg) return stats   // press not migrated/seeded yet
  const templates = await getPipelineTemplates()
  const founder = founderStoryEnabled(cfg.founder_story_enabled)
  const kit = await getCurrentPressKit()

  // Kit exists → release anything that was parked waiting for it.
  if (kit && !dry) {
    const { data } = await supabaseAdmin.from('prospects')
      .update({ status: 'discovered', updated_at: new Date().toISOString() })
      .eq('channel', 'press').eq('status', 'awaiting_press_kit').select('id')
    stats.releasedFromAwaitingKit = (data ?? []).length
  }

  const { data } = await supabaseAdmin.from('prospects')
    .select('id, outlet, tier, person_name, guide_url, guide_title, freelancer, email, email_grade')
    .eq('channel', 'press').eq('status', 'discovered').in('email_grade', ['A', 'B'])
    .order('freelancer', { ascending: false })    // freelancers place across outlets — draft them first
    .order('created_at', { ascending: true })
    .limit(20)
  const prospects = (data ?? []) as PressProspectRow[]
  if (!prospects.length) return stats

  // No kit → nothing may point at an empty /press page.
  if (!kit) {
    if (!dry) {
      await supabaseAdmin.from('prospects')
        .update({ status: 'awaiting_press_kit', updated_at: new Date().toISOString() })
        .in('id', prospects.map(p => p.id))
    }
    stats.parkedAwaitingKit = prospects.length
    return stats
  }

  const month = new Date().getMonth()
  for (const p of prospects) {
    if (Date.now() > opts.deadline - 15_000) break

    const park = async (status: string) => {
      if (!dry) await supabaseAdmin.from('prospects').update({ status, updated_at: new Date().toISOString() }).eq('id', p.id)
    }

    // Hard rule 1: no captured guide → Emily personalizes by hand or discards.
    if (!p.guide_url || !p.guide_title) { await park('needs_human_personalization'); stats.parkedPersonalization++; continue }

    const key = selectPressTemplateKey(p.tier, p.freelancer, founder, month)
    const tpl = templates.find(t => t.key === key) ?? null
    if (!tpl) { console.error('press template missing:', key); continue }

    const guideReference = await draftGuideReference({ guide_title: p.guide_title, guide_url: p.guide_url, outlet: p.outlet })
    if (!guideReference) { await park('needs_human_personalization'); stats.parkedPersonalization++; continue }

    const firstName = (p.person_name ?? '').trim().split(/\s+/)[0] ?? ''
    const rendered = renderPipelineTemplate(tpl, {
      first_name: firstName, outlet: p.outlet ?? '', guide_reference: guideReference, press_kit_url: kit.url,
    })
    if (!rendered.ok) { await park('needs_human_personalization'); stats.parkedPersonalization++; continue }

    if (!dry) {
      await supabaseAdmin.from('email_drafts').insert({
        prospect_id: p.id, template_key: key, subject: rendered.subject, body: rendered.body,
        is_followup: false, draft_kind: 'cold', status: 'pending_review',
      })
      await supabaseAdmin.from('prospects').update({ status: 'drafted', updated_at: new Date().toISOString() }).eq('id', p.id)
    }
    stats.pressDrafted++
  }

  if (!dry && (stats.pressDrafted || stats.parkedPersonalization || stats.parkedAwaitingKit)) {
    await bumpDailyStats({
      press_drafted: stats.pressDrafted,
      press_needs_personalization: stats.parkedPersonalization,
      press_awaiting_kit: stats.parkedAwaitingKit,
    })
  }
  return stats
}
