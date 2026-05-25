import { supabaseAdmin } from '@/lib/supabase'
import { WholesaleRow } from './WholesaleRow'

function formatPrice(cents: number) { return `$${(cents / 100).toFixed(2)}` }

async function load() {
  const [accountsRes, ordersRes] = await Promise.all([
    supabaseAdmin.from('wholesale_accounts').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('wholesale_orders').select('account_id, total, payment_status'),
  ])

  const totalsByAcc = new Map<string, { lifetime: number; outstanding: number }>()
  for (const o of ordersRes.data ?? []) {
    const t = totalsByAcc.get(o.account_id) ?? { lifetime: 0, outstanding: 0 }
    t.lifetime += o.total
    if (o.payment_status === 'pending' || o.payment_status === 'overdue') t.outstanding += o.total
    totalsByAcc.set(o.account_id, t)
  }

  return { accounts: accountsRes.data ?? [], totalsByAcc }
}

export default async function WholesalePortalPage() {
  const { accounts, totalsByAcc } = await load()

  return (
    <div className="p-8">
      <h1 className="font-serif text-3xl text-bark-600 mb-1">Wholesale</h1>
      <p className="font-sans text-sm text-bark-400 mb-8">Review applications, assign tiers, manage NET-30.</p>

      <div className="bg-cream-50 border border-cream-200 rounded-2xl overflow-hidden">
        <table className="w-full font-sans text-sm">
          <thead className="bg-cream-100 text-bark-400 text-[10px] uppercase tracking-[0.2em]">
            <tr>
              <th className="text-left px-4 py-3">Business</th>
              <th className="text-left px-4 py-3">Contact</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Tier</th>
              <th className="text-left px-4 py-3">Terms</th>
              <th className="text-right px-4 py-3">Lifetime</th>
              <th className="text-right px-4 py-3">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-bark-400">No wholesale accounts yet.</td></tr>
            ) : accounts.map(a => {
              const t = totalsByAcc.get(a.id) ?? { lifetime: 0, outstanding: 0 }
              return (
                <WholesaleRow key={a.id} account={a} totals={{
                  lifetime: formatPrice(t.lifetime),
                  outstanding: formatPrice(t.outstanding),
                }} />
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
