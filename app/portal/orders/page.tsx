import { supabaseAdmin } from '@/lib/supabase'
import type { Order } from '@/types'
import { OrdersTable } from './OrdersTable'

// Live data on every load — never serve the build-time snapshot.
export const dynamic = 'force-dynamic'

// PAID ORDERS ONLY (Emily, 2026-08-26). Checkout inserts a `pending` row
// before the customer reaches Stripe — that is deliberate plumbing for the
// abandoned-cart flow, not an order, and Emily doesn't want it surfaced here
// at all (an earlier "N unpaid hidden" link was rejected too). Pending rows
// remain in the table for the cron; inspect them in Supabase if ever needed.
export default async function OrdersPage() {
  const { data } = await supabaseAdmin
    .from('orders')
    .select('*')
    .neq('status', 'pending')
    .order('created_at', { ascending: false })
  const orders = (data ?? []) as Order[]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-bark-600">Orders</h1>
        <p className="font-sans text-sm text-bark-400 mt-1">{orders.length} paid order{orders.length !== 1 ? 's' : ''}</p>
      </div>
      <OrdersTable orders={orders} />
    </div>
  )
}
