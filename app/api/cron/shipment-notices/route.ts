import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { getShipmentsDueForNotice, markNoticeSent } from '@/lib/first-year-db'
import { sendShipmentNoticeEmail } from '@/lib/resend'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// Nightly: for First Year shipments II/III due within 14 days with no notice yet,
// send the advance "confirm your size" email and stamp notice_sent_at (so it
// never sends twice). Guarded by CRON_SECRET.
export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com'
  const due = await getShipmentsDueForNotice()
  let sent = 0
  for (const s of due) {
    const to = s.recipient_email || s.order?.customer_email
    if (!to) continue
    const token = randomUUID().replace(/-/g, '')
    try {
      await sendShipmentNoticeEmail({
        to,
        label: s.label ?? 'next',
        recipientName: s.order?.recipient_name,
        confirmUrl: `${base}/first-year/confirm/${token}`,
      })
      await markNoticeSent(s.id, token)
      sent++
    } catch (e) {
      console.error('shipment notice failed for', s.id, e)
    }
  }
  return NextResponse.json({ ok: true, due: due.length, sent })
}
