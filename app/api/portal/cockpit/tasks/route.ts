import { NextRequest, NextResponse } from 'next/server'
import { setTaskStatus, createTask, todayPT, type TaskStatus } from '@/lib/cockpit'

export const dynamic = 'force-dynamic'

// Add a task to today's checklist (from the AI add-on suggester).
export async function POST(req: NextRequest) {
  try {
    const t = await req.json()
    if (!t?.title) return NextResponse.json({ error: 'title required' }, { status: 400 })
    const task = await createTask(todayPT(), {
      title: t.title, channel: t.channel, task_type: t.task_type, why: t.why,
      est_minutes: t.est_minutes,
      est_cost_cents: Number.isFinite(Number(t.est_cost)) ? Math.round(Number(t.est_cost) * 100) : t.est_cost_cents,
    })
    return NextResponse.json({ ok: true, task })
  } catch (e) {
    console.error('cockpit tasks POST error:', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

// Toggle a task's status. Body: { id, status: 'open'|'done'|'skipped' }
export async function PATCH(req: NextRequest) {
  try {
    const { id, status } = (await req.json()) as { id?: string; status?: TaskStatus }
    if (!id || !['open', 'done', 'skipped'].includes(String(status))) {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 })
    }
    await setTaskStatus(id, status as TaskStatus)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('cockpit tasks PATCH error:', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
