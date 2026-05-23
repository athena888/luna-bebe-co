'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { IssueStatus } from '@/types'

const STATUS_OPTIONS: { value: IssueStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
]

export function IssueActions({ issueId, currentStatus }: { issueId: string; currentStatus: IssueStatus }) {
  const router = useRouter()
  const [status, setStatus] = useState<IssueStatus>(currentStatus)
  const [isPending, startTransition] = useTransition()

  async function handleStatusChange(newStatus: IssueStatus) {
    setStatus(newStatus)
    try {
      await fetch(`/api/issues/${issueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      startTransition(() => { router.refresh() })
    } catch {
      setStatus(currentStatus)
    }
  }

  return (
    <div className="shrink-0">
      <select
        value={status}
        onChange={(e) => handleStatusChange(e.target.value as IssueStatus)}
        disabled={isPending}
        className="px-3 py-1.5 rounded-xl border border-cream-300 bg-cream-100 font-sans text-xs text-bark-600 focus:outline-none focus:border-gold-400 transition-colors disabled:opacity-60 cursor-pointer"
      >
        {STATUS_OPTIONS.map(({ value, label }) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
    </div>
  )
}
