import { supabaseAdmin } from '@/lib/supabase'
import type { Order } from '@/types'
import { OrdersTable } from './OrdersTable'

export default async function OrdersPage() {
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-bark-600">Orders</h1>
        <p className="font-sans text-sm text-bark-400 mt-1">{(orders ?? []).length} total orders</p>
      </div>
      <OrdersTable orders={(orders ?? []) as Order[]} />
    </div>
  )
}
