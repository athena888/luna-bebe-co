'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export function ReviewActions({ reviewId, approved }: { reviewId: string; approved: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [, startTransition] = useTransition()

  async function setApproved(next: boolean) {
    setBusy(true)
    try {
      await fetch(`/api/portal/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: next }),
      })
      startTransition(() => { router.refresh() })
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!confirm('Delete this review permanently?')) return
    setBusy(true)
    try {
      await fetch(`/api/portal/reviews/${reviewId}`, { method: 'DELETE' })
      startTransition(() => { router.refresh() })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="shrink-0 flex items-center gap-2">
      {approved ? (
        <button
          onClick={() => setApproved(false)}
          disabled={busy}
          className="px-3 py-1.5 rounded-xl border border-cream-300 bg-cream-100 font-sans text-xs text-bark-500 hover:text-bark-600 hover:border-bark-400 transition-colors disabled:opacity-60"
        >
          Unpublish
        </button>
      ) : (
        <button
          onClick={() => setApproved(true)}
          disabled={busy}
          className="px-3 py-1.5 rounded-xl bg-sage-500 font-sans text-xs font-semibold text-cream-50 hover:bg-sage-400 transition-colors disabled:opacity-60"
        >
          Approve
        </button>
      )}
      <button
        onClick={remove}
        disabled={busy}
        className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 font-sans text-xs text-rose-600 hover:bg-rose-100 transition-colors disabled:opacity-60"
      >
        Delete
      </button>
    </div>
  )
}
