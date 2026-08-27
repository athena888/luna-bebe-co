import { supabaseAdmin } from '@/lib/supabase'
import type { Order } from '@/types'
import Link from 'next/link'
import { OrdersTable } from './OrdersTable'

// Live data on every load — never serve the build-time snapshot.
export const dynamic = 'force-dynamic'

// Checkout inserts a `pending` order BEFORE the customer reaches Stripe (it
// feeds the abandoned-cart flow); the webhook advances it on payment. Listing
// those unpaid rows alongside real orders read as "an order appeared without
// payment" (Emily, 2026-08-26) — so the default view shows paid orders only,
// with the pending count noted and ?all=1 to inspect them.
export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  const { all } = await searchParams
  const showAll = all === '1'
  const { data } = await supabaseAdmin
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
  const orders = (data ?? []) as Order[]
  const pending = orders.filter(o => o.status === 'pending')
  const real = orders.filter(o => o.status !== 'pending')
  const shown = showAll ? orders : real

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-bark-600">Orders</h1>
        <p className="font-sans text-sm text-bark-400 mt-1">
          {real.length} paid order{real.length !== 1 ? 's' : ''}
          {pending.length > 0 && (
            <>
              {' · '}
              {showAll ? (
                <Link href="/portal/orders" className="underline underline-offset-2 hover:text-bark-600">hide {pending.length} unpaid checkout{pending.length !== 1 ? 's' : ''}</Link>
              ) : (
                <Link href="/portal/orders?all=1" className="underline underline-offset-2 hover:text-bark-600">{pending.length} unpaid checkout{pending.length !== 1 ? 's' : ''} hidden</Link>
              )}
            </>
          )}
        </p>
      </div>
      <OrdersTable orders={shown} />
    </div>
  )
}
