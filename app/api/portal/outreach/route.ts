import { NextRequest, NextResponse } from 'next/server'
import {
  getNeedsAttention, getContacts, resolveFlag, getQuarantine, reviewQuarantine, updateContactFields,
  getSentLog, getCampaigns, createCampaign, cancelCampaign, getEnrolledTracks, getColdSendList,
} from '@/lib/outreach'
import { planOutreach } from '@/lib/outreach-send'
import { TEMPLATES } from '@/lib/outreach-templates'

// Admin-guarded by middleware (/api/portal/*). Powers the Outreach screen.
export async function GET(req: NextRequest) {
  const tab = req.nextUrl.searchParams.get('tab') ?? 'needs'
  try {
    if (tab === 'corporate')  return NextResponse.json({ contacts: await getContacts('corporate') })
    if (tab === 'all')        return NextResponse.json({ contacts: await getContacts('all') })
    if (tab === 'send')       return NextResponse.json({ contacts: await getColdSendList() })
    if (tab === 'quarantine') return NextResponse.json({ quarantine: await getQuarantine() })
    if (tab === 'campaigns') {
      const [campaigns, sent, tracks] = await Promise.all([getCampaigns(), getSentLog(150), getEnrolledTracks()])
      const templates = TEMPLATES.map(t => ({ key: t.key, track: t.track, subject: t.subject }))
      return NextResponse.json({ campaigns, sent, tracks, templates })
    }
    return NextResponse.json({ needs: await getNeedsAttention() })
  } catch (e) {
    console.error('outreach GET error:', e)
    return NextResponse.json({ needs: [], contacts: [], quarantine: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, flagId, id } = body
    if (action === 'resolve' && flagId) { await resolveFlag(flagId); return NextResponse.json({ ok: true }) }
    if (action === 'review' && id) { await reviewQuarantine(id); return NextResponse.json({ ok: true }) }
    if (action === 'update' && body.contactId) {
      await updateContactFields(body.contactId, {
        outreach_enrolled: body.outreach_enrolled,
        first_name: body.first_name,
        company: body.company,
      })
      return NextResponse.json({ ok: true })
    }
    if (action === 'preview') {
      // Same planner the cron uses — shows exactly what would send, no email sent.
      const cap = Math.max(0, Number(process.env.OUTREACH_DAILY_CAP) || 25)
      const plan = await planOutreach(cap, { trackFilter: body.track_filter, templateKey: body.template_key, sampleCode: true })
      return NextResponse.json({ ok: true, cap, ...plan })
    }
    if (action === 'schedule') {
      if (!body.scheduled_at || !body.template_key) {
        return NextResponse.json({ error: 'Pick a time and a template' }, { status: 400 })
      }
      const when = new Date(body.scheduled_at)
      if (isNaN(when.getTime())) return NextResponse.json({ error: 'Invalid time' }, { status: 400 })
      const campaign = await createCampaign({
        name: body.name,
        scheduled_at: when.toISOString(),
        track_filter: body.track_filter || null,
        template_key: body.template_key,
        per_run_cap: body.per_run_cap ?? null,
      })
      return NextResponse.json({ ok: true, campaign })
    }
    if (action === 'cancel' && body.id) { await cancelCampaign(body.id); return NextResponse.json({ ok: true }) }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    console.error('outreach POST error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
