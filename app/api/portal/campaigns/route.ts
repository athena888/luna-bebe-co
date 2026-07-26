import { NextRequest, NextResponse } from 'next/server'
import { campaignRecipients, sendCampaign, listCampaigns, type CampaignInput } from '@/lib/campaigns'
import { sendCampaignEmail } from '@/lib/resend'
import { supabaseAdmin } from '@/lib/supabase'
import { CONTACT_EMAIL } from '@/lib/site-config'

export const dynamic = 'force-dynamic'

// Portal → Campaigns (Build 8). Cookie-authed via middleware like every
// /api/portal route. GET = segment counts + past campaigns; POST = send.
// mode 'test' emails only Emily; mode 'count' previews the audience size.

export async function GET() {
  try {
    const { data } = await supabaseAdmin
      .from('marketing_contacts').select('segment').eq('marketing_opt_in', true)
    const counts: Record<string, number> = {}
    for (const r of data ?? []) counts[r.segment] = (counts[r.segment] ?? 0) + 1
    return NextResponse.json({ counts, campaigns: await listCampaigns() })
  } catch (e) {
    console.error('campaigns GET error:', e)
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as CampaignInput & { mode?: 'test' | 'count' | 'send' }
    const mode = body.mode ?? 'send'

    if (mode === 'count') {
      const recipients = await campaignRecipients(body.segments ?? [])
      return NextResponse.json({ recipients: recipients.length })
    }

    if (mode === 'test') {
      const to = process.env.ADMIN_EMAIL || CONTACT_EMAIL
      await sendCampaignEmail({
        customerEmail: to,
        subject: `[TEST] ${body.subject}`,
        heading: body.heading,
        paragraphs: (body.paragraphs ?? []).filter(p => p.trim()),
        ctaLabel: body.ctaLabel,
        ctaHref: body.ctaHref,
        campaign: `test-${body.slug || 'draft'}`,
      })
      return NextResponse.json({ ok: true, testTo: to })
    }

    const result = await sendCampaign(body)
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json(result)
  } catch (e) {
    console.error('campaigns POST error:', e)
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
  }
}
