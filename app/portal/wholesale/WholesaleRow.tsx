'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { WholesaleAccount } from '@/types'

export function WholesaleRow({
  account,
  totals,
}: {
  account: WholesaleAccount
  totals: { lifetime: string; outstanding: string }
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function update(patch: Partial<Pick<WholesaleAccount, 'status' | 'tier' | 'payment_terms' | 'credit_limit'>>) {
    setLoading(true)
    await fetch(`/api/portal/wholesale/${account.id}`, {
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
        <div className="font-medium text-bark-600">{account.business_name}</div>
        {account.business_type && <div className="text-[10px] text-bark-400 mt-0.5">{account.business_type}</div>}
        {account.website && <a href={account.website} target="_blank" rel="noreferrer" className="text-[10px] text-gold-500 underline">{account.website}</a>}
      </td>
      <td className="px-4 py-4">
        <div className="text-xs text-bark-600">{account.contact_name}</div>
        <div className="text-[10px] text-bark-400">{account.contact_email}</div>
        {account.contact_phone && <div className="text-[10px] text-bark-400">{account.contact_phone}</div>}
      </td>
      <td className="px-4 py-4">
        <select disabled={loading} value={account.status} onChange={e => update({ status: e.target.value as WholesaleAccount['status'] })}
          className="px-2 py-1 border border-cream-300 rounded text-xs bg-white">
          <option value="pending">pending</option>
          <option value="approved">approved</option>
          <option value="rejected">rejected</option>
          <option value="suspended">suspended</option>
        </select>
      </td>
      <td className="px-4 py-4">
        <select disabled={loading} value={account.tier} onChange={e => update({ tier: e.target.value as WholesaleAccount['tier'] })}
          className="px-2 py-1 border border-cream-300 rounded text-xs bg-white">
          <option value="silver">silver</option>
          <option value="gold">gold</option>
          <option value="platinum">platinum</option>
        </select>
      </td>
      <td className="px-4 py-4">
        <select disabled={loading} value={account.payment_terms} onChange={e => update({ payment_terms: e.target.value as WholesaleAccount['payment_terms'] })}
          className="px-2 py-1 border border-cream-300 rounded text-xs bg-white">
          <option value="prepay">prepay</option>
          <option value="net30">NET-30</option>
        </select>
      </td>
      <td className="px-4 py-4 text-right text-bark-600">{totals.lifetime}</td>
      <td className="px-4 py-4 text-right text-bark-600">{totals.outstanding}</td>
    </tr>
  )
}
