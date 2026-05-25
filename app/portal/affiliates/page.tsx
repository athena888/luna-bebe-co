import { supabaseAdmin } from '@/lib/supabase'
import { AffiliateRow } from './AffiliateRow'

function formatPrice(cents: number) { return `$${(cents / 100).toFixed(2)}` }

async function load() {
  const [affRes, convRes] = await Promise.all([
    supabaseAdmin.from('affiliates').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('affiliate_conversions').select('affiliate_id, commission_amount, status'),
  ])

  const earningsByAff = new Map<string, { pending: number; paid: number; eligible: number }>()
  for (const c of convRes.data ?? []) {
    const e = earningsByAff.get(c.affiliate_id) ?? { pending: 0, paid: 0, eligible: 0 }
    if (c.status === 'pending') e.pending += c.commission_amount
    if (c.status === 'paid') e.paid += c.commission_amount
    if (c.status === 'eligible') e.eligible += c.commission_amount
    earningsByAff.set(c.affiliate_id, e)
  }

  return { affiliates: affRes.data ?? [], earningsByAff }
}

export default async function AffiliatesPortalPage() {
  const { affiliates, earningsByAff } = await load()

  return (
    <div className="p-8">
      <h1 className="font-serif text-3xl text-bark-600 mb-1">Affiliates</h1>
      <p className="font-sans text-sm text-bark-400 mb-8">Review applications, manage tiers, view earnings.</p>

      <div className="bg-cream-50 border border-cream-200 rounded-2xl overflow-hidden">
        <table className="w-full font-sans text-sm">
          <thead className="bg-cream-100 text-bark-400 text-[10px] uppercase tracking-[0.2em]">
            <tr>
              <th className="text-left px-4 py-3">Affiliate</th>
              <th className="text-left px-4 py-3">Code</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Tier</th>
              <th className="text-right px-4 py-3">Pending</th>
              <th className="text-right px-4 py-3">Eligible</th>
              <th className="text-right px-4 py-3">Paid</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {affiliates.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-bark-400">No affiliates yet.</td></tr>
            ) : affiliates.map(a => {
              const earnings = earningsByAff.get(a.id) ?? { pending: 0, eligible: 0, paid: 0 }
              return (
                <AffiliateRow key={a.id} affiliate={a} earnings={{
                  pending: formatPrice(earnings.pending),
                  eligible: formatPrice(earnings.eligible),
                  paid: formatPrice(earnings.paid),
                }} />
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
