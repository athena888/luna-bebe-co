'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Affiliate } from '@/types'

export function AffiliateRow({
  affiliate,
  earnings,
}: {
  affiliate: Affiliate
  earnings: { pending: string; eligible: string; paid: string }
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function update(patch: Partial<Pick<Affiliate, 'status' | 'tier'>>) {
    setLoading(true)
    await fetch(`/api/portal/affiliates/${affiliate.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patch),
    })
    router.refresh()
    setLoading(false)
  }

  return (
    <tr className="border-t border-cream-200 align-top">
      <td className="px-4 py-4">
        <div className="font-medium text-bark-600">{affiliate.name}</div>
        <div className="text-xs text-bark-400">{affiliate.email}</div>
        {affiliate.social_handle && <div className="text-[10px] text-bark-400 mt-1">{affiliate.social_handle} · {affiliate.audience_size}</div>}
      </td>
      <td className="px-4 py-4 font-mono text-xs text-bark-600">{affiliate.code}</td>
      <td className="px-4 py-4">
        <select disabled={loading} value={affiliate.status} onChange={e => update({ status: e.target.value as Affiliate['status'] })}
          className="px-2 py-1 border border-cream-300 rounded text-xs bg-white">
          <option value="pending">pending</option>
          <option value="approved">approved</option>
          <option value="suspended">suspended</option>
        </select>
      </td>
      <td className="px-4 py-4">
        <select disabled={loading} value={affiliate.tier} onChange={e => update({ tier: e.target.value as Affiliate['tier'] })}
          className="px-2 py-1 border border-cream-300 rounded text-xs bg-white">
          <option value="standard">standard</option>
          <option value="vip">vip</option>
        </select>
      </td>
      <td className="px-4 py-4 text-right text-bark-600">{earnings.pending}</td>
      <td className="px-4 py-4 text-right text-bark-600">{earnings.eligible}</td>
      <td className="px-4 py-4 text-right text-bark-600">{earnings.paid}</td>
      <td className="px-4 py-4 text-right text-[10px] text-bark-400">
        {affiliate.stripe_onboarded ? 'Onboarded' : affiliate.stripe_account_id ? 'In progress' : '—'}
      </td>
    </tr>
  )
}
