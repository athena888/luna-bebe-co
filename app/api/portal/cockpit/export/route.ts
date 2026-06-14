import { NextResponse } from 'next/server'
import { getTasksSince } from '@/lib/cockpit'

export const dynamic = 'force-dynamic'

function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// Export the last 30 days of marketing tasks as a CSV report.
export async function GET() {
  try {
    const tasks = await getTasksSince(30)
    const header = ['date', 'title', 'channel', 'type', 'status', 'minutes', 'cost_usd', 'completed_at']
    const lines = [header.join(',')]
    for (const t of tasks) {
      lines.push([
        t.plan_date, t.title, t.channel ?? '', t.task_type ?? '', t.status,
        t.est_minutes ?? '', t.est_cost_cents != null ? (t.est_cost_cents / 100).toFixed(2) : '',
        t.completed_at ?? '',
      ].map(csvCell).join(','))
    }
    const csv = lines.join('\n')
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="petite-lavande-marketing-report.csv"',
      },
    })
  } catch (e) {
    console.error('cockpit export error:', e)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
