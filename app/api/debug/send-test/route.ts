import { NextRequest, NextResponse } from 'next/server'
import { getOutreachTemplates } from '@/lib/outreach-templates-db'
import { renderTemplate, withFooter, templateForTrack } from '@/lib/outreach-templates'
import { mintOutreachCode } from '@/lib/outreach-discount'
import { sendEmail, gmailSender, gmailConfigured } from '@/lib/gmail'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// TEMPORARY — lets the developer fire one real test send to verify the production
// Gmail path end-to-end. Guarded by a hardcoded one-off key. Deleted right after.
const KEY = 'dbg-9f3a2c7e1b8d4a6f0e5'

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get('key') !== KEY) return NextResponse.json({ error: 'nope' }, { status: 401 })
  const to = (req.nextUrl.searchParams.get('to') || '').trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return NextResponse.json({ error: 'bad to' }, { status: 400 })
  if (!gmailConfigured()) return NextResponse.json({ ok: false, reason: 'GOOGLE_SA_KEY not set' })
  try {
    const templates = await getOutreachTemplates()
    const tpl = templateForTrack('A', templates)
    const r = renderTemplate(tpl, { first_name: 'Emily', company: 'Petite Lavande' })
    if (!r.ok) return NextResponse.json({ ok: false, reason: 'render', missing: r.missing })
    // Surface the real Stripe error (don't swallow it).
    let code: string
    try { code = await mintOutreachCode() }
    catch (e) { return NextResponse.json({ ok: false, reason: 'stripe', detail: e instanceof Error ? e.message : String(e) }) }
    const text = withFooter(r.result.body).replace(/\{\{\s*code\s*\}\}/g, code)
    const res = await sendEmail({ to, subject: `[TEST] ${r.result.subject}`, text, replyTo: gmailSender() })
    return NextResponse.json({ ok: true, sender: gmailSender(), to, messageId: res.messageId })
  } catch (e) {
    return NextResponse.json({ ok: false, reason: 'send error', detail: e instanceof Error ? e.message : String(e) })
  }
}
