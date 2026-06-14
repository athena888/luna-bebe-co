import { NextRequest, NextResponse } from 'next/server'
import { setTaskStatus, type TaskStatus } from '@/lib/cockpit'

export const dynamic = 'force-dynamic'

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
